# 💬 Assignment 13: Real-Time Group Chat & Messaging Engine (Socket.io)

A working implementation of the real-time group chat & direct messaging engine, built with **Node.js**, **Express.js**, and **Socket.io**.

## Features

- Multi-room chat (`#general`, `#developers`, `#random`, `#gaming`, `#tech`)
- Real-time group messaging with `chat:send` / `chat:receive`
- Private direct messages via `direct:send` / `direct:receive`
- Debounced typing indicators (`typing:start` / `typing:stop` / `typing:update`)
- Active user presence roster per room (`room:userlist`)
- In-memory message history (last 50 messages per room), replayed to new joiners via `room:history`
- System notifications when users join/leave/disconnect

## Project Structure

```
chat-app/
├── public/
│   ├── index.html      # Multi-room chat UI with dark theme
│   ├── app.js           # Client socket event listeners & UI updates
│   └── style.css        # Chat bubbles, sidebar, user list styling
├── sockets/
│   ├── chatHandler.js    # Room messaging, DM & typing handlers
│   └── userHandler.js    # User login, room join/leave & disconnects
├── utils/
│   └── messageStore.js   # In-memory message history management
├── server.js              # Express & Socket.io server bootstrap
├── package.json
├── .env.example
└── README.md
```

## Setup

```bash
# Install dependencies
npm install

# Copy env file (optional — defaults to port 5000)
cp .env.example .env

# Start the server
npm start

# Or with auto-reload during development
npm run dev
```

Then open **http://localhost:5000** in your browser.

## Testing / Validation

1. Start the server (`npm start`).
2. Open three browser tabs and log in as three different usernames (e.g. Aarav, Priya, Rohan).
3. Have Aarav and Priya join `#developers`, while Rohan joins `#random`.
4. Type in `#developers` as Aarav — Priya should see "Aarav is typing…"; Rohan (in `#random`) sees nothing.
5. Send messages in `#developers` — Priya receives them instantly.
6. Open a fourth tab, join `#developers` — the last 50 messages are hydrated immediately from history.
7. To test a direct message, open your browser console and run:
   ```js
   socket.emit("direct:send", { recipientId: "<target-socket-id>", message: "Secret DM" });
   ```
   (Socket IDs are logged server-side on connection, or you can extend the UI to expose them per user.)

## Socket Event Protocol

See the full event tables (session/room management and messaging/indicators) in the original assignment spec — all events listed there (`user:login`, `room:join`, `room:history`, `room:userlist`, `room:leave`, `chat:send`, `chat:receive`, `typing:start`, `typing:stop`, `typing:update`, `direct:send`, `direct:receive`) are implemented in `sockets/userHandler.js` and `sockets/chatHandler.js`.
