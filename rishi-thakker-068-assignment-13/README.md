# 💬 Assignment 13: Real-Time Group Chat & Messaging Engine (Socket.io)

**Name:** Rishi Thakker
**Roll No:** 150096725068
**Cohort:** Sam Altman

**Deployed Link:** https://assignment-13-realtime-chat-application-0pq5.onrender.com/

A multi-room real-time chat app built with **Node.js, Express, and Socket.io**. Users join channels, see message history on join, get live typing indicators, and can send private direct messages.

## Features
- Predefined rooms (`#general`, `#developers`, `#random`) plus joining any custom room name
- New joiners instantly see the last 50 messages for that room via `room:history`
- Live "X is typing..." indicator, debounced (stops automatically ~1s after the user pauses typing)
- Online user roster per room, updated in real time as people join/leave
- Private direct messages between two users, delivered only to the intended recipient

## Real-Time Event Protocol
| Event | Direction | Payload |
|---|---|---|
| `user:login` | Client → Server | `{ username, avatar }` |
| `room:join` | Client → Server | `{ room }` |
| `room:history` | Server → Client | `{ room, messages }` |
| `room:userlist` | Server → Room | `{ room, users: [{ userId, username }] }` |
| `room:leave` | Client → Server | `{ room }` |
| `chat:send` | Client → Server | `{ room, message }` |
| `chat:receive` | Server → Room | `{ id, sender, message, timestamp }` |
| `typing:start` / `typing:stop` | Client → Server | `{ room }` |
| `typing:update` | Server → Room | `{ username, isTyping }` |
| `direct:send` | Client → Server | `{ recipientId, message }` |
| `direct:receive` | Server → Client | `{ from, fromId, message, timestamp }` |

## Folder Structure
```text
rishi-thakker-068-assignment-13/
├── public/
│   ├── index.html
│   ├── app.js
│   └── style.css
├── sockets/
│   ├── chatHandler.js
│   └── userHandler.js
├── util/
│   └── messageStore.js
├── package.json
├── server.js
└── README.md
```
