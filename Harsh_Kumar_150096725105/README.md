# 💬 Real-Time Group Chat & Messaging Engine

A scalable Real-Time Group Chat & Direct Messaging Engine using Node.js, Express.js, and Socket.io.

## 👨‍🎓 Student Details

**Name:** Harsh Kumar  
**Roll No.:** 150096725105  
**Course:** BTech CSE  
**Assignment:** 13 — Real-Time Group Chat & Messaging Engine (Socket.io)  

## ✨ Features

- **Multi-Channel Chat:** Dynamic room creation and management (`#general`, `#developers`, `#random`).
- **Direct Messaging:** Private 1-on-1 messaging independent of chat rooms.
- **Typing Indicators:** Real-time debounced typing indicator states.
- **Presence Tracking:** Tracks real-time user presence and maintains connected participant rosters.
- **History Hydration:** Caches recent chat history buffers (last 50 messages) and hydrates new joiners instantly.

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js
- **Real-Time Engine:** Socket.io
- **Frontend:** Vanilla JS, HTML, CSS (Dark Theme)

## 📁 Project Structure

```text
Harsh-Assignment-13-Realtime-Chat-Application/
├── public/
│   ├── index.html           # Multi-room chat UI with dark theme
│   ├── app.js               # Client socket event listeners & UI updates
│   └── style.css            # Chat bubbles, sidebar, user list styling
├── sockets/
│   ├── chatHandler.js       # Room messaging, DM & typing handlers
│   └── userHandler.js       # User login, room join/leave & disconnects
├── utils/
│   └── messageStore.js      # Message history management
├── .env.example
├── .gitignore
├── package.json
└── server.js                # Express & Socket.io server bootstrap
```

## 🚀 Getting Started

### Prerequisites

- Node.js installed on your machine

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/harsh4421/Harsh-Assignment-13-Realtime-Chat-Application.git
   ```

2. Navigate to the project directory:
   ```bash
   cd Harsh-Assignment-13-Realtime-Chat-Application
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the server:
   ```bash
   npm start
   ```

   For development with nodemon:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5000`. You can open multiple tabs to test the real-time chat, typing indicators, and rooms.
