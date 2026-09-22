(() => {
  const loginScreen = document.getElementById("loginScreen");
  const chatScreen = document.getElementById("chatScreen");
  const usernameInput = document.getElementById("usernameInput");
  const loginButton = document.getElementById("loginButton");

  const roomList = document.getElementById("roomList");
  const customRoomInput = document.getElementById("customRoomInput");
  const joinCustomRoomButton = document.getElementById("joinCustomRoomButton");

  const currentRoomLabel = document.getElementById("currentRoomLabel");
  const dmModeLabel = document.getElementById("dmModeLabel");
  const messagesEl = document.getElementById("messages");
  const typingIndicator = document.getElementById("typingIndicator");
  const messageInput = document.getElementById("messageInput");
  const sendButton = document.getElementById("sendButton");

  const userListEl = document.getElementById("userList");
  const cancelDmButton = document.getElementById("cancelDmButton");

  let socket = null;
  let username = "";
  let currentRoom = null;
  let dmTarget = null; // { userId, username } or null when chatting in a room
  let typingUsers = new Set();
  let isTyping = false;
  let typingTimeout = null;

  // ---------- login ----------

  loginButton.addEventListener("click", login);
  usernameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") login();
  });

  function login() {
    const name = usernameInput.value.trim();
    if (!name) {
      usernameInput.focus();
      return;
    }
    username = name;

    socket = io();
    socket.on("connect", () => {
      socket.emit("user:login", { username, avatar: "default.png" });
    });

    registerSocketListeners();

    loginScreen.classList.add("hidden");
    chatScreen.classList.remove("hidden");
  }

  // ---------- room switching ----------

  roomList.addEventListener("click", (e) => {
    if (!e.target.classList.contains("roomItem")) return;
    joinRoom(e.target.dataset.room);
  });

  joinCustomRoomButton.addEventListener("click", () => {
    const room = customRoomInput.value.trim();
    if (room) joinRoom(room);
  });

  function joinRoom(room) {
    dmTarget = null;
    dmModeLabel.classList.add("hidden");
    cancelDmButton.classList.add("hidden");

    currentRoom = room;
    currentRoomLabel.textContent = `#${room}`;
    messagesEl.innerHTML = "";
    typingUsers.clear();
    renderTypingIndicator();

    document.querySelectorAll(".roomItem").forEach((el) => {
      el.classList.toggle("active", el.dataset.room === room);
    });

    socket.emit("room:join", { room });
  }

  // ---------- sending ----------

  sendButton.addEventListener("click", sendMessage);
  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  messageInput.addEventListener("input", () => {
    if (!currentRoom || dmTarget) return; // typing indicator only applies to room chat

    if (!isTyping) {
      isTyping = true;
      socket.emit("typing:start", { room: currentRoom });
    }

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      isTyping = false;
      socket.emit("typing:stop", { room: currentRoom });
    }, 1000);
  });

  function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;

    if (dmTarget) {
      socket.emit("direct:send", { recipientId: dmTarget.userId, message: text });
      appendMessage({
        sender: `${username} (DM to ${dmTarget.username})`,
        message: text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isDm: true,
      });
    } else if (currentRoom) {
      socket.emit("chat:send", { room: currentRoom, message: text });
      clearTimeout(typingTimeout);
      isTyping = false;
      socket.emit("typing:stop", { room: currentRoom });
    }

    messageInput.value = "";
  }

  // ---------- DM targeting ----------

  userListEl.addEventListener("click", (e) => {
    const li = e.target.closest("li");
    if (!li) return;

    dmTarget = { userId: li.dataset.userId, username: li.dataset.username };
    dmModeLabel.textContent = `DM to ${dmTarget.username}`;
    dmModeLabel.classList.remove("hidden");
    cancelDmButton.classList.remove("hidden");
  });

  cancelDmButton.addEventListener("click", () => {
    dmTarget = null;
    dmModeLabel.classList.add("hidden");
    cancelDmButton.classList.add("hidden");
  });

  // ---------- rendering ----------

  function appendMessage({ sender, message, timestamp, isDm }) {
    const row = document.createElement("div");
    row.className = "messageRow";
    if (isDm) row.classList.add("dmMessage");
    row.innerHTML = `<span class="messageSender">${sender}:</span>${message}<span class="messageTime">${timestamp}</span>`;
    messagesEl.appendChild(row);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function renderTypingIndicator() {
    if (typingUsers.size === 0) {
      typingIndicator.textContent = "";
      return;
    }
    const names = Array.from(typingUsers).join(", ");
    typingIndicator.textContent = `${names} ${typingUsers.size === 1 ? "is" : "are"} typing...`;
  }

  function renderUserList(users) {
    userListEl.innerHTML = "";
    users.forEach((u) => {
      if (u.username === username) return; // don't let a user DM themselves
      const li = document.createElement("li");
      li.textContent = u.username;
      li.dataset.userId = u.userId;
      li.dataset.username = u.username;
      userListEl.appendChild(li);
    });
  }

  // ---------- socket listeners ----------

  function registerSocketListeners() {
    socket.on("room:history", ({ room, messages }) => {
      if (room !== currentRoom) return;
      messagesEl.innerHTML = "";
      messages.forEach((m) => appendMessage(m));
    });

    socket.on("chat:receive", (messageObj) => {
      appendMessage(messageObj);
    });

    socket.on("room:userlist", ({ room, users }) => {
      if (room !== currentRoom) return;
      renderUserList(users);
    });

    socket.on("typing:update", ({ username: typer, isTyping: typing }) => {
      if (typing) {
        typingUsers.add(typer);
      } else {
        typingUsers.delete(typer);
      }
      renderTypingIndicator();
    });

    socket.on("direct:receive", ({ from, fromId, message, timestamp }) => {
      appendMessage({
        sender: `${from} (DM)`,
        message,
        timestamp,
        isDm: true,
      });
    });
  }
})();
