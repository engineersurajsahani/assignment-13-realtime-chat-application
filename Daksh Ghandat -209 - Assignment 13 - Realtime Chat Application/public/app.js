(() => {
  const socket = io();

  const state = {
    me: null,
    currentRoom: "general",
    rooms: [],
    users: new Map(),
    typingUsers: new Map(),
    dmTarget: null,
    dms: new Map(),
    dmUnread: new Map(),
    selectedAvatar: "avatar1.svg",
  };

  let typingTimer = null;
  let isTypingEmitting = false;

  const $ = (sel) => document.querySelector(sel);

  const els = {
    overlay: $("#loginOverlay"),
    app: $("#app"),
    loginForm: $("#loginForm"),
    usernameInput: $("#usernameInput"),
    avatarPicker: $("#avatarPicker"),
    connBadge: $("#connectionBadge"),
    roomList: $("#roomList"),
    userList: $("#userList"),
    onlineCount: $("#onlineCount"),
    meAvatar: $("#meAvatar"),
    meName: $("#meName"),
    meRoom: $("#meRoom"),
    roomTitle: $("#roomTitle"),
    roomMembers: $("#roomMembers"),
    welcomeRoom: $("#welcomeRoom"),
    messages: $("#messages"),
    typingIndicator: $("#typingIndicator"),
    typingText: $("#typingText"),
    messageForm: $("#messageForm"),
    messageInput: $("#messageInput"),
    dmPanel: $("#dmPanel"),
    dmAvatar: $("#dmAvatar"),
    dmName: $("#dmName"),
    dmMessages: $("#dmMessages"),
    dmForm: $("#dmForm"),
    dmInput: $("#dmInput"),
    dmClose: $("#dmClose"),
    toast: $("#toast"),
  };

  /* ---------------- helpers ---------------- */

  const avatarUrl = (avatar) => (avatar ? `avatars/${avatar}` : null);

  const renderAvatar = (imgEl, avatar, name, size) => {
    const url = avatarUrl(avatar);
    if (url) {
      imgEl.src = url;
      imgEl.classList.remove("fallback");
      imgEl.alt = name;
      return;
    }
    imgEl.classList.add("fallback");
    imgEl.removeAttribute("src");
    imgEl.textContent = (name || "?").charAt(0).toUpperCase();
  };

  const scrollToBottom = (container) => {
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  };

  const showToast = (message) => {
    els.toast.textContent = message;
    els.toast.classList.remove("hidden");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => els.toast.classList.add("hidden"), 2800);
  };

  const fmtTime = (ts) => ts || new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const buildMessageEl = (msg) => {
    const mine = state.me && msg.sender === state.me.username;

    const el = document.createElement("div");
    el.className = `msg${mine ? " mine" : ""}`;

    const avatarEl = document.createElement("img");
    avatarEl.className = "avatar sm";
    renderAvatar(avatarEl, msg.avatar, msg.sender, "sm");

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    const head = document.createElement("div");
    head.className = "msg-head";
    const sender = document.createElement("span");
    sender.className = "msg-sender";
    sender.textContent = mine ? "You" : msg.sender;
    const time = document.createElement("span");
    time.className = "msg-time";
    time.textContent = fmtTime(msg.timestamp);
    head.append(sender, time);

    const text = document.createElement("div");
    text.className = "msg-text";
    text.textContent = msg.message;

    bubble.append(head, text);
    el.append(avatarEl, bubble);
    return el;
  };

  const buildSystemEl = (sys) => {
    const el = document.createElement("div");
    el.className = "msg system";
    const span = document.createElement("span");
    span.className = "sys-text";
    span.textContent = sys.text || sys;
    el.append(span);
    return el;
  };

  const renderTyping = () => {
    const names = Array.from(state.typingUsers.values());
    if (names.length === 0) {
      els.typingIndicator.classList.add("hidden");
      return;
    }
    els.typingText.textContent = `${names.join(", ")} ${names.length > 1 ? "are" : "is"} typing…`;
    els.typingIndicator.classList.remove("hidden");
  };

  /* ---------------- rendering ---------------- */

  const renderRooms = () => {
    els.roomList.innerHTML = "";
    for (const room of state.rooms) {
      const li = document.createElement("li");
      li.className = `room-item${room === state.currentRoom ? " active" : ""}`;
      li.innerHTML = `<span class="room-hash">#</span><span>${room}</span>`;
      li.addEventListener("click", () => joinRoom(room));
      els.roomList.append(li);
    }
  };

  const renderUsers = () => {
    els.userList.innerHTML = "";
    const users = Array.from(state.users.values());
    els.onlineCount.textContent = users.length;
    els.roomMembers.textContent = `${users.length} online`;

    for (const user of users) {
      const li = document.createElement("li");
      const isSelf = state.me && user.socketId === state.me.socketId;
      li.className = `user-item${isSelf ? " self" : ""}`;
      li.dataset.username = user.username;

      const img = document.createElement("img");
      img.className = "avatar sm";
      renderAvatar(img, user.avatar, user.username, "sm");

      const name = document.createElement("span");
      name.className = "user-name";
      name.textContent = user.username;
      if (isSelf) name.textContent += " (you)";

      const dot = document.createElement("span");
      dot.className = "online-dot";

      li.append(img, name, dot);
      if (!isSelf) {
        li.addEventListener("click", () => openDm(user.username, user.socketId, user.avatar));
      }
      els.userList.append(li);
    }
  };

  const renderMessages = (messages) => {
    els.messages.querySelectorAll(".msg").forEach((m) => m.remove());
    if (!messages || messages.length === 0) return;
    for (const msg of messages) {
      els.messages.append(buildMessageEl(msg));
    }
    scrollToBottom(els.messages);
  };

  const renderDmPanel = () => {
    if (!state.dmTarget) return;
    const { username } = state.dmTarget;
    els.dmName.textContent = username;
    els.dmAvatar.className = "avatar sm";
    renderAvatar(els.dmAvatar, state.dmTarget.avatar, username, "sm");

    els.dmMessages.innerHTML = "";
    const msgs = state.dms.get(username) || [];
    for (const m of msgs) {
      const el = document.createElement("div");
      el.className = `msg${m.mine ? " mine" : ""}`;
      const bubble = document.createElement("div");
      bubble.className = "bubble";
      const time = document.createElement("span");
      time.className = "msg-time";
      time.textContent = fmtTime(m.timestamp);
      const text = document.createElement("div");
      text.className = "msg-text";
      text.textContent = m.message;
      text.style.fontSize = "13px";
      bubble.append(time, text);
      el.append(bubble);
      els.dmMessages.append(el);
    }
    scrollToBottom(els.dmMessages);
  };

  const renderDmBadges = () => {
    for (const el of document.querySelectorAll(".user-item")) {
      const username = el.dataset.username;
      const unread = state.dmUnread.get(username) || 0;
      let badge = el.querySelector(".dm-unread");
      if (unread > 0) {
        if (!badge) {
          badge = document.createElement("span");
          badge.className = "dm-unread";
          el.querySelector(".online-dot").remove();
          el.append(badge);
        }
        badge.textContent = unread;
        state.dmUnread.set(username, unread);
      } else if (badge) {
        badge.remove();
        const dot = document.createElement("span");
        dot.className = "online-dot";
        el.append(dot);
      }
    }
  };

  /* ---------------- actions ---------------- */

  const joinRoom = (room) => {
    if (room === state.currentRoom) return;
    state.currentRoom = room;
    state.typingUsers.clear();
    renderTyping();
    renderRooms();
    els.roomTitle.textContent = `#${room}`;
    els.roomMembers.textContent = "0 online";
    els.meRoom.textContent = room;
    els.welcomeRoom.textContent = `#${room}`;
    renderMessages([]);
    socket.emit("room:join", { room });
  };

  const openDm = (username, socketId, avatar) => {
    state.dmTarget = { username, socketId, avatar };
    state.dmUnread.set(username, 0);
    renderDmBadges();
    renderDmPanel();
    els.dmPanel.classList.remove("hidden");
    els.dmInput.focus();
  };

  const closeDm = () => {
    state.dmTarget = null;
    els.dmPanel.classList.add("hidden");
  };

  const handleMessageInput = (input) => {
    if (!isTypingEmitting) {
      isTypingEmitting = true;
      socket.emit("typing:start", { room: state.currentRoom });
    }
    clearTimeout(typingTimer);
    typingTimer = setTimeout(sendStopTyping, 1500);
  };

  const sendStopTyping = () => {
    if (!isTypingEmitting) return;
    isTypingEmitting = false;
    socket.emit("typing:stop", { room: state.currentRoom });
  };

  const sendRoomMessage = (event) => {
    event.preventDefault();
    const text = els.messageInput.value.trim();
    if (!text) return;
    clearTimeout(typingTimer);
    sendStopTyping();
    socket.emit("chat:send", { room: state.currentRoom, message: text });
    els.messageInput.value = "";
    els.messageInput.focus();
  };

  const sendDm = (event) => {
    event.preventDefault();
    if (!state.dmTarget) return;
    const text = els.dmInput.value.trim();
    if (!text) return;
    const { username, socketId } = state.dmTarget;

    const out = {
      id: `local_${Date.now()}`,
      mine: true,
      message: text,
      timestamp: fmtTime(),
      avatar: state.me.avatar,
    };
    const list = state.dms.get(username) || [];
    list.push(out);
    state.dms.set(username, list);
    renderDmPanel();

    socket.emit("direct:send", { recipientId: socketId, recipientName: username, message: text });
    els.dmInput.value = "";
    els.dmInput.focus();
  };

  const handleIncomingDm = (from, avatar, message, timestamp) => {
    const mine = state.me && from === state.me.username;
    const dmUsername = mine ? state.dmTarget?.username : from;
    if (!dmUsername) return;

    const entry = {
      id: Math.random().toString(36).slice(2),
      mine,
      message,
      timestamp: fmtTime(timestamp),
      avatar: mine ? state.dmTarget.avatar : avatar,
    };

    const list = state.dms.get(dmUsername) || [];
    list.push(entry);
    state.dms.set(dmUsername, list);

    const isOpen = state.dmTarget && state.dmTarget.username === dmUsername;
    if (isOpen) {
      renderDmPanel();
      return;
    }

    const unread = (state.dmUnread.get(dmUsername) || 0) + 1;
    state.dmUnread.set(dmUsername, unread);
    renderDmBadges();
    showToast(`New DM from ${from}: ${message}`);

    const senderInfo = senderLookup(from);
    if (senderInfo) {
      state.dmTarget = { username: from, socketId: senderInfo.socketId, avatar: senderInfo.avatar || avatar };
      state.dmUnread.set(from, 0);
      renderDmBadges();
      renderDmPanel();
      els.dmPanel.classList.remove("hidden");
    }
  };

  const senderLookup = (username) =>
    Array.from(state.users.values()).find((u) => u.username === username) || null;

  /* ---------------- socket events ---------------- */

  socket.on("connect", () => {
    els.connBadge.textContent = "Connected";
    els.connBadge.classList.add("online");
    els.connBadge.classList.remove("offline");
  });

  socket.on("disconnect", () => {
    els.connBadge.textContent = "Offline";
    els.connBadge.classList.remove("online");
    els.connBadge.classList.add("offline");
    showToast("Disconnected — retrying…");
  });

  socket.on("error", ({ message }) => {
    showToast(message || "Something went wrong");
  });

  socket.on("user:loggedin", (data) => {
    state.me = { socketId: data.socketId, username: data.username, avatar: data.avatar };
    state.rooms = data.rooms || [];
    state.currentRoom = "general";

    renderRooms();
    renderAvatar(els.meAvatar, data.avatar, data.username, "md");
    els.meName.textContent = data.username;

    els.overlay.classList.add("hidden");
    els.app.classList.remove("hidden");
    els.messageInput.focus();
  });

  socket.on("room:history", ({ room, messages }) => {
    if (room !== state.currentRoom) return;
    renderMessages(messages);
  });

  socket.on("room:userlist", ({ room, users }) => {
    if (room !== state.currentRoom) return;
    state.users.clear();
    for (const u of users) state.users.set(u.socketId, u);
    renderUsers();
    if (state.dmTarget) {
      const still = users.find((u) => u.socketId === state.dmTarget.socketId);
      if (!still) state.dmTarget = null;
      if (state.dmTarget) renderDmPanel();
    }
  });

  socket.on("room:system", (sys) => {
    if (sys.room !== state.currentRoom) return;
    els.messages.append(buildSystemEl(sys));
    scrollToBottom(els.messages);
  });

  socket.on("chat:receive", (msg) => {
    if (msg.room !== state.currentRoom) return;
    els.messages.append(buildMessageEl(msg));
    scrollToBottom(els.messages);
  });

  socket.on("typing:update", ({ username, isTyping }) => {
    if (!state.me || username === state.me.username) return;
    const set = state.typingUsers;
    if (isTyping) set.set(username, username);
    else set.delete(username);
    renderTyping();
  });

  socket.on("direct:receive", ({ from, fromAvatar, message, timestamp }) => {
    handleIncomingDm(from, fromAvatar, message, timestamp);
  });

  socket.on("direct:sent", ({ to, toAvatar, message, timestamp }) => {
    const entry = {
      icon: null,
      mine: true,
      from: state.me.username,
      to,
      message,
      timestamp: fmtTime(timestamp),
      avatar: toAvatar,
    };
    const list = state.dms.get(to) || [];
    const exists = list.find((x) => x.message === message && x.mine && x.timestamp === entry.timestamp);
    if (!exists) list.push(entry);
    state.dms.set(to, list);
    if (state.dmTarget && state.dmTarget.username === to) renderDmPanel();
  });

  socket.on("direct:error", (err) => {
    showToast(err.message || "Could not send direct message");
    if (state.dmTarget && err.recipientName === state.dmTarget.username) {
      const list = state.dms.get(state.dmTarget.username) || [];
      list.pop();
      state.dms.set(state.dmTarget.username, list);
      renderDmPanel();
    }
  });

  /* ---------------- ui wiring ---------------- */

  els.avatarPicker.addEventListener("click", (e) => {
    const img = e.target.closest(".avatar-option");
    if (!img) return;
    state.selectedAvatar = img.dataset.avatar;
    els.avatarPicker.querySelectorAll(".avatar-option").forEach((a) => a.classList.remove("active"));
    img.classList.add("active");
  });

  els.loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = els.usernameInput.value.trim();
    if (!username) return;
    socket.emit("user:login", { username, avatar: state.selectedAvatar });
  });

  els.messageForm.addEventListener("submit", sendRoomMessage);
  els.messageInput.addEventListener("input", () => handleMessageInput(els.messageInput));

  els.dmForm.addEventListener("submit", sendDm);
  els.dmClose.addEventListener("click", closeDm);
})();