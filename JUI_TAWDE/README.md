# PHX — Premium Real-Time Chat

A polished Socket.io assignment implementation covering public rooms, presence, typing indicators, DMs, private groups, invitation codes, unread badges, history replay and responsive UI.

## Run

```bash
npm install
npm run dev
```

Then open:

http://localhost:5000

For a production-style run:

```bash
npm start
```

## Assignment event coverage

### Session / rooms
- `user:login`
- `room:join`
- `room:leave`
- `room:history`
- `room:userlist`

### Messaging / typing
- `chat:send`
- `chat:receive`
- `typing:start`
- `typing:stop`
- `typing:update`

### Direct messaging
- `direct:history`
- `direct:send`
- `direct:receive`

### Private groups
- `group:create`
- `group:join`
- `group:leave`
- `group:history`
- `group:userlist`
- `group:added`
- `group:removed`

## Architecture

```text
itm-assignment-13-chat-socket/
├── public/
│   ├── index.html
│   ├── app.js
│   └── style.css
├── sockets/
│   ├── userHandler.js
│   ├── roomHandler.js
│   ├── chatHandler.js
│   ├── directHandler.js
│   └── groupHandler.js
├── utils/
│   ├── messageStore.js
│   └── groupStore.js
├── server.js
├── package.json
├── .env.example
└── README.md
```

## Notes

- The history store keeps the latest 50 messages per room/group/DM conversation.
- State is intentionally in-memory for the assignment, so a server restart resets messages, presence and private groups.
- Private groups are server-authorized by membership and invitation code.
- DM delivery uses the recipient socket id and is never broadcast to a room.
- Typing indicators are scoped to the active Socket.io room and automatically stop after a debounce timeout.
- Attach and emoji controls are included in the UI; the attachment button is intentionally a visual affordance for this assignment and does not upload files.
- For a database-backed version, replace the in-memory maps in `utils/` with Redis/PostgreSQL/MongoDB while keeping the socket handlers largely unchanged.

## Suggested demo

Open 3–4 tabs:
1. Aarav → `#developers`
2. Priya → `#developers`
3. Rohan → `#random`
4. Optional fourth user → `#developers`

Test:
- typing isolation
- room-only messages
- history replay
- DM privacy
- create a private group
- copy invitation code
- join with another tab
- unread indicators
- reconnect by stopping/starting the server
