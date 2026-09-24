# PulseChat — Real-Time Group Chat & Direct Messaging

PulseChat is a full-stack real-time group chat and direct messaging application built with **Node.js**, **Express.js**, **Socket.io**, and a **Vanilla JavaScript** frontend.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js, Socket.io, CORS, dotenv
- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3 (Modern Dark Theme Design System)
- **Development**: nodemon

---

## 📁 Project Structure

```
assignment-13-chat-socket/
├── public/
│   ├── index.html          # Web application structure & modal dialogs
│   ├── app.js              # Client-side Socket.io logic, debounce, and state
│   └── style.css           # Modern dark-theme stylesheet and responsive layout
├── sockets/
│   ├── chatHandler.js      # Chat messaging, typing indicators & DM socket events
│   ├── presenceStore.js    # Shared in-memory presence Map (socketId -> user profile)
│   └── userHandler.js      # User session lifecycle, login, room join/leave & disconnect
├── utils/
│   └── messageStore.js     # In-memory capped history per room (max 50 messages)
├── server.js               # Express app, HTTP server, and Socket.io server wiring
├── package.json            # Scripts & project dependencies
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore rules
└── README.md               # Documentation & testing walkthrough
```

---

## 🚀 Getting Started

### 1. Installation

Clone or open the repository, then install the dependencies:

```bash
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` (already configured with default values):

```bash
cp .env.example .env
```

Default variables:
```env
PORT=5000
CORS_ORIGIN=*
```

### 3. Running the Application

- **Production / Standard Mode**:
  ```bash
  npm start
  ```
- **Development Mode (with auto-restart)**:
  ```bash
  npm run dev
  ```

### 4. Accessing the App

Open your browser and navigate to:
```
http://localhost:5000
```

---

## 📡 Real-Time Event Protocol

| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `user:login` | Client ➔ Server | `{ username, avatar }` | Registers user session in `connectedUsers` map with `currentRoom: null`. |
| `user:login:success` | Server ➔ Client | `{ socketId, username, avatar }` | Confirms successful login and returns the assigned `socketId`. |
| `room:join` | Client ➔ Server | `{ room }` | Leaves previous room (if any), joins target room, updates `currentRoom`, returns history, and broadcasts userlist. |
| `room:history` | Server ➔ Joining Client | `{ room, messages }` | Sends the last up-to-50 messages stored for that room. |
| `room:userlist` | Server ➔ Whole Room | `{ room, users: [{ socketId, username, avatar }] }` | Broadcasts the list of active members currently present in the room. |
| `room:leave` | Client ➔ Server | `{ room }` | Leaves the room, clears user's `currentRoom`, and broadcasts refreshed `room:userlist` to remaining room members. |
| `chat:send` | Client ➔ Server | `{ room, message }` | Sends a message to the active room. Server validates membership, caps history, and broadcasts to room. |
| `chat:receive` | Server ➔ Whole Room | `{ id, sender, avatar, message, timestamp }` | Broadcasts new message to all members in the room (including sender). |
| `typing:start` | Client ➔ Rest of Room | `{ room }` | Emits `typing:update` with `{ username, isTyping: true }` to other room members. |
| `typing:stop` | Client ➔ Rest of Room | `{ room }` | Emits `typing:update` with `{ username, isTyping: false }` to other room members. |
| `typing:update` | Server ➔ Rest of Room | `{ username, isTyping }` | Notifies clients that a user started or stopped typing. |
| `direct:send` | Client ➔ Server | `{ recipientId, message }` | Sends private message directly to recipient socket via `io.to(recipientId)`. |
| `direct:sent` | Server ➔ Sender | `{ toId, toUsername, avatar, message, timestamp }` | Confirms DM delivery to the sender. |
| `direct:receive` | Server ➔ Recipient | `{ from, fromId, avatar, message, timestamp }` | Delivers DM to the recipient socket. |
| `error` | Server ➔ Client | `{ message }` | Emitted when validation fails (e.g. empty username, missing recipient, unauthorized room message). |
| `disconnect` | Socket Lifecycle | *N/A* | Cleans up user presence and broadcasts refreshed userlist/typing states to their former room. |

---

## 💡 Key Architectural Decisions & Assumptions

