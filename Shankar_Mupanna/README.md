# Assignment 13: Real-Time Group Chat & Messaging Engine (Socket.io)

A real-time multi-room group chat and direct messaging engine built with **Node.js**, **Express.js**, **Socket.io**, and an **In-Memory History Store**.

---

## 📌 Project Overview

This project implements a scalable WebSockets chat engine featuring:
- **Multi-Channel Room Management**: Switch channels (`#general`, `#developers`, `#random`, or create custom `#rooms`).
- **Real-Time Group Messaging**: Broadcast messages instantly to room members using `io.to(room)`.
- **Private Direct Messaging (DMs)**: Targeted peer-to-peer message dispatch using `io.to(recipientSocketId)`.
- **Debounced Typing Indicators**: Displays real-time typing status (`typing:start`, `typing:stop`, `typing:update`) with 800ms debounce timeouts.
- **Active User Presence Tracking**: Dynamic online participant rosters for active channels and global workspace users.
- **Message History Replay & Hydration**: Caches up to 50 recent messages per room and hydrates new joiners upon room connection.
- **Dark-Themed UI**: Responsive, modern web interface with avatar selection and direct message drawer.

---

## 🏗️ Project Architecture

```
assignment-13-chat-socket/
├── public/
│   ├── index.html           # Multi-room chat UI with dark theme
│   ├── app.js               # Client socket event listeners & UI updates
│   └── style.css            # Chat bubbles, sidebar, user list styling
├── sockets/
│   ├── chatHandler.js       # Room messaging, DM & typing handlers
│   └── userHandler.js       # User login, room join/leave & disconnects
├── utils/
│   └── messageStore.js      # Message history buffer & connected user store
├── server.js                # Express & Socket.io server bootstrap
├── package.json
└── README.md
```

---

## 📡 Real-Time Socket Event Protocol

### 🔄 Session & Room Management
| Event Name | Direction | Payload Schema | Description |
| :--- | :--- | :--- | :--- |
| `user:login` | Client -> Server | `{ "username": "Aarav", "avatar": "avatar1.png" }` | Registers user identity and socket mapping |
| `user:login_success` | Server -> Client | `{ "user": {...}, "allUsers": [...] }` | Returns assigned user details and connected roster |
| `room:join` | Client -> Server | `{ "room": "developers" }` | Joins a specific chat channel |
| `room:history` | Server -> Client | `{ "room": "developers", "messages": [...] }` | Emits recent message history buffer to joined user |
| `room:userlist` | Server -> Room | `{ "room": "developers", "users": [...] }` | Broadcasts updated online users list in the room |
| `users:all` | Server -> All | `{ "users": [...] }` | Broadcasts global online users list across all rooms |
| `room:leave` | Client -> Server | `{ "room": "developers" }` | Leaves the current chat channel |

### 💬 Messaging & Indicators
| Event Name | Direction | Payload Schema | Description |
| :--- | :--- | :--- | :--- |
| `chat:send` | Client -> Server | `{ "room": "developers", "message": "Hey everyone!" }` | Sends message to a room |
| `chat:receive` | Server -> Room | `{ "id": "msg_123", "sender": "Aarav", "avatar": "avatar1.png", "message": "Hey everyone!", "timestamp": "14:32", "room": "developers" }` | Broadcasts message to all members in room |
| `typing:start` | Client -> Server | `{ "room": "developers" }` | User started typing in room |
| `typing:stop` | Client -> Server | `{ "room": "developers" }` | User stopped typing or sent message |
| `typing:update` | Server -> Room | `{ "username": "Aarav", "isTyping": true, "room": "developers" }` | Displays "Aarav is typing..." to others in room |
| `direct:send` | Client -> Server | `{ "recipientId": "socket_id_xyz", "message": "Secret DM" }` | Sends private direct message |
| `direct:receive` | Server -> Target | `{ "id": "dm_123", "from": "Aarav", "senderId": "socket_id_abc", "message": "Secret DM", "timestamp": "14:35" }` | Delivered only to intended recipient socket |

---

## 🛠️ Quick Start & Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
# Production mode
npm start

# Development mode with Nodemon
npm run dev
```
The server will start on **http://localhost:5000**.

---

## 🧪 Testing & Validation Steps

1. Start the server on `http://localhost:5000`.
2. Open three separate browser tabs:
   - **Tab 1**: Login as `Aarav` (Avatar 1)
   - **Tab 2**: Login as `Priya` (Avatar 2)
   - **Tab 3**: Login as `Rohan` (Avatar 3)
3. Have **Aarav** and **Priya** join `#developers`, while **Rohan** joins `#random`.
4. **Typing Indicator Test**: When Aarav types in `#developers`, verify only Priya sees *"Aarav is typing..."*. Rohan in `#random` should see nothing.
5. **Group Messaging Test**: Send messages in `#developers` - verify Priya receives them in real time while Rohan does not.
6. **Message History Hydration Test**: Open a fourth tab, join `#developers` as a new user, and verify all previous messages are immediately displayed from history buffer.
7. **Direct Messaging Test**: Click the DM button next to Priya in Aarav's sidebar and send a direct message: verify only Priya receives it (and Rohan does not).
