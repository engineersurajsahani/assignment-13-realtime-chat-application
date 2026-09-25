

const socket = io();

const loginScreen = document.getElementById("login-screen");
const chatScreen = document.getElementById("chat-screen");
const usernameInput = document.getElementById("username-input");
const loginBtn = document.getElementById("login-btn");
const loginError = document.getElementById("login-error");

const roomListEl = document.getElementById("room-list");
const userListEl = document.getElementById("user-list");
const userCountEl = document.getElementById("user-count");
const meUsernameEl = document.getElementById("me-username");

const currentRoomLabel = document.getElementById("current-room-label");
const typingIndicator = document.getElementById("typing-indicator");
const messagesEl = document.getElementById("messages");

const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");

let myUsername = null;
let currentRoom = "general";
let typingTimeout = null;
const TYPING_DEBOUNCE_MS = 1200;
const socketIdByUsername = new Map();

loginBtn.addEventListener("click", attemptLogin);
usernameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") attemptLogin();
});

function attemptLogin() {
  const username = usernameInput.value.trim();
  if (!username) {
    loginError.textContent = "Please enter a username.";
    return;
  }
  socket.emit("user:login", { username, avatar: "avatar1.png" });
}

socket.on("user:loggedIn", ({ username }) => {
  myUsername = username;
  meUsernameEl.textContent = `Signed in as ${username}`;
  loginScreen.classList.add("hidden");
  chatScreen.classList.remove("hidden");
  joinRoom(currentRoom);
});

socket.on("error:message", ({ message }) => {
  loginError.textContent = message;
});

roomListEl.addEventListener("click", (e) => {
  const item = e.target.closest(".room-item");
  if (!item) return;
  const room = item.dataset.room;
  if (room === currentRoom) return;

  document.querySelectorAll(".room-item").forEach((el) => el.classList.remove("active"));
  item.classList.add("active");

  joinRoom(room);
});

function joinRoom(room) {
  currentRoom = room;
  currentRoomLabel.textContent = `#${room}`;
  messageInput.placeholder = `Message #${room}`;
  messagesEl.innerHTML = "";
  typingIndicator.textContent = "";
  socket.emit("room:join", { room });
}

socket.on("room:history", ({ room, messages }) => {
  if (room !== currentRoom) return;
  messagesEl.innerHTML = "";
  messages.forEach(renderMessage);
  scrollToBottom();
});

socket.on("chat:receive", (data) => {
  if (data.room !== currentRoom) return;
  renderMessage(data);
  scrollToBottom();
});

socket.on("room:systemMessage", ({ room, text }) => {
  if (room !== currentRoom) return;
  const el = document.createElement("div");
  el.className = "msg system";
  el.textContent = text;
  messagesEl.appendChild(el);
  scrollToBottom();
});

function renderMessage(data) {
  const el = document.createElement("div");
  const isMe = data.sender === myUsername;
  el.className = `msg ${isMe ? "me" : "other"}`;
  el.innerHTML = `
    <div class="meta">${isMe ? "You" : escapeHtml(data.sender)} · ${data.timestamp}</div>
    <div>${escapeHtml(data.message)}</div>
  `;
  messagesEl.appendChild(el);
}

socket.on("room:userlist", ({ room, users }) => {
  if (room !== currentRoom) return;
  userCountEl.textContent = users.length;
  userListEl.innerHTML = "";
  users.forEach((username) => {
    const li = document.createElement("li");
    li.textContent = username === myUsername ? `${username} (you)` : username;
    userListEl.appendChild(li);
  });
});

messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = messageInput.value.trim();
  if (!message) return;

  socket.emit("chat:send", { room: currentRoom, message });
  socket.emit("typing:stop", { room: currentRoom });
  messageInput.value = "";
  clearTimeout(typingTimeout);
});

messageInput.addEventListener("input", () => {
  socket.emit("typing:start", { room: currentRoom });
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit("typing:stop", { room: currentRoom });
  }, TYPING_DEBOUNCE_MS);
});

socket.on("typing:update", ({ username, isTyping }) => {
  if (username === myUsername) return;
  typingIndicator.textContent = isTyping ? `${username} is typing…` : "";
});

socket.on("direct:receive", (data) => {
  const el = document.createElement("div");
  el.className = "msg dm";
  if (data.toSelf) {
    el.textContent = `You → DM: "${data.message}"`;
  } else {
    el.textContent = `${data.from} → DM: "${data.message}"`;
  }
  messagesEl.appendChild(el);
  scrollToBottom();
});

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
