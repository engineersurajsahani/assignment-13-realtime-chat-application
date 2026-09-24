# Assignment 13: Real-Time Group Chat & Messaging Engine (Socket.io)

**Student Name:** Aditya Kumbhar  
**Roll No:** 187  
**Track:** Backend & Real-Time Web  
**Tech Stack:** Node.js, Express.js, Socket.io, In-Memory Message History Store, CORS, Dotenv  
Live link: https://assignment-13-realtime-chat-application-x675.onrender.com 
---

## 📌 1. Project Overview

This project is a scalable **Real-Time Group Chat & Direct Messaging Engine** built with **Node.js, Express.js, and Socket.io**. It supports multi-channel chat rooms (`#general`, `#developers`, `#random` + custom channels), private one-on-one direct messaging, debounced typing indicators, real-time user presence rosters, and in-memory message history caching with instant hydration for new room joiners.

---

## ✨ 2. Key Features

- **Multi-Channel Room Management:** Dynamic room creation, switching, joining, and leaving using `socket.join(room)` and `socket.leave(room)`.
- **In-Memory Message History Buffer:** Automatically stores the last 50 messages per channel and replays them to joining participants via `room:history`.
- **Debounced Typing Indicators:** Real-time indicator ("Aarav is typing...") with a 1.5s debounce timeout to avoid notification spam.
- **Direct Messaging (DMs):** One-to-one private messages dispatched directly to recipient sockets via `io.to(recipientSocketId)`.
- **Live User Presence & Roster:** Real-time participant roster per channel and global online user directory for direct chats.
- **Dark Mode UI:** Responsive Discord/Slack-inspired interface with emoji avatars and message bubbles.

---

## 📡 3. Real-Time Socket Event Protocol

### 🔄 Session & Room Management

| Event Name | Direction | Payload Schema | Description |
|---|:---:|---|---|
| `user:login` | `Client -> Server` | `{ "username": "Aarav", "avatar": "🧑‍💻" }` | Registers user identity and socket mapping |
| `room:join` | `Client -> Server` | `{ "room": "developers" }` | Joins a specific chat channel |
| `room:history` | `Server -> Client` | `{ "room": "developers", "messages": [...] }` | Emits recent message history buffer to joined user |
| `room:userlist` | `Server -> Room` | `{ "room": "developers", "users": [...] }` | Broadcasts updated online users list in the room |
| `room:leave` | `Client -> Server` | `{ "room": "developers" }` | Leaves the room |

### 💬 Messaging & Indicators

| Event Name | Direction | Payload Schema | Description |
|---|:---:|---|---|
| `chat:send` | `Client -> Server` | `{ "room": "developers", "message": "Hey everyone!" }` | Sends message to a room |
| `chat:receive` | `Server -> Room` | `{ "id": "msg_123", "sender": "Aarav", "message": "Hey everyone!", "timestamp": "14:32" }` | Broadcasts message to all members in room |
| `typing:start` | `Client -> Server` | `{ "room": "developers" }` | User started typing in room |
| `typing:stop` | `Client -> Server` | `{ "room": "developers" }` | User stopped typing or sent message |
| `typing:update` | `Server -> Room` | `{ "username": "Aarav", "isTyping": true, "room": "developers" }` | Displays "Aarav is typing..." to room peers |
| `direct:send` | `Client -> Server` | `{ "recipientId": "socket_id_xyz", "message": "Secret DM" }` | Sends private direct message |
| `direct:receive`| `Server -> Client` | `{ "from": "Aarav", "message": "Secret DM", "timestamp": "14:35" }` | Delivered only to intended recipient socket |

---

## 📁 4. Directory Structure

```text
Aditya Kumbhar 187, assignment 13/
├── public/
│   ├── index.html           # Multi-room chat UI with dark theme
│   ├── app.js               # Client socket event listeners & UI updates
│   └── style.css            # Chat bubbles, sidebar, user list styling
├── sockets/
│   ├── chatHandler.js       # Room messaging, DM & typing handlers
│   └── userHandler.js       # User login, room join/leave & disconnects
├── utils/
│   └── messageStore.js      # Message history management
├── server.js                # Express & Socket.io server bootstrap
├── package.json
├── .env
├── .env.example
├── .gitignore
└── README.md
```

---

## 🚀 5. Setup & Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file (or copy from `.env.example`):
```env
PORT=5001
```

### 3. Start Server
```bash
# Start server with node
npm start

# Or with nodemon in development mode
npm run dev
```

---

## 🧪 6. Testing & Validation

1. Start server and open three browser tabs: `http://localhost:5001`.
2. Log in as **User A (Aarav)** in Tab 1, **User B (Priya)** in Tab 2, and **User C (Rohan)** in Tab 3.
3. Have **Aarav** and **Priya** switch to `#developers`, while **Rohan** stays in `#random`.
4. When **Aarav** types in `#developers`, verify only **Priya** sees `"Aarav is typing..."`. **Rohan** in `#random` does not see it.
5. Send messages in `#developers`: verify **Priya** receives them in real time.
6. Open a fourth tab, join `#developers` as a new user, and verify all previous messages are immediately displayed from history.
7. Click **💬 DM** next to Priya in Aarav's sidebar and send a private message: verify Rohan does not receive it.
