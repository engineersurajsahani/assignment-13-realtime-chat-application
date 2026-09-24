# 💬 Real-Time Group Chat & Direct Messaging Engine (Socket.io)

A high-performance, real-time group chat and private direct messaging engine built with **Node.js**, **Express.js**, **Socket.io**, and vanilla HTML5 / CSS3 / JavaScript.

---

## 🚀 Features

- **Multi-Channel Rooms**: Dynamic room switching (`#general`, `#developers`, `#random`, or custom user-created rooms) with `socket.join()` / `socket.leave()`.
- **Instant Message History Replay**: Caches the last 50 messages per room in an in-memory store and hydrates new room joiners on arrival via `room:history`.
- **Active User Presence**: Real-time room participant rosters and global online user directory with live counters and avatars.
- **Debounced Typing Indicators**: 500ms debounce handling to broadcast `"X is typing..."` strictly to active channel members without echoing to sender.
- **Targeted Direct Messaging (DMs)**: Private 1-on-1 messaging dispatched directly to specific recipient socket IDs (`io.to(recipientSocketId)`), featuring unread badges and isolated private threads.
- **Modern Dark UI**: Discord/Slack-inspired dark theme with responsive sidebars, custom scrollbars, and avatar customization.

---

## 📁 Project Structure

```
assignment-13-chat-socket/
├── public/
│   ├── index.html      # UI Layout, modals, sidebar, chat panes
│   ├── app.js          # Client-side Socket.io event orchestration & DOM handling
│   └── style.css       # Dark theme styles, animations, responsiveness
├── sockets/
│   ├── chatHandler.js  # Group chat dispatch, typing indicators, DMs
│   └── userHandler.js  # Identity login, room joins/leaves, disconnects
├── utils/
│   └── messageStore.js # In-memory user directory and rolling message history
├── server.js           # Express + HTTP + Socket.io server bootstrap
├── .env.example        # Environment variable templates
├── .gitignore          # Git exclusion rules
├── package.json        # Project metadata and dependencies
└── README.md           # Documentation & instructions
```

---

## 📡 Socket Event Protocol

| Event | Direction | Payload | Description |
|---|---|---|---|
| `user:login` | Client → Server | `{ username, avatar }` | Registers user identity and maps to active `socket.id`. |
| `room:join` | Client → Server | `{ room }` | Leaves old room, joins new room, requests history, updates rosters. |
| `room:history` | Server → Client | `{ room, messages: [...] }` | Sends recent message history (up to 50) exclusively to joining client. |
| `room:userlist` | Server → Room | `{ room, users: [...] }` | Broadcasts updated online users list in the room. |
| `room:leave` | Client → Server | `{ room }` | Leaves current room and updates roster. |
| `chat:send` | Client → Server | `{ room, message }` | Dispatches a message to the room. |
| `chat:receive` | Server → Room | `{ id, sender, avatar, message, timestamp }` | Broadcasts new message to all room participants. |
| `typing:start` | Client → Server | `{ room }` | User initiated typing in a channel. |
| `typing:stop` | Client → Server | `{ room }` | User stopped typing / sent message. |
| `typing:update` | Server → Room | `{ username, isTyping, room }` | Broadcasts typing state to channel members (excluding sender). |
| `direct:send` | Client → Server | `{ recipientId, message }` | Sends private DM to a recipient's `socket.id`. |
| `direct:receive` | Server → Client | `{ from, message, timestamp, ... }` | Delivered only to intended recipient socket (and sender echo). |
| `disconnect` | Built-in | None | Cleans up user presence and broadcasts updated roster. |

---

## 🛠️ Local Installation & Development

### 1. Prerequisites
- Node.js (v18+ recommended)
- npm

### 2. Install Dependencies
```bash
cd Desktop/assignment-13-realtime-chat-application/Dharmit_Sathvara/assignment-13-chat-socket
npm install
```

### 3. Start Development Server
```bash
npm run dev
```
The server will start on [http://localhost:5000](http://localhost:5000).

---

## 🧪 Testing & Validation Scenario (3-Tab Test)

To verify multi-room isolation, typing indicators, and private DMs:

1. **Open 3 Browser Tabs/Windows**:
   - Tab 1: Login as **Aarav** (Avatar: 🦊)
   - Tab 2: Login as **Priya** (Avatar: 🐱)
   - Tab 3: Login as **Rohan** (Avatar: 🐼)

2. **Room Channel Isolation**:
   - **Aarav** and **Priya** switch to `#developers`.
   - **Rohan** switches to `#random`.
   - In `#developers`, **Aarav** begins typing → Only **Priya** sees `"Aarav is typing..."`. **Rohan** in `#random` does **not** see any typing notification.
   - **Aarav** sends *"Hello team!"* → Only **Priya** receives the message in `#developers`. **Rohan** receives nothing.

3. **Message History Hydration**:
   - Open a **4th Tab** and log in as a new user.
   - Switch to `#developers` → All previously sent messages replay instantly from in-memory history.

4. **Direct Messaging (DM) Privacy**:
   - In the sidebar or roster, **Aarav** clicks on **Priya** to open a DM thread.
   - **Aarav** sends *"Hey Priya, confidential update"*.
   - **Priya** receives the DM directly with an unread badge notification.
   - **Rohan** does not receive or see this message.

---

## 🌐 Deploying to Render

Render natively supports WebSocket connections required by Socket.io.

### Step-by-Step Render Deployment Guide:

1. **Push your code to GitHub**:
   ```bash
   cd /Users/dharmitsathvara/Desktop/assignment-13-realtime-chat-application
   git add .
   git commit -m "feat: real-time chat application with socket.io"
   git push origin main
   ```

2. **Create a Web Service on Render**:
   - Go to [dashboard.render.com](https://dashboard.render.com/) and click **New +** → **Web Service**.
   - Select your repository (`assignment-13-realtime-chat-application`).

3. **Configure Service Settings**:
   - **Name**: `assignment-13-chat-socket`
   - **Region**: Choose closest region (e.g., Singapore, Frankfurt, Oregon)
   - **Branch**: `main`
   - **Root Directory**: `Dharmit_Sathvara/assignment-13-chat-socket`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

4. **Environment Variables**:
   - Render automatically assigns a dynamic `PORT`. `server.js` defaults to `process.env.PORT || 5000`.

5. **Deploy**:
   - Click **Create Web Service**.
   - Render will build and launch your application. Once live, open the provided `https://<your-app>.onrender.com` URL.

> **Note on Free Tier Spin-Down**: On Render's free tier, inactive instances spin down after 15 minutes of inactivity. When restarted, the in-memory chat state resets. In production systems, a Redis pub/sub adapter and MongoDB/PostgreSQL database would persist messages across restarts.
