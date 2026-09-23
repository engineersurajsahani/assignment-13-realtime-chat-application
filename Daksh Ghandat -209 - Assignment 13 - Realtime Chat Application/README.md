# 💬 Assignment 13 — Real-Time Group Chat & Direct Messaging Engine (Socket.io)

A scalable real-time messaging engine built with **Node.js, Express and
Socket.io** for **Assignment 13**. It supports multiple named channels
(`#general`, `#developers`, `#random` and any dynamic room you create),
real-time group + private direct messages, debounced typing indicators, live
presence rosters, and history replay for new joiners. History is cached in an
in-memory buffer (last **50** messages per room) and optionally persisted to
**MongoDB**.

> The original assignment brief is kept as [`ASSIGNMENT-SPEC.md`](./ASSIGNMENT-SPEC.md).

---

## ✨ Features & Grading Mapping

| Area | Implementation | Rubric |
| --- | --- | --- |
| Multi-room channels | `socket.join(room)` / `socket.leave(room)` isolates rooms | 25 |
| Group + DM messaging | `io.to(room).emit("chat:receive")` vs `io.to(socketId).emit("direct:receive")` | 25 |
| Presence & rosters | `connectedUsers` map + `room:userlist` on join/leave/disconnect | 15 |
| Typing indicators | `typing:start` / `typing:stop` with server-side debounce timers | 15 |
| History hydration | In-memory `roomHistories` buffer (last 50) + Mongo persistence + seed data | 20 |

## 🧱 Tech Stack

- **Node.js** + **Express** — HTTP server & static file serving
- **Socket.io** — full-duplex real-time event streaming (rooms, DM, typing)
- **Mongoose (MongoDB Atlas — optional)** — durable message history
- **CORS** — cross-origin policy for the real-time server
- Vanilla JS dark-theme client (no build step)

## 📁 Directory Structure

```
Daksh Ghandat -209 - Assignment 13 - Realtime Chat Application/
├── ASSIGNMENT-SPEC.md        # Original assignment brief
├── data/
│   └── seedMessages.json     # Sample messages so chat is testable instantly
├── public/
│   ├── index.html            # Multi-room chat UI with dark theme
│   ├── app.js                # Client socket listeners, typing debounce & DM panel
│   ├── style.css             # Chat bubbles, sidebar, user list styling
│   └── avatars/              # avatar1..4.svg pickers
├── sockets/
│   ├── userHandler.js        # Login, room join/leave, rosters & disconnects
│   └── chatHandler.js        # Room messaging, DM dispatching & typing indicators
├── utils/
│   └── messageStore.js       # In-memory history buffer + MongoDB persistence + seed
├── config/
│   └── db.js                 # MongoDB connection bootstrap
├── models/
│   └── Message.js            # Mongoose schema for persisted messages
├── server.js                 # Express & Socket.io server bootstrap
├── test/
│   ├── e2e-runner.js         # Boots the server and runs the smoke test in-process
│   └── smoke.js              # Automated 3-tab scenario test (npm test)
├── .env.example / .gitignore
├── package.json
└── README.md
```

## 🚀 Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment (optional)

```bash
cp .env.example .env
```

```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/chat_socket?retryWrites=true&w=majority
```

- Without `.env` / `MONGO_URI` the app runs **in-memory only** (with seeded
  messages) — perfect for instant testing.
- With MongoDB, every message is also persisted and history survives restarts.
- **macOS note:** AirPlay Receiver occupies port `5000`, so run with
  `PORT=5001` if `5000` is taken.

### 3. Run the server

```bash
npm run dev      # nodemon (development)
npm start        # node (production)
```

Server runs at **http://localhost:5000** (or `PORT` from `.env`).

## 🧪 Testing & Validation

Automated end-to-end smoke test that simulates the grading scenario:

```bash
PORT=5001 npm test      # use PORT=5001 on macOS (AirPlay holds 5000)
```

It verifies: multi-user login → room rosters → typing isolation → group
message isolation → history hydration for a new joiner → private DM exclusion.

### Manual walk-through (per the spec)

1. Open **three tabs** — login as **Aarav**, **Priya**, **Rohan**.
2. Have **Aarav** and **Priya** join `#developers`; **Rohan** joins `#random`.
3. When **Aarav** types in `#developers`, only **Priya** sees *"Aarav is typing…"*; **Rohan** sees nothing.
4. Send a message in `#developers` → **Priya** receives it in real time.
5. Open a **fourth tab**, join `#developers` → all past messages render instantly from history.
6. Send a DM from **Aarav** to **Priya** → **Rohan** does not receive it.

## 📡 Event Protocol

### Session & room management
| Event | Direction | Payload |
| --- | --- | --- |
| `user:login` | Client → Server | `{ username, avatar }` |
| `user:loggedin` | Server → Client | `{ socketId, username, avatar, rooms }` |
| `room:join` | Client → Server | `{ room }` |
| `room:history` | Server → Client | `{ room, messages: [{ id, sender, message, timestamp }] }` |
| `room:userlist` | Server → Room | `{ room, users: [{ socketId, username, avatar }] }` |
| `room:system` | Server → Room | `{ room, type, username, text }` |
| `room:leave` | Client → Server | `{ room }` |
| `user:list:query` | Client → Server | `room` (roster refresh) |

### Messaging & indicators
| Event | Direction | Payload |
| --- | --- | --- |
| `chat:send` | Client → Server | `{ room, message }` |
| `chat:receive` | Server → Room | `{ id, sender, message, timestamp }` |
| `typing:start` | Client → Server | `{ room }` |
| `typing:stop` | Client → Server | `{ room }` |
| `typing:update` | Server → Room (broadcast.to) | `{ username, isTyping }` |
| `direct:send` | Client → Server | `{ recipientId, recipientName, message }` |
| `direct:receive` | Server → Client | `{ from, fromAvatar, message, timestamp }` |
| `direct:sent` | Server → Sender | `{ to, toAvatar, message, timestamp }` |
| `direct:error` | Server → Sender | `{ message }` |

## 🖥 Health Check

```bash
curl http://localhost:5000/api/health
# -> { "status": "ok", "activeUsers": 0, "activeRooms": { "general": 3, "developers": 3, "random": 2 } }
```

> Non-zero room counts on a fresh boot mean `data/seedMessages.json` loaded.