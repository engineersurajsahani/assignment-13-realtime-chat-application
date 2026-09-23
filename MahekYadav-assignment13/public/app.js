const socket = io();

let username = "";
let currentRoom = "general";
let currentUsers = [];

const loginScreen = document.getElementById("loginScreen");
const chatScreen = document.getElementById("chatScreen");
const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const currentUser = document.getElementById("currentUser");
const messages = document.getElementById("messages");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const roomTitle = document.getElementById("roomTitle");
const userList = document.getElementById("userList");
const typing = document.getElementById("typing");
const recipient = document.getElementById("recipient");
const dmMessage = document.getElementById("dmMessage");
const sendDm = document.getElementById("sendDm");

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();

  username = usernameInput.value.trim();

  if (!username) return;

  socket.emit("user:login", {
    username,
    avatar: "avatar1.png"
  });
});

socket.on("user:loggedin", () => {
  loginScreen.classList.add("hidden");
  chatScreen.classList.remove("hidden");
  currentUser.textContent = `@${username}`;
  joinRoom("general");
});

function joinRoom(room) {
  currentRoom = room;
  roomTitle.textContent = `# ${room}`;
  messages.innerHTML = "";
  typing.textContent = "";

  document.querySelectorAll(".room-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.room === room);
  });

  socket.emit("room:join", { room });
}

document.querySelectorAll(".room-btn").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.room !== currentRoom) {
      socket.emit("room:leave", { room: currentRoom });
      joinRoom(button.dataset.room);
    }
  });
});

socket.on("room:history", ({ room, messages: history }) => {
  if (room !== currentRoom) return;

  messages.innerHTML = "";
  history.forEach(renderMessage);
  scrollToBottom();
});

socket.on("chat:receive", (message) => {
  if (message.room && message.room !== currentRoom) return;
  renderMessage(message);
  scrollToBottom();
});

function renderMessage(message) {
  const item = document.createElement("div");
  item.className = `message ${message.sender === username ? "mine" : ""}`;

  const header = document.createElement("div");
  header.className = "message-header";

  const sender = document.createElement("strong");
  sender.textContent = message.sender;

  const time = document.createElement("span");
  time.textContent = message.timestamp;

  const body = document.createElement("p");
  body.textContent = message.message;

  header.append(sender, time);
  item.append(header, body);
  messages.appendChild(item);
}

messageForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const message = messageInput.value.trim();
  if (!message) return;

  socket.emit("chat:send", {
    room: currentRoom,
    message
  });

  socket.emit("typing:stop", { room: currentRoom });
  messageInput.value = "";
});

let typingTimeout;

messageInput.addEventListener("input", () => {
  if (!messageInput.value.trim()) {
    socket.emit("typing:stop", { room: currentRoom });
    return;
  }

  socket.emit("typing:start", { room: currentRoom });

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit("typing:stop", { room: currentRoom });
  }, 1200);
});

socket.on("typing:update", ({ username: typingUser, isTyping }) => {
  if (isTyping) {
    typing.textContent = `${typingUser} is typing...`;
  } else if (typing.textContent.startsWith(typingUser)) {
    typing.textContent = "";
  }
});

socket.on("room:userlist", ({ room, users }) => {
  if (room !== currentRoom) return;

  currentUsers = users;
  userList.innerHTML = "";

  users.forEach((user) => {
    const item = document.createElement("li");
    item.textContent = user === username ? `${user} (you)` : user;
    userList.appendChild(item);
  });

  updateRecipientList();
});

function updateRecipientList() {
  recipient.innerHTML = "";

  currentUsers
    .filter((user) => user !== username)
    .forEach((user) => {
      const option = document.createElement("option");
      option.textContent = user;
      option.value = user;
      recipient.appendChild(option);
    });
}

sendDm.addEventListener("click", () => {
  const targetUsername = recipient.value;
  const message = dmMessage.value.trim();

  if (!targetUsername || !message) return;

  const target = [...socketIdsFromUsers()].find(
    (entry) => entry.username === targetUsername
  );

  if (target) {
    socket.emit("direct:send", {
      recipientId: target.socketId,
      message
    });
  }

  dmMessage.value = "";
});

function socketIdsFromUsers() {
  return [];
}

socket.on("direct:receive", ({ from, message, timestamp }) => {
  addSystemMessage(`DM from ${from}: ${message} (${timestamp})`);
});

socket.on("direct:sent", ({ to, message, timestamp }) => {
  addSystemMessage(`DM to ${to}: ${message} (${timestamp})`);
});

function addSystemMessage(text) {
  const item = document.createElement("div");
  item.className = "system-message";
  item.textContent = text;
  messages.appendChild(item);
  scrollToBottom();
}

function scrollToBottom() {
  messages.scrollTop = messages.scrollHeight;
}