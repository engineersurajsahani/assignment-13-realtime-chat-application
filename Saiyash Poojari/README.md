# Real-Time Group Chat & Messaging Engine (Socket.io)

An advanced, scalable Real-Time Group Chat & Direct Messaging Engine built with Node.js, Express.js, and Socket.io, featuring a high-performance in-memory message history buffer, dynamic multi-room channel management, presence rosters, debounced typing state indicators, and private socket-to-socket direct messaging (DM).

---

## Key Features & Learning Outcomes

1. **Multi-Room & Channel Management**:
   - Dynamic room creation and room switching (`#general`, `#developers`, `#random`, `#tech`, `#gaming`).
   - Clean socket scoping via `socket.join(room)` and `socket.leave(room)`.

2. **Real-Time Group & Direct Messaging**:
   - Room-wide message dispatching via `io.to(room).emit('chat:receive')`.
   - Private end-to-end socket messaging via `io.to(recipientSocketId).emit('direct:receive')`.

3. **Active User Presence & Roster Tracking**:
   - Global and per-room connected user tracking (`connectedUsers` Map).
   - Real-time online rosters broadcasted on join, leave, or disconnect.

4. **Debounced Typing Indicators**:
   - Debounced state emission (`typing:start`, `typing:stop`) with a `600ms` inactivity timeout.
   - Broadcasted exclusively to other room members (`socket.broadcast.to(room)`).

5. **Message History Hydration Buffer**:
   - Maintains the last **50 messages** per room (`MAX_HISTORY = 50`).
   - Instant room history replay (`room:history`) when a user connects or switches channels.

---

## Real-Time Socket Event Protocol

### Session & Room Management
| Event Name | Direction | Payload Schema | Description |
|---|---|---|---|
| `user:login` | Client -> Server | `{ "username": "Aarav", "avatar": "avatar1" }` | Registers user identity and socket mapping |
| `room:join` | Client -> Server | `{ "room": "developers" }` | Joins a specific chat channel & leaves previous |
| `room:history` | Server -> Client | `{ "room": "developers", "messages": [...] }` | Emits recent message history buffer to joined user |
| `room:userlist` | Server -> Room | `{ "room": "developers", "users": [...] }` | Broadcasts updated online users list in the room |
| `room:leave` | Client -> Server | `{ "room": "developers" }` | Leaves channel room |
| `users:online` | Server -> Client | `[{ "socketId": "...", "username": "...", "avatar": "..." }]` | Broadcasts all online users globally for DM roster |

### Messaging & Indicators
| Event Name | Direction | Payload Schema | Description |
|---|---|---|---|
| `chat:send` | Client -> Server | `{ "room": "developers", "message": "Hey everyone!" }` | Sends message to a room |
| `chat:receive` | Server -> Room | `{ "id": "msg_123", "sender": "Aarav", "avatar": "avatar1", "message": "Hey everyone!", "timestamp": "14:32" }` | Broadcasts message to all members in room |
| `typing:start` | Client -> Server | `{ "room": "developers" }` | User started typing in room |
| `typing:stop` | Client -> Server | `{ "room": "developers" }` | User stopped typing or sent message |
| `typing:update` | Server -> Room | `{ "username": "Aarav", "room": "developers", "isTyping": true }` | Broadcasts typing state to room participants |
| `direct:send` | Client -> Server | `{ "recipientId": "socket_id_xyz", "message": "Secret DM" }` | Sends private direct message to recipient socket |
| `direct:receive` | Server -> Client | `{ "from": "Aarav", "message": "Secret DM", "timestamp": "14:35", "fromSocketId": "..." }` | Delivered only to intended recipient socket |

---

## Project Directory Structure

```
assignment-13-chat-socket/
├── public/
│   ├── index.html           # Multi-room & DM chat UI
│   ├── app.js               # Client socket event listeners & UI updates
│   └── style.css            # Chat bubbles, sidebar, user list styling
├── sockets/
│   ├── chatHandler.js       # Room messaging, DM & typing handlers
│   └── userHandler.js       # User login, room join/leave & disconnects
├── utils/
│   └── messageStore.js      # Message history management (MAX_HISTORY = 50)
├── server.js                # Express & Socket.io server bootstrap
├── package.json
└── README.md
```

---

## Setup & Running Instructions

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Server**:
   ```bash
   npm start
   # or with dev reloading:
   npm run dev
   ```

3. **Access Application**:
   Open browser at: `http://localhost:5001`

---

## Testing & Validation Workflow

1. Start the server on `http://localhost:5001`.
2. Open three browser tabs:
   - **Tab A**: Login as `Aarav` (Join `#developers`)
   - **Tab B**: Login as `Priya` (Join `#developers`)
   - **Tab C**: Login as `Rohan` (Join `#random`)
3. When `Aarav` types in `#developers`, verify only `Priya` sees `"Aarav is typing..."`. `Rohan` in `#random` sees nothing.
4. Send messages in `#developers`: verify `Priya` receives them in real time.
5. Open a fourth tab (**Tab D**), join `#developers` as a new user: verify all previous messages are immediately hydrated from history.
6. Send a direct message from `Aarav` to `Priya`: verify `Rohan` does not receive it.
