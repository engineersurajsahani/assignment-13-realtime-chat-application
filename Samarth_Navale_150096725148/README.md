# 💬 Real-Time Group Chat & Messaging Engine (Assignment 13)

🚀 **Live Deployment Links:**
- **Render:** [https://samarth-assignment-13-realtime-chat-app.onrender.com](https://samarth-assignment-13-realtime-chat-app.onrender.com)
- **Vercel:** [https://samarth-assignment-13-chat-app.vercel.app](https://samarth-assignment-13-chat-app.vercel.app)

---

- **Name:** Samarth Navale
- **Roll No:** 150096725148
- **Cohort:** Sam Altman

---

A scalable **Real-Time Group Chat & Direct Messaging Engine** built with **Node.js, Express.js, and Socket.io**. Features dynamic multi-channel room management (`#general`, `#developers`, `#random`), live typing indicators with debounce, active participant presence tracking, and message history replay upon room connection.

---

## 🚀 Features

- 🔄 **Multi-Channel Chat Rooms**: Join, switch and leave rooms with immediate participant roster updates.
- 💬 **Real-Time Messaging & Direct Messages**: Room-level broadcasting and private user-to-user messaging.
- ✍️ **Debounced Typing Indicators**: Displays live typing status within active channels with automatic timeout resets.
- 📜 **Message History Caching**: Retains the last 50 messages per room to immediately hydrate new joiners.
- 👥 **Presence & User Roster**: Real-time tracking of online room members.

---

## 🛠️ Tech Stack & Dependencies

- **Runtime:** Node.js
- **Framework:** Express.js
- **Real-Time Engine:** Socket.io
- **Frontend UI:** HTML5 & Vanilla JavaScript

---

## ⚙️ Environment Variables

```env
PORT=5000
NODE_ENV=development
```

---

## 🧪 Testing

```bash
npm install
npm test
```
