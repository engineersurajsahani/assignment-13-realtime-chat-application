# Assignment 13 - Real-Time Group Chat & Messaging Engine

## 🚀 Live Demo

**https://chat-socket-hrcm.onrender.com/**

A real-time multi-room chat application built with Node.js, Express.js, Socket.io, CORS and an in-memory message history store.

## Features

* User login and socket identity mapping
* Multiple chat rooms: `general`, `developers`, `random`
* Room join and leave events
* Real-time group messaging
* Active participant roster
* Typing indicators with debounce/timeout handling
* Last 50 messages stored per room
* History replay when joining a room
* Direct messaging support
* Dark responsive chat UI

## Project Structure

```text
assignment-13-chat-socket/
├── public/
│   ├── index.html
│   ├── app.js
│   └── style.css
├── sockets/
│   ├── chatHandler.js
│   └── userHandler.js
├── utils/
│   └── messageStore.js
├── server.js
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## Installation

```bash
npm install
```

Create a `.env` file:

```env
PORT=5000
```

## Run

### Development Mode

```bash
npm run dev
```

### Normal Mode

```bash
npm start
```

Open:

```text
http://localhost:5000
```

## Testing

1. Open three browser tabs.
2. Login as Aarav, Priya and Rohan.
3. Put Aarav and Priya in `developers`.
4. Put Rohan in `random`.
5. Type as Aarav and verify Priya sees the typing indicator while Rohan does not.
6. Send messages in `developers`.
7. Open another tab and join `developers` to verify the recent message history is replayed.
8. Test direct messaging and verify the message is private.

## Note

The server keeps chat state in memory, so restarting the server clears connected users and chat history.

## Submission

**Repository Name:**

```text
itm-assignment-13-chat-socket
```

**Live Deployment:**

```text
https://chat-socket-hrcm.onrender.com/
```

### Demo Video

Record a 1-minute video demonstrating:

* Multi-room group chat
* Real-time messaging
* Typing indicators
* Active participant presence
* Message history replay
* Private direct messaging
