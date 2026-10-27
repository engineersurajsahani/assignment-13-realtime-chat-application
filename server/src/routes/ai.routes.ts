import { Router } from 'express';
import { summarizeConversation, chatWithAI } from '../controllers/ai.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.post('/summarize', summarizeConversation);
router.post('/chat', chatWithAI);

export default router;
