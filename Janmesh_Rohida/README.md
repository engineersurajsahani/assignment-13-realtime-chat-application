# Real-Time Group Chat & Messaging Engine (Socket.io)

A production-quality real-time multi-room group chat and direct messaging web application built with **Node.js**, **Express.js**, and **Socket.io**. Features active room user presence tracking, debounced typing indicators, in-memory chat history replay, and isolated direct messaging with a custom warm brown-and-white theme.

---

## 🚀 Features

- **Multi-Channel Rooms**: Dynamically join and switch between `#general`, `#developers`, and `#random` chat rooms (`socket.join` / `socket.leave`).
- **Real-Time Group Messaging**: Selective room broadcasting (`io.to(room).emit('chat:receive', message)`) ensuring messages reach members of that channel in real time.
- **Debounced Typing Indicators**: Room-scoped typing indicator state (`typing:start`, `typing:stop`, `typing:update`) with a 2-second client-side debounce timeout.
- **Chat History Hydration**: In-memory ring buffer (up to 50 messages per room) instantly replayed to new joiners upon room connection (`room:history`).
- **Active User Presence & Roster**: Live online user list per channel (`room:userlist`), updating automatically on join, leave, or disconnect.
- **Isolated Direct Messaging (DM)**: Targeted single-socket DM dispatch (`io.to(recipientSocketId).emit('direct:receive', message)`), completely isolated from channel history.
- **Warm Brown & White Theme**: Fully custom UI styling using coffee brown (`#6F4E37`), tan (`#D2B48C`), and warm off-white (`#FBF7F0`).

---

## 📁 Directory Structure

```text
Janmesh_Rohida/
├── public/
│   ├── index.html       # Multi-room chat UI & modal components
│   ├── app.js           # Client-side socket event handlers & UI logic
│   └── style.css        # Warm brown & white theme design system
├── sockets/
│   ├── chatHandler.js   # Group chat, typing indicator & DM handlers
│   └── userHandler.js   # Authentication, room join/leave & disconnect logic
├── utils/
│   └── messageStore.js  # In-memory user store & room history buffer
├── server.js            # Express & Socket.io server setup
├── package.json         # Project dependencies and scripts
├── .env.example         # Environment variable template
├── .gitignore           # Ignored files
└── README.md            # Comprehensive documentation
```

---

## 🔌 Socket Event Protocol

### 1. Session & Room Management

| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `user:login` | Client → Server | `{ username, avatar }` | Registers user identity & maps to `socket.id`. |
| `room:join` | Client → Server | `{ room }` | Leaves old room, joins new socket room, emits history to joiner, and broadcasts user list to room. |
| `room:history` | Server → Client | `{ room, messages }` | Sends recent history buffer (up to 50 messages) to joining socket. |
| `room:userlist` | Server → Room | `{ room, users }` | Broadcasts updated list of online participants in the channel. |
| `room:leave` | Client → Server | `{ room }` | Unsubscribes socket from channel and updates room participant roster. |

### 2. Messaging & Indicators

| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `chat:send` | Client → Server | `{ room, message }` | Sends a message to a room. Formats timestamp and saves to history. |
| `chat:receive` | Server → Room | `{ id, sender, message, timestamp }` | Broadcasts new message to all members in the room (including sender). |
| `typing:start` | Client → Server | `{ room }` | Emits when user starts typing in the active channel. |
| `typing:stop` | Client → Server | `{ room }` | Emits after 2s of typing inactivity or immediately on message send. |
| `typing:update` | Server → Room | `{ username, isTyping }` | Broadcasts typing status to room members **excluding** sender (`socket.to(room)`). |
| `direct:send` | Client → Server | `{ recipientId, message }` | Sends a private direct message targeting `recipientId`. |
| `direct:receive` | Server → Client | `{ from, senderId, message, timestamp }` | Delivers DM **only** to the intended recipient socket. |

---

## 🎨 Design Theme & Aesthetics

The application strictly implements a **Coffee Brown & Off-White Theme Palette**:
- `--color-bg` (`#FBF7F0`): Warm off-white page background.
- `--color-surface` (`#FFFFFF`): Clean card and panel container background.
- `--color-primary` (`#6F4E37`): Deep coffee brown for headers, sidebar, buttons, and active tabs.
- `--color-primary-dark` (`#4A3222`): Darker roast brown for hover states and dark accents.
- `--color-accent` (`#D2B48C`): Soft tan background for user's own chat bubbles.
- `--color-border` (`#E4D5C3`): Soft tan border line for subtle section boundaries.
- `--color-text` (`#3B2A20`): Rich dark brown text for maximum contrast and readability.
- `--color-text-muted` (`#8B6F5B`): Muted brown for timestamps, topics, and typing status.

---

## 🛠️ Local Setup & Run Instructions

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)
- `npm` (Node Package Manager)

### Step 1: Install Dependencies
Open a terminal in the `Janmesh_Rohida/` project folder and run:
```bash
npm install
```

### Step 2: Configure Environment
Copy `.env.example` to `.env` (optional):
```bash
cp .env.example .env
```

### Step 3: Run Server
Start the development server with `nodemon`:
```bash
npm run dev
```
Or start in production mode:
```bash
npm start
```
The server will start on **`http://localhost:5000`**.

---

## 🧪 Verification & Testing Checklist

Open **3 to 4 browser tabs** to `http://localhost:5000` to verify all grading criteria:

- [x] **Room Scoped Typing Indicators**:
  - Open Tab A (Aarav) and Tab B (Priya) in `#developers`, and Tab C (Rohan) in `#random`.
  - Type in Tab A (`#developers`). Tab B immediately sees *"Aarav is typing..."*. Tab C in `#random` sees **nothing**.
  - Stop typing for 2 seconds → typing indicator automatically clears via client debounce.
- [x] **Real-Time Room Messaging**:
  - Send a message in `#developers` from Tab A.
  - Message appears in real time in Tab A and Tab B. Tab C (`#random`) does not receive it.
- [x] **Message History Hydration**:
  - Send 5 messages in `#developers`.
  - Open a 4th tab (Tab D, Ananya) and join `#developers`.
  - Tab D immediately receives all 5 historical messages via `room:history`.
- [x] **Isolated Direct Messaging (DM)**:
  - In Tab A, click on Priya (Tab B) in the online roster list.
  - Send a DM: *"Hey Priya, check the PR"*.
  - DM opens and displays ONLY in Tab B's DM window. Rohan (Tab C) receives no notification or message.

---

## 🌐 Deploying to Render

1. Push your code to your GitHub repository:
   ```bash
   git add .
   git commit -m "Complete Real-Time Group Chat & Messaging Engine"
   git push origin main
   ```
2. On [Render](https://render.com/), create a **New Web Service** connected to your repository.
3. Configure the Web Service settings:
   - **Root Directory**: `Janmesh_Rohida`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
4. Deploy the service. Render will provide a live HTTPS URL supporting WebSockets automatically.


Deployment Link - https://assignment-13-realtime-chat-application-6g83.onrender.com
