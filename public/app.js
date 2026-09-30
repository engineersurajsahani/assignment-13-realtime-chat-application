const socket = io();

let currentRoom = "general";
let loggedIn = false;
let typingTimeout;

const usernameInput = document.getElementById("username");
const avatarInput = document.getElementById("avatar");
const loginBtn = document.getElementById("loginBtn");

const roomTitle = document.getElementById("roomTitle");
const status = document.getElementById("status");

const messagesContainer = document.getElementById("messages");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");

const typingIndicator = document.getElementById("typingIndicator");
const userList = document.getElementById("userList");

const recipientIdInput = document.getElementById("recipientId");
const dmInput = document.getElementById("dmInput");
const dmBtn = document.getElementById("dmBtn");


// LOGIN
loginBtn.addEventListener("click", () => {
  const username = usernameInput.value.trim();
  const avatar = avatarInput.value.trim();

  if (!username) {
    alert("Please enter a username");
    return;
  }

  socket.emit("user:login", {
    username,
    avatar
  });
});


// LOGIN SUCCESS
socket.on("user:loggedin", (data) => {
  loggedIn = true;

  status.textContent = `Logged in as ${data.username}`;

  usernameInput.disabled = true;
  avatarInput.disabled = true;
  loginBtn.disabled = true;

  joinRoom(currentRoom);
});


// JOIN ROOM
function joinRoom(room) {
  if (!loggedIn) {
    alert("Please login first");
    return;
  }

  currentRoom = room;

  roomTitle.textContent = `# ${room}`;

  messagesContainer.innerHTML = "";

  socket.emit("room:join", {
    room
  });

  socket.emit("room:history", {
    room
  });
}


// ROOM BUTTONS
document.querySelectorAll(".room-btn").forEach((button) => {
  button.addEventListener("click", () => {
    joinRoom(button.dataset.room);
  });
});


// RECEIVE MESSAGE
socket.on("chat:receive", (message) => {
  addMessage(message);
});


// DISPLAY MESSAGE
function addMessage(message) {
  const messageElement = document.createElement("div");

  messageElement.className = "message";

  messageElement.innerHTML = `
    <div class="message-header">
      <strong>${escapeHtml(message.sender)}</strong>
      <span>${message.timestamp}</span>
    </div>

    <div class="message-text">
      ${escapeHtml(message.message)}
    </div>
  `;

  messagesContainer.appendChild(messageElement);

  messagesContainer.scrollTop =
    messagesContainer.scrollHeight;
}


// SEND MESSAGE
messageForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!loggedIn) {
    alert("Please login first");
    return;
  }

  const message = messageInput.value.trim();

  if (!message) {
    return;
  }

  socket.emit("chat:send", {
    room: currentRoom,
    message
  });

  messageInput.value = "";

  socket.emit("typing:stop", {
    room: currentRoom
  });
});


// TYPING START
messageInput.addEventListener("input", () => {
  if (!loggedIn) {
    return;
  }

  socket.emit("typing:start", {
    room: currentRoom
  });

  clearTimeout(typingTimeout);

  typingTimeout = setTimeout(() => {
    socket.emit("typing:stop", {
      room: currentRoom
    });
  }, 1000);
});


// TYPING UPDATE
socket.on("typing:update", (data) => {
  if (data.isTyping) {
    typingIndicator.textContent =
      `${data.username} is typing...`;
  } else {
    typingIndicator.textContent = "";
  }
});


// ROOM USER LIST
socket.on("room:userlist", (data) => {
  if (data.room !== currentRoom) {
    return;
  }

  userList.innerHTML = "";

  data.users.forEach((username) => {
    const li = document.createElement("li");

    li.textContent = `🟢 ${username}`;

    userList.appendChild(li);
  });
});


// ROOM HISTORY
socket.on("room:history", (data) => {
  if (data.room !== currentRoom) {
    return;
  }

  messagesContainer.innerHTML = "";

  data.messages.forEach((message) => {
    addMessage(message);
  });
});


// SEND DIRECT MESSAGE
dmBtn.addEventListener("click", () => {
  const recipientId = recipientIdInput.value.trim();
  const message = dmInput.value.trim();

  if (!recipientId || !message) {
    alert("Enter recipient socket ID and message");
    return;
  }

  socket.emit("direct:send", {
    recipientId,
    message
  });

  dmInput.value = "";
});


// RECEIVE DIRECT MESSAGE
socket.on("direct:receive", (data) => {
  const messageElement = document.createElement("div");

  messageElement.className = "direct-message";

  messageElement.innerHTML = `
    <strong>🔒 DM from ${escapeHtml(data.from)}</strong>
    <p>${escapeHtml(data.message)}</p>
    <small>${data.timestamp}</small>
  `;

  messagesContainer.appendChild(messageElement);

  messagesContainer.scrollTop =
    messagesContainer.scrollHeight;
});


// ERROR
socket.on("error", (error) => {
  console.error(error);

  if (error && error.message) {
    alert(error.message);
  }
});


// SOCKET CONNECTION
socket.on("connect", () => {
  console.log("Connected:", socket.id);
});

socket.on("disconnect", () => {
  status.textContent = "Disconnected";
});


// BASIC HTML ESCAPING
function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}