### 1. One-Room-Per-Socket Model
- **Design Decision**: A user is active in exactly one room channel at a time (`currentRoom`). When switching rooms (`#general` ➔ `#developers`), the server executes `socket.leave(previousRoom)` before `socket.join(newRoom)`.
- **Rationale**: This aligns with common channel-based chat UX (like Slack/Discord channel switching) and ensures typing indicators, message histories, and active room user lists accurately reflect who is reading and interacting with that specific room.
- **Extending to Multi-Room Membership**: To support simultaneous multi-room presence, `currentRoom` in the `connectedUsers` map would be replaced with a `Set` of room names (`joinedRooms = new Set()`), and room events would target specific room scopes without leaving previous ones.

### 2. Typing Indicators with Debounce Handling
- **Implementation**:
  1. On the first keystroke in `#chat-input`, if `!isCurrentlyTyping`, the client immediately emits `typing:start` and sets `isCurrentlyTyping = true`.
  2. Every subsequent keystroke resets a `setTimeout` timer configured with `TYPING_DEBOUNCE_MS = 2000` (2 seconds).
  3. When the user stops typing for 2 seconds, the timer expires and emits `typing:stop`, resetting `isCurrentlyTyping = false`.
  4. On form submission (`chat:send`), any active timer is cleared and `typing:stop` is immediately emitted.
- **Multi-User Typing Display**: Multiple simultaneous typists are handled gracefully:
  - 1 typist: *"Aarav is typing..."*
  - 2 typists: *"Aarav and Priya are typing..."*
  - 3+ typists: *"Aarav, Priya and 1 other(s) are typing..."*

### 3. Direct Messaging & Socket ID Addressing
- **Addressing Mechanism**: Direct messages are targeted directly to the recipient socket using their `socketId` (`io.to(recipientId).emit('direct:receive', ...)`).
- **Limitation**: `socketId`s are ephemeral and change upon client reconnection or page reload. For demo and single-session scope, this is efficient and straightforward. In a persistent production environment with database backing, DMs would be addressed by persistent `userId` and mapped to active sockets via a Redis presence adapter.
- **Privacy**: DMs are strictly private and are **never** stored in public `roomHistories`.

### 4. Extra Robustness: Lightweight `error` Event
- An `error` event is emitted by the server if a client tries to login with an empty username, send an unauthorized message to a room they are not in, or send a DM to a disconnected recipient. The frontend displays these via sleek toast notifications.

---

## 🧪 Testing Walkthrough

Follow these exact steps to verify all real-time functionalities across multiple browser tabs:

1. **Boot Server & Open 3 Browser Tabs**:
   - Run `npm start` and open `http://localhost:5000` in 3 separate browser tabs (or incognito windows).
   - Log in Tab 1 as **Aarav**, Tab 2 as **Priya**, and Tab 3 as **Rohan**.

2. **Room Channel Navigation**:
   - In **Aarav**'s tab, click `#developers`.
   - In **Priya**'s tab, click `#developers`.
   - In **Rohan**'s tab, click `#random`.
   - Verify: The *"IN THIS ROOM"* user list on the right panel shows Aarav and Priya in `#developers`, and Rohan alone in `#random`.

3. **Typing Indicators Isolation**:
   - In **Aarav**'s tab (`#developers`), start typing in the message box.
   - **Verify**: **Priya** immediately sees *"Aarav is typing..."*.
   - **Verify**: **Rohan** (in `#random`) sees **nothing**.
   - Stop typing for 2 seconds and observe the indicator disappear in Priya's tab.

4. **Real-Time Group Chat**:
   - In **Aarav**'s tab, send: *"Hello developers!"*.
   - **Verify**: **Priya** receives the message in real time with Aarav's avatar and timestamp.
   - **Verify**: **Aarav**'s message appears on the right side in his own tab.
   - **Verify**: **Rohan** in `#random` does not receive the message.

5. **Message History on Late Join**:
   - Open a 4th browser tab, log in as **Neha**, and click `#developers`.
   - **Verify**: Neha immediately receives the previous message history (`"Hello developers!"`) via `room:history`.

6. **Direct Messaging (DMs)**:
   - In **Aarav**'s tab, click **Priya** in the right-hand user list to open the Direct Message dialog.
   - Send: *"Hey Priya, are you free for a quick sync?"*.
   - **Verify**: **Priya** receives the private message and sees a notification toast / DM drawer.
   - **Verify**: **Rohan** and **Neha** receive nothing.

---

## 📮 API & Automated Testing Note
Because PulseChat is built exclusively on real-time WebSockets (Socket.io) with no REST endpoints, testing is performed directly via the browser UI walkthrough detailed above. Automated testing can optionally be conducted using scripted Socket.io client instances (via the `socket.io-client` npm package).
