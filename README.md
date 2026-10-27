# Chatterly — Real-Time Chat Application

**Connect. Converse. Collaborate.**

Chatterly is a full-stack real-time chat application designed to make digital conversations more interactive and organized. It brings together messaging, group conversations, profile management, file uploads, notifications, and AI-powered chat utilities in one application.

🌐 **Live Demo:** https://chatterly-self.vercel.app  
💚 **Health Check:** https://chatterly-ql6l.onrender.com/api/health

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Application Architecture](#-application-architecture)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Running the Application](#-running-the-application)
- [API Overview](#-api-overview)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [Future Improvements](#-future-improvements)
- [Contributing](#-contributing)
- [Author](#-author)

---

## 🚀 Overview

Chatterly is built with a React and TypeScript frontend, supported by a Node.js and Express backend written in TypeScript.

The application combines a responsive chat interface with backend services for authentication, conversations, messages, user profiles, uploads, notifications, moderation, and AI-assisted interactions.

The project focuses on:

- Real-time communication.
- Organized one-to-one and group conversations.
- Message interaction and management.
- User profiles and avatar handling.
- Extensible backend APIs.
- A deployment-ready frontend and backend architecture.

## ✨ Features

### 🔐 Authentication and User Accounts

- User registration and login.
- Authentication-related API services.
- User profile retrieval and updates.
- Profile avatar support.
- Axios-based communication between the frontend and backend.

### 💬 Conversations and Messaging

- Direct conversations between users.
- Group conversation support.
- Conversation listing and management.
- Message sending and retrieval through backend services.
- Message editing and deletion.
- Message reactions.
- Message pinning for important messages.

### 👥 User and Profile Management

- User-related API operations.
- Profile information management.
- Avatar URL handling and image display.
- User search functionality.
- User blocking functionality.

### 📎 File Uploads and Media

- Upload-related backend services.
- Support for media and uploaded-file workflows.
- Profile image and avatar support.
- Backend static-file serving for uploaded assets.

### 🔔 Notifications

- Notification-related API services.
- Backend integration for notification workflows.

### 🛡️ Moderation

- Moderation-related backend services.
- Support for extending chat safety and content-management workflows.

### 🤖 AI-Powered Utilities

Chatterly includes AI-related API services designed to support:

- **Chat summarization:** helping condense conversation content.
- **AI chat interactions:** enabling AI-assisted conversational workflows.

### 🎨 User Interface

- A dedicated authentication experience.
- A branded Chatterly sidebar banner.
- A chat-oriented interface.
- Reusable React components.
- TypeScript for clearer component and service contracts.
- Vite-powered frontend development and builds.

<img width="1470" height="882" alt="Screenshot 2026-10-28 at 12 40 18 AM" src="https://github.com/user-attachments/assets/689cc4e9-5779-499e-bcf0-362c1a0fdbba" />

<img width="1470" height="885" alt="Screenshot 2026-10-27 at 2 53 17 AM" src="https://github.com/user-attachments/assets/9237125e-663c-4dbb-963b-d1d91148dbf5" />

<img width="1468" height="879" alt="Screenshot 2026-10-27 at 2 53 54 AM" src="https://github.com/user-attachments/assets/4b909df6-ea71-429e-9401-36c5521ba487" />

<img width="1469" height="882" alt="Screenshot 2026-10-28 at 12 23 57 AM" src="https://github.com/user-attachments/assets/d9984af1-056b-4ef5-8765-706e20ca1f07" />

<img width="1469" height="883" alt="Screenshot 2026-10-27 at 3 09 05 AM" src="https://github.com/user-attachments/assets/631494c7-b0b1-4ffb-a888-85a0c203b14d" />

<img width="1470" height="885" alt="Screenshot 2026-10-27 at 3 10 44 AM" src="https://github.com/user-attachments/assets/e21db707-6410-4d12-ac5d-6c3fdff25290" />

<img width="1470" height="883" alt="Screenshot 2026-10-27 at 3 10 13 AM" src="https://github.com/user-attachments/assets/5ae148a8-e4f6-45e5-a5ce-5f2564caafee" />

---

## 🧰 Technology Stack

## Frontend

| Technology | Usage |
|---|---|
| React 18 | Component-based user interface |
| TypeScript 5 | Typed frontend code |
| Vite 6 | Development server and production bundler |
| React Router DOM 7 | Routing dependency |
| TanStack React Query 5 | Server-state and query caching |
| React Context | Authentication, theme, and Socket.IO state |
| Axios | HTTP client and API services |
| Socket.IO Client 4 | Real-time communication |
| Lucide React | Interface icons |
| Zod | Schema validation utilities |
| React Easy Crop | Avatar/image cropping interface |
| CSS custom properties | Design tokens, themes, and styling |

## Backend

| Technology | Usage |
|---|---|
| Node.js | JavaScript runtime |
| TypeScript 5 | Typed backend code |
| Express 4 | HTTP API and middleware |
| MongoDB | Application database |
| Mongoose 8 | MongoDB object modeling |
| Socket.IO 4 | Real-time events, rooms, presence, and chat updates |
| JSON Web Token (`jsonwebtoken`) | Token-based authentication |
| `bcryptjs` | Password hashing |
| `cookie-parser` | Cookie parsing |
| `cors` | Cross-origin access configuration |
| Helmet | HTTP security headers |
| `express-rate-limit` | Authentication endpoint rate limiting |
| Multer | Avatar and attachment uploads |
| Zod | Request payload validation |
| Pino / Pino Pretty | Structured and readable logs |
| `dotenv` | Environment configuration |
| Google Gemini API (`@google/genai` dependency and Gemini REST integration) | AI chat and conversation summaries when configured |

---

## 🏗️ Application Architecture

Chatterly uses a client-server architecture.

```text
                 ┌─────────────────────────┐
                 │       Chatterly UI      │
                 │    React + TypeScript   │
                 │       Vite Client       │
                 └────────────┬────────────┘
                              │
                  ┌───────────┴───────────┐
                  │                       │
             REST API               Socket.IO
                  │                       │
                  └───────────┬───────────┘
                              │
                 ┌────────────▼────────────┐
                 │     Express Backend     │
                 │      Node.js + TS       │
                 ├─────────────────────────┤
                 │ Authentication Services │
                 │ Conversation Services   │
                 │ Message Services        │
                 │ Uploads and Profiles    │
                 │ Notifications           │
                 │ Moderation and AI APIs  │
                 └────────────┬────────────┘
                              │
                 ┌────────────▼────────────┐
                 │ Data and File Storage   │
                 │ Configured by Deployment│
                 └─────────────────────────┘
```

**How it works:**

1. The user interacts with the React frontend.
2. Axios sends HTTP requests to the Express API.
3. Socket.IO provides the real-time communication layer.
4. Backend services process authentication, conversations, messages, uploads, and other supported operations.
5. Data and uploaded files are handled by the storage systems configured for the application.

---

## 📁 Project Structure

The repository is organized into separate frontend and backend applications.

```text
realtime-chat-app/
│
├── client/
│   ├── public/
│   │   └── images/
│   ├── src/
│   │   ├── components/
│   │   │   └── ui/
│   │   │       └── Avatar.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   └── ...
│   ├── .env.example
│   ├── package.json
│   └── vite.config.ts
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── sockets/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── validators/
│   │   ├── app.ts
│   │   └── server.ts
│   ├── package.json
│   └── ...
│
└── README.md
```

---

## ⚙️ Getting Started

### Prerequisites

Install the following before running Chatterly locally:

- [Node.js](https://nodejs.org/) — use a version supported by the project.
- npm, included with Node.js.
- Git.
- A configured backend database and any external services required by the application.

### 1. Clone the Repository

```bash
git clone https://github.com/juitawde/realtime-chat-app.git
cd realtime-chat-app
```

### 2. Install Frontend Dependencies

```bash
cd client
npm install
```

### 3. Install Backend Dependencies

Open another terminal:

```bash
cd server
npm install
```

### 4. Configure Environment Variables

Create the required `.env` files using the project's existing environment-variable examples or configuration.

For the frontend, create:

```text
client/.env
```

For the backend, create the environment file expected by the server configuration, typically:

```text
server/.env
```

Do not commit real credentials, private keys, tokens, or production secrets.

### 5. Start the Backend

From the `server` directory, use the development script defined in its `package.json`. For example, if the project defines `dev`:

```bash
npm run dev
```

### 6. Start the Frontend

From the `client` directory:

```bash
npm run dev
```

Open the local URL printed by Vite in the terminal, commonly `http://localhost:5173`.

---

## 🔑 Environment Variables

### Frontend

Configure the following variables in `client/.env`:

```env
# Backend REST API base URL
VITE_API_URL=http://localhost:5000/api

# Backend Socket.IO server URL
VITE_SOCKET_URL=http://localhost:5000
```

These local values assume that the backend runs on port `5000`. If your backend uses another port, update both URLs accordingly.

For the deployed frontend, configure:

```env
VITE_API_URL=https://chatterly-ql6l.onrender.com/api
VITE_SOCKET_URL=https://chatterly-ql6l.onrender.com
```

**Important:** `VITE_API_URL` must include `/api` because the frontend's API service uses endpoint paths such as `/auth/login` relative to that base URL.

### Backend

Configure the variables required by the backend's existing configuration, such as:

- Server port.
- Database connection string.
- Authentication or token secrets.
- Allowed frontend origins.
- Upload directory or persistent storage settings.
- AI provider credentials, if required.
- Any external service keys used by the application.

Use the exact variable names expected by the code in `server/src/config/` and the backend's environment example. Do not copy guessed variable names into production.

---

## 🔌 API Overview

The backend exposes API services for the following areas:

| Area | Supported operations |
|---|---|
| Authentication | Registration, login, and related account operations |
| Users | Profile operations, avatar handling, and user search |
| Conversations | Direct and group conversation workflows |
| Messages | Message operations, editing, deletion, reactions, and pinning |
| Uploads | Uploaded-file workflows |
| Notifications | Notification-related operations |
| Moderation | Moderation-related workflows |
| AI | Chat and summarization endpoints |
| Health | Backend health check |

### Health Check

The deployed health endpoint is:

```http
GET https://chatterly-ql6l.onrender.com/api/health
```

### API Base URL

```text
Production: https://chatterly-ql6l.onrender.com/api
Local:      http://localhost:5000/api
```

The exact route names, request payloads, validation rules, and response schemas are defined in the backend route, controller, and validator files.

---

## 🌍 Deployment

Chatterly's current deployment separates the frontend and backend.

### Frontend — Vercel

Live application: https://chatterly-self.vercel.app

Typical Vercel configuration:

- **Root directory:** `client`
- **Framework:** Vite
- **Build command:** `npm run build`
- **Output directory:** `dist`

Configure the production environment variables:

```env
VITE_API_URL=https://chatterly-ql6l.onrender.com/api
VITE_SOCKET_URL=https://chatterly-ql6l.onrender.com
```

Redeploy the frontend after changing its environment variables.

### Backend — Render

Backend URL: https://chatterly-ql6l.onrender.com

Configure Render to build and start the backend using the scripts defined in `server/package.json`. A typical TypeScript deployment uses a build step followed by the compiled server entry point, but the exact start command must match the repository's scripts.

Ensure the backend configuration includes:

- The production frontend origin in its CORS configuration.
- Valid database connectivity.
- Required secrets and provider credentials.
- Correct upload paths and persistent storage configuration.
- Working REST API and Socket.IO connectivity.

---

## 🧪 Build and Verification

Before publishing changes, verify the frontend and backend separately.

### Frontend

```bash
cd client
npm install
npm run build
```

### Backend

```bash
cd server
npm install
npm run build
```

The backend TypeScript build has previously completed successfully in this project. Re-run both builds after making changes.

Also verify the main user workflows:

- Register and log in.
- Load the user profile and avatar.
- Open direct and group conversations.
- Send and retrieve messages.
- Edit, delete, react to, and pin messages.
- Test uploads and image URLs.
- Check notifications and moderation flows.
- Test AI endpoints when their required configuration is available.
- Verify Socket.IO connectivity on the deployed site.

---


## 🗺️ Future Improvements

Potential areas for further development include:

- Automated tests for authentication, conversations, messages, and uploads.
- Clear API documentation and request/response examples.
- Improved accessibility and responsive behavior.
- Additional moderation controls and error handling.
- Monitoring and structured backend logging.
- Better loading, empty, and failure states across the UI.

These are potential improvements, not claims that every item is already implemented.

---

## 🤝 Contributing

Contributions, bug reports, and suggestions are welcome.

1. Fork the repository.
2. Create a feature branch:

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. Make your changes and test them.
4. Commit your changes:

   ```bash
   git add .
   git commit -m "feat: describe your change"
   ```

5. Push the branch:

   ```bash
   git push origin feature/your-feature-name
   ```

6. Open a pull request describing the changes.

Please avoid committing secrets, generated build files, local environment files, or uploaded user content.

---

## 👩‍💻 Author

**Jui Tawde**

- LinkedIn: [View LinkedIn](www.linkedin.com/in/jui-tawde-788210385)
- Portfolio: [View Portfolio](https://portfolio-react-mauve-xi.vercel.app/)

If you find Chatterly interesting, consider giving the repository a ⭐ on GitHub!

---

## 📄 License

Copyright © 2026 Jui Tawde. All rights reserved.

Chatterly is distributed under a custom, restrictive license.
Forking and modification are permitted only under the terms
of the [LICENSE](./LICENSE) file.

Attribution to the original author and a link to the original
repository are required. Commercial use, redistribution outside
the permitted fork, and other uses require prior written permission.

---

**Built with React, TypeScript, Node.js, Express, and Socket.IO.**

*Chatterly — making conversations more connected.*
