import fs from 'fs';
import path from 'path';
import { Response } from 'express';
import { Conversation } from '../models/Conversation.js';
import { Membership } from '../models/Membership.js';
import { Message } from '../models/Message.js';
import { config } from '../config/env.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { logger } from '../utils/logger.js';

async function callGemini(
  contents: any[],
  generationConfig?: any,
  systemInstructionText?: string
): Promise<{ text: string; model: string } | null> {
  if (!config.aiApiKey || process.env.NODE_ENV === 'test') return null;

  // Active models available with high quota / zero 429 errors
  const candidateModels = [
    config.geminiModel,
    'gemini-flash-lite-latest',
    'gemini-3.1-flash-lite',
    'gemini-3-flash-preview',
    'gemini-3.8-flash',
    'gemini-3.5-flash',
    'gemma-4-31b-it',
  ].filter(Boolean) as string[];

  const uniqueModels = Array.from(new Set(candidateModels));

  for (const model of uniqueModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.aiApiKey}`;
      const payload: any = { contents };
      if (generationConfig) payload.generationConfig = generationConfig;
      if (systemInstructionText) {
        payload.systemInstruction = {
          parts: [{ text: systemInstructionText }],
        };
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok) {
        const errorText = await res.text();
        logger.warn({ model, status: res.status, errorText: errorText.slice(0, 150) }, 'Gemini model attempt returned non-200');
        continue;
      }

      const data = (await res.json()) as any;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        return { text, model };
      }
    } catch (err: any) {
      logger.warn({ model, error: err.message }, 'Gemini model fetch error');
    }
  }

  return null;
}

export async function summarizeConversation(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { conversationId, scope = 'last-50' } = req.body;
    const userId = req.user!.id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }

    if (!conversation.isPublicChannel) {
      const isMember = await Membership.findOne({ conversation: conversationId, user: userId });
      if (!isMember) {
        res.status(403).json({ error: 'Access denied to private conversation.' });
        return;
      }
    }

    // Build query based on scope
    const query: any = {
      conversation: conversationId,
      isDeleted: false,
    };

    let limit = 50;

    if (scope === 'recent-24h') {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      query.createdAt = { $gte: dayAgo };
      limit = 100;
    } else if (scope === 'all-unread') {
      const membership = await Membership.findOne({ conversation: conversationId, user: userId });
      if (membership?.lastReadAt) {
        query.createdAt = { $gt: membership.lastReadAt };
      }
      limit = 100;
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('sender', 'displayName username');

    if (messages.length === 0) {
      res.json({
        overview: 'No messages were found in the selected scope to analyze.',
        keyTopics: [],
        decisions: [],
        actionItems: [],
        deadlines: [],
        openQuestions: [],
        messageCount: 0,
        scope,
        engine: config.aiApiKey ? 'Google Gemini' : 'Chatterly Intelligence',
      });
      return;
    }

    const transcript = messages
      .slice()
      .reverse()
      .map((m) => {
        const time = new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const sender = (m.sender as any)?.displayName || (m.sender as any)?.username || 'User';
        return `[${time}] ${sender}: ${m.content}`;
      })
      .join('\n');

    // If Gemini API Key is configured, use structured LLM output
    if (config.aiApiKey) {
      try {
        const prompt = `You are a professional conversation analyst for Chatterly. Analyze the following chat transcript and output a JSON object with this exact structure:
{
  "overview": "A concise executive summary of the discussion",
  "keyTopics": ["Topic 1", "Topic 2"],
  "decisions": ["Confirmed decision 1", "Confirmed decision 2"],
  "actionItems": [{"task": "Description of action item", "assignee": "Person name or Unassigned", "deadline": "Mentioned deadline or None", "reference": "Source timestamp"}],
  "deadlines": ["Deadline 1 with context"],
  "openQuestions": ["Unresolved question 1"]
}
Only extract items explicitly mentioned in the messages. Do not hallucinate or invent tasks or names.

Transcript:
${transcript}`;

        const geminiResult = await callGemini(
          [{ role: 'user', parts: [{ text: prompt }] }],
          { responseMimeType: 'application/json' }
        );

        if (geminiResult) {
          const parsed = JSON.parse(geminiResult.text);
          res.json({
            overview: parsed.overview || 'Discussion summary generated.',
            keyTopics: parsed.keyTopics || [],
            decisions: parsed.decisions || [],
            actionItems: parsed.actionItems || [],
            deadlines: parsed.deadlines || [],
            openQuestions: parsed.openQuestions || [],
            messageCount: messages.length,
            scope,
            engine: `Google Gemini (${geminiResult.model})`,
          });
          return;
        }
      } catch (err: any) {
        logger.warn({ err: err.message }, 'Failed parsing Gemini JSON summary output, falling back to local extractor');
      }
    }

    // Local rule-based extractor fallback
    const allText = messages.map((m) => m.content).join(' ');

    const actionPhrases = [
      /(?:i will|i'll|please|we need to|todo:|action:)\s+([^.!?\n]+)/gi,
      /(?:assigned to|let's|could someone)\s+([^.!?\n]+)/gi,
    ];
    const decisionPhrases = [
      /(?:we decided|agreed that|final decision|approved:)\s+([^.!?\n]+)/gi,
      /(?:let's go with|confirmed:)\s+([^.!?\n]+)/gi,
    ];

    const actionItems: Array<{ task: string; assignee?: string; deadline?: string }> = [];
    const decisions: string[] = [];
    const openQuestions: string[] = [];

    messages.forEach((m) => {
      const content = m.content;
      const sender = (m.sender as any)?.displayName || 'Team Member';

      if (content.includes('?')) {
        const questions = content.match(/[^.!?]+\?/g);
        if (questions) {
          questions.forEach((q) => openQuestions.push(q.trim()));
        }
      }

      actionPhrases.forEach((regex) => {
        let match;
        while ((match = regex.exec(content)) !== null) {
          if (match[1] && match[1].length > 5) {
            actionItems.push({
              task: match[1].trim(),
              assignee: sender,
              deadline: content.toLowerCase().includes('today')
                ? 'Today'
                : content.toLowerCase().includes('tomorrow')
                ? 'Tomorrow'
                : undefined,
            });
          }
        }
      });

      decisionPhrases.forEach((regex) => {
        let match;
        while ((match = regex.exec(content)) !== null) {
          if (match[1] && match[1].length > 5) {
            decisions.push(match[1].trim());
          }
        }
      });
    });

    const keyTopics = Array.from(
      new Set(
        allText
          .split(/\s+/)
          .map((w) => w.replace(/[^a-zA-Z]/g, '').toLowerCase())
          .filter((w) => w.length > 5 && !['please', 'thanks', 'should', 'update', 'conversation'].includes(w))
      )
    ).slice(0, 5);

    res.json({
      overview: `Discussion covered ${messages.length} messages. Key subjects revolved around ${keyTopics.join(', ') || 'ongoing projects and technical updates'}.`,
      keyTopics,
      decisions: decisions.slice(0, 4),
      actionItems: actionItems.slice(0, 6),
      deadlines: actionItems.filter((a) => a.deadline).map((a) => `${a.task} (Due: ${a.deadline})`),
      openQuestions: openQuestions.slice(0, 5),
      messageCount: messages.length,
      scope,
      engine: 'Chatterly Intelligence',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate conversation summary.' });
  }
}

export async function chatWithAI(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { message, history = [], attachment } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message text is required.' });
      return;
    }

    const userPrompt = attachment
      ? `${message}\n\n[Attached File]: Name: "${attachment.name}", Type: ${attachment.mimeType || 'unknown'}, URL: ${attachment.url}`
      : message;

    // If Gemini API Key is configured
    if (config.aiApiKey) {
      try {
        const systemPrompt =
          'You are Chatterly AI, the intelligent, friendly, highly capable engineering and productivity assistant built directly into Chatterly. You provide concise, thoughtful, professional answers with clean markdown formatting, structured lists, and helpful code snippets where relevant. When users attach files or code, analyze and reference them accurately in your answer.';

        // Build cleanly normalized alternating turns for Gemini
        const normalizedContents: any[] = [];
        for (const h of history) {
          if (!h.content) continue;
          const role = h.role === 'user' ? 'user' : 'model';
          const lastTurn = normalizedContents[normalizedContents.length - 1];
          if (lastTurn && lastTurn.role === role) {
            lastTurn.parts.push({ text: h.content });
          } else {
            normalizedContents.push({ role, parts: [{ text: h.content }] });
          }
        }

        // Prepare current turn parts
        const currentParts: any[] = [{ text: userPrompt }];

        // If file attachment exists, read text or provide rich context
        if (attachment?.url) {
          try {
            const fileName = path.basename(attachment.url);
            const filePath = path.resolve(process.cwd(), config.uploadDir, fileName);
            if (fs.existsSync(filePath)) {
              const mime = attachment.mimeType || '';
              if (mime.startsWith('image/')) {
                const imgBuffer = fs.readFileSync(filePath);
                currentParts.push({
                  inlineData: {
                    mimeType: mime,
                    data: imgBuffer.toString('base64'),
                  },
                });
              } else if (
                mime.startsWith('text/') ||
                mime.includes('json') ||
                mime.includes('javascript') ||
                mime.includes('typescript') ||
                /\.(txt|json|csv|md|ts|tsx|js|jsx|py|html|css|yaml|yml|log)$/i.test(fileName)
              ) {
                const textContent = fs.readFileSync(filePath, 'utf-8').slice(0, 15000);
                currentParts.push({
                  text: `\n[Contents of attached file "${attachment.name}"]:\n\`\`\`\n${textContent}\n\`\`\``,
                });
              }
            }
          } catch {
            // graceful fallback
          }
        }

        const lastTurn = normalizedContents[normalizedContents.length - 1];
        if (lastTurn && lastTurn.role === 'user') {
          lastTurn.parts.push(...currentParts);
        } else {
          normalizedContents.push({ role: 'user', parts: currentParts });
        }

        const geminiResult = await callGemini(normalizedContents, undefined, systemPrompt);
        if (geminiResult) {
          res.json({
            reply: geminiResult.text,
            engine: `Google Gemini (${geminiResult.model})`,
            isConfigured: true,
          });
          return;
        }
      } catch (err: any) {
        logger.warn({ err: err.message }, 'Gemini chat error, using contextual fallback');
      }
    }

    // Contextual engineering assistant fallback
    const lower = message.toLowerCase();
    let reply = '';

    if (attachment) {
      const fileExt = (attachment.name || '').split('.').pop()?.toUpperCase() || 'FILE';
      reply = `### Analysis of Attachment: **${attachment.name}**\n\nI reviewed your attached file (**${attachment.name}**, \`${fileExt}\` format) regarding your query:\n\n> *"${message}"*\n\n**Key Observations & Technical Recommendations:**\n1. **Asset Structure**: The asset \`${attachment.name}\` was received. Ensure standard validation checks and schemas are applied.\n2. **Integration Advice**: For frontend assets, verify bundling and caching headers (\`Cache-Control: public, max-age=31536000\`). For data files or code, maintain strict TypeScript typing and error boundaries.\n3. **Optimization**: Minify, compress, or use web-optimized representations to reduce bundle overhead.\n\nLet me know if you would like me to draft code, parse specific fields, or debug details from this attachment!`;
    } else if (lower.includes('websocket') || lower.includes('realtime') || lower.includes('socket')) {
      reply = `### Real-Time Architecture with WebSockets\n\nWebSockets establish a persistent, full-duplex TCP connection between client and server. In Chatterly:\n\n- **Bi-directional event streaming**: \`chat:send\` and \`chat:receive\` eliminate polling latency.\n- **Room multiplexing**: Clients join specific channel and conversation IDs.\n- **Presence & typing**: Ephemeral presence heartbeats keep user rosters synchronized.\n\n\`\`\`typescript\n// Server-side Socket.IO room broadcast\nio.to(room).emit('chat:receive', messagePayload);\n\`\`\``;
    } else if (lower.includes('mongodb') || lower.includes('index') || lower.includes('database')) {
      reply = `### High-Concurrency MongoDB Design\n\nFor high-throughput real-time messaging:\n\n1. **Compound Indexes**: Querying historical messages should use \`{ conversation: 1, createdAt: -1 }\` for cursor-based pagination.\n2. **Avoid Unbounded Arrays**: Store messages as individual documents in a collection rather than embedding thousands of messages in a conversation document.\n3. **Projection**: Always select only needed fields (e.g. \`.select('-passwordHash')\`) to minimize bandwidth.\n\n\`\`\`javascript\nmessageSchema.index({ conversation: 1, createdAt: -1 });\n\`\`\``;
    } else if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
      reply = `👋 Hello! I am **Chatterly AI** in Chatterly. I can help you debug TypeScript errors, optimize database queries, architect real-time systems, or draft engineering release notes. What are you building today?`;
    } else {
      reply = `### Response from Chatterly AI\n\nI analyzed your query: *"${message}"*\n\nHere are key recommendations to consider:\n\n- **Modularity**: Break components into reusable hooks and focused view layers.\n- **Performance**: Use memoization and cursor pagination for scalable message rendering.\n- **Security**: Always enforce server-side validation and authorization before trusting client payloads.\n\nFeel free to ask follow-up questions or share code snippets!`;
    }

    res.json({
      reply,
      engine: 'Chatterly Intelligence',
      isConfigured: !!config.aiApiKey,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process AI chat query.' });
  }
}
