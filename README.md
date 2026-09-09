# Assignment 13 - Real-Time Group Chat & Messaging Engine
https://saiyashpoojariassignment-13-realtime.onrender.com (Render URL)

## Overview

A real-time group chat and direct messaging application built using Node.js, Express.js and Socket.io.

The application supports multiple chat rooms, real-time messaging, typing indicators, active user presence tracking, private direct messages and recent message history.

## Features

- Real-time group messaging
- Multiple chat rooms
- Room joining and leaving
- Active user presence tracking
- Connected participant lists
- Real-time typing indicators
- Private direct messaging
- Recent message history
- Message history replay for new users
- Socket.io real-time communication
- In-memory message history storage
- Responsive chat interface

## Tech Stack

- Node.js
- Express.js
- Socket.io
- CORS
- dotenv
- HTML5
- CSS3
- JavaScript

## Project Structure

```text
Saiyash Poojari/
├── public/
│   ├── index.html
│   ├── app.js
│   └── style.css
├── sockets/
│   ├── chatHandler.js
│   └── userHandler.js
├── utils/
│   └── messageStore.js
├── package.json
├── package-lock.json
├── README.md
├── server.js
└── test-socket-client.js
