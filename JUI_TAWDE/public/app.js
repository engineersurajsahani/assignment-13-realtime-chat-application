const socket = io();

const $ = id => document.getElementById(id);
const state = {
  user: null,
  avatar: "A",
  current: { type: "room", id: "General", name: "General" },
  rooms: ["General", "Developers", "Gaming", "Random"],
  users: [],
  roomUsers: [],
  groups: [],
  dms: new Map(),
  histories: new Map(),
  dmHistories: new Map(),
  unread: new Map(),
  typing: new Set(),
  selectedMembers: new Set()
};

const AVATARS = ["A","M","S","R","J","P"];

socket.on("connect", () => setConnection(true));
socket.on("disconnect", () => setConnection(false));
socket.on("connect_error", () => setConnection(false));

socket.on("user:ready", data => {
  state.user = data.user;
  state.avatar = data.user.avatar;
  state.users = data.onlineUsers || [];
  state.rooms = data.publicRooms || state.rooms;
  $("loginModal").classList.add("hidden");
  renderProfile();
  renderRooms();
  renderUsers();
  openRoom("general");
});

socket.on("presence:update", ({ users }) => {
  state.users = users || [];
  renderUsers();
  renderSelectUsers();
  if (state.current.type === "dm") updateContextMembers();
});

socket.on("room:history", ({ room, messages }) => {
  state.histories.set(room, messages || []);
  if (state.current.type === "room" && state.current.id === room) renderMessages(messages || []);
});

socket.on("room:userlist", ({ room, users }) => {
  if (state.current.type === "room" && state.current.id === room) {
    state.roomUsers = users || [];
    updateHeader();
    updateContextMembers();
  }
});

socket.on("chat:receive", msg => {
  if (!msg) return;
  const key = msg.room;
  const list = state.histories.get(key) || [];
  if (!list.some(x => x.id === msg.id)) list.push(msg);
  state.histories.set(key, list.slice(-50));

  if (state.current.type === "room" && state.current.id === key ||
      state.current.type === "group" && state.current.id === key) {
    appendMessage(msg);
  } else if (msg.senderId !== state.user?.id) {
    bumpUnread(key);
  }
});

socket.on("direct:history", ({ recipientId, messages }) => {
  const key = `dm:${recipientId}`;
  state.dmHistories.set(key, messages || []);
  if (state.current.type === "dm" && state.current.id === recipientId) renderMessages(messages || []);
});

socket.on("direct:receive", msg => {
  const otherId = msg.senderId === state.user?.id ? msg.recipientId : msg.senderId;
  const key = `dm:${otherId}`;
  const list = state.dmHistories.get(key) || [];
  if (!list.some(x => x.id === msg.id)) list.push(msg);
  state.dmHistories.set(key, list.slice(-50));

  if (state.current.type === "dm" && state.current.id === otherId) appendMessage(msg);
  else if (msg.senderId !== state.user?.id) {
    bumpUnread(key);
    const other = state.users.find(u => u.id === otherId);
    toast(other?.username || "New message", msg.message);
  }
  renderDMs();
});

socket.on("typing:update", ({ username, isTyping }) => {
  if (isTyping) state.typing.add(username);
  else state.typing.delete(username);
  $("typingBar").textContent = state.typing.size
    ? [...state.typing].join(", ") + (state.typing.size === 1 ? " is typing…" : " are typing…")
    : "";
});

socket.on("group:added", group => {
  if (!state.groups.some(g => g.id === group.id)) state.groups.push(group);
  renderGroups();
  if (group.ownerId === state.user?.id) {
    toast("Private group created", `${group.name} · code ${group.code}`);
    openGroup(group);
  }
});

socket.on("group:history", ({ groupId, messages }) => {
  state.histories.set(groupId, messages || []);
  if (state.current.type === "group" && state.current.id === groupId) renderMessages(messages || []);
});

socket.on("group:userlist", ({ groupId, users }) => {
  if (state.current.type === "group" && state.current.id === groupId) {
    state.roomUsers = users || [];
    updateHeader();
    updateContextMembers();
  }
});

socket.on("group:removed", ({ groupId }) => {
  state.groups = state.groups.filter(g => g.id !== groupId);
  renderGroups();
  if (state.current.id === groupId) openRoom("general");
});

socket.on("app:error", ({ message }) => toast("Something went wrong", message));

function setConnection(online) {
  $("connectionText").textContent = online ? "Connected" : "Reconnecting…";
  $("connectionDot").className = "status-dot " + (online ? "online" : "");
}

function init() {
  renderAvatarPicker();
  $("loginModal").classList.remove("hidden");
  $("usernameInput").addEventListener("keydown", e => { if (e.key === "Enter") login(); });
  $("loginBtn").onclick = login;

  $("composer").addEventListener("submit", e => { e.preventDefault(); sendMessage(); });
  $("messageInput").addEventListener("input", onInput);
  $("messageInput").addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  $("emojiBtn").onclick = () => $("emojiPop").classList.toggle("hidden");
  document.querySelectorAll("#emojiPop button").forEach(b => b.onclick = () => {
    insertText(b.textContent);
    $("emojiPop").classList.add("hidden");
  });

  $("createGroupBtn").onclick = openCreateGroup;
  $("joinGroupBtn").onclick = () => $("joinModal").classList.remove("hidden");
  $("confirmJoinBtn").onclick = () => {
    const code = $("groupCodeInput").value.trim().toUpperCase();
    if (!code) return;
    socket.emit("group:join", { code });
    $("joinModal").classList.add("hidden");
    $("groupCodeInput").value = "";
  };
  $("confirmGroupBtn").onclick = createGroup;

  document.querySelectorAll("[data-close]").forEach(btn => {
    btn.onclick = () => $(btn.dataset.close).classList.add("hidden");
  });

  $("copyCode").onclick = async () => {
    const code = $("groupCode").textContent;
    try { await navigator.clipboard.writeText(code); toast("Copied", "Invitation code is on your clipboard."); }
    catch { toast("Invitation code", code); }
  };

  $("openLeft").onclick = () => $("leftSidebar").classList.add("open");
  $("openRight").onclick = () => $("rightSidebar").classList.add("open");
  $("closeRight").onclick = () => $("rightSidebar").classList.remove("open");
  $("refreshRooms").onclick = () => renderRooms();

  $("searchBtn").onclick = () => $("searchBar").classList.toggle("hidden");
  $("closeSearch").onclick = () => { $("searchBar").classList.add("hidden"); $("searchInput").value = ""; renderCurrentHistory(); };
  $("searchInput").addEventListener("input", renderCurrentHistory);

  $("logoutBtn").onclick = () => location.reload();
}
init();

function login() {
  const username = $("usernameInput").value.trim();
  if (!username) return toast("Almost there", "Enter a display name first.");
  socket.emit("user:login", { username, avatar: state.avatar });
}

function renderAvatarPicker() {
  $("avatarPicker").innerHTML = AVATARS.map((a, i) =>
    `<button type="button" class="avatar-choice ${i === 0 ? "selected" : ""}" data-avatar="${a}">${a}</button>`
  ).join("");
  document.querySelectorAll(".avatar-choice").forEach(b => b.onclick = () => {
    document.querySelectorAll(".avatar-choice").forEach(x => x.classList.remove("selected"));
    b.classList.add("selected");
    state.avatar = b.dataset.avatar;
  });
}

function renderProfile() {
  $("profileName").textContent = state.user.username;
  $("profileAvatar").textContent = state.avatar;
}

function renderRooms() {
  $("roomList").innerHTML = state.rooms.map(room => `
    <button class="nav-item ${state.current.type === "room" && state.current.id === room ? "active" : ""}" onclick="openRoom('${room}')">
      <span class="nav-icon">#</span><span class="nav-name">${escapeHtml(room)}</span>
      ${state.unread.get(room) ? `<span class="unread">${state.unread.get(room)}</span>` : ""}
    </button>
  `).join("");
}

function renderDMs() {
  const entries = [...state.dms.values()];
  if (!entries.length) {
    $("dmList").innerHTML = `<div class="muted-empty">No conversations yet</div>`;
    return;
  }
  $("dmList").innerHTML = entries.map(u => `
    <button class="nav-item ${state.current.type === "dm" && state.current.id === u.id ? "active" : ""}" onclick='openDM(${JSON.stringify(u.id)})'>
      <span class="mini-avatar">${escapeHtml(initial(u.username))}</span>
      <span class="nav-name">${escapeHtml(u.username)}</span>
      ${state.unread.get(`dm:${u.id}`) ? `<span class="unread">${state.unread.get(`dm:${u.id}`)}</span>` : ""}
    </button>
  `).join("");
}

function renderGroups() {
  if (!state.groups.length) {
    $("groupList").innerHTML = `<div class="muted-empty">No private groups</div>`;
    return;
  }
  $("groupList").innerHTML = state.groups.map(g => `
    <button class="nav-item ${state.current.type === "group" && state.current.id === g.id ? "active" : ""}" onclick='openGroupById(${JSON.stringify(g.id)})'>
      <span class="nav-icon">◇</span><span class="nav-name">${escapeHtml(g.name)}</span>
      ${state.unread.get(g.id) ? `<span class="unread">${state.unread.get(g.id)}</span>` : ""}
    </button>
  `).join("");
}

function renderUsers() {
  $("onlineCount").textContent = state.users.length;
  $("onlineList").innerHTML = state.users.slice(0, 7).map(u => `
    <div class="online-user" onclick='openDM(${JSON.stringify(u.id)})'>
      <span class="mini-avatar">${escapeHtml(initial(u.username))}</span>
      <span>${escapeHtml(u.username)}</span>
    </div>
  `).join("");
  renderDMs();
}

function renderSelectUsers() {
  $("selectUsers").innerHTML = state.users
    .filter(u => u.id !== state.user?.id)
    .map(u => `
      <label class="select-user ${state.selectedMembers.has(u.id) ? "selected" : ""}">
        <input type="checkbox" value="${u.id}" ${state.selectedMembers.has(u.id) ? "checked" : ""}>
        <span class="mini-avatar">${escapeHtml(initial(u.username))}</span>
        <span>${escapeHtml(u.username)}</span>
      </label>
    `).join("") || `<div class="muted-empty">No other online users yet.</div>`;

  document.querySelectorAll(".select-user").forEach(el => {
    el.onclick = e => {
      if (e.target.tagName === "INPUT") return;
      const id = el.querySelector("input").value;
      state.selectedMembers.has(id) ? state.selectedMembers.delete(id) : state.selectedMembers.add(id);
      renderSelectUsers();
    };
    const input = el.querySelector("input");
    if (input) input.onchange = () => {
      input.checked ? state.selectedMembers.add(input.value) : state.selectedMembers.delete(input.value);
      el.classList.toggle("selected", input.checked);
    };
  });
}

function openRoom(room) {
  if (!state.user) return;
  state.current = { type: "room", id: room, name: room };
  clearUnread(room);
  state.typing.clear();
  socket.emit("room:join", { room });
  renderRooms();
  renderGroups();
  renderCurrentHistory();
  updateHeader();
  $("rightSidebar").classList.remove("open");
}

function openDM(id) {
  if (!state.user || id === state.user.id) return;
  const user = state.users.find(u => u.id === id);
  if (!user) return toast("User unavailable", "That person is currently offline.");
  state.current = { type: "dm", id, name: user.username, user };
  clearUnread(`dm:${id}`);
  state.dms.set(id, user);
  socket.emit("direct:history", { recipientId: id });
  renderDMs();
  renderCurrentHistory();
  updateHeader();
  updateContextMembers();
  $("rightSidebar").classList.remove("open");
}

function openGroupById(id) {
  const group = state.groups.find(g => g.id === id);
  if (group) openGroup(group);
}
function openGroup(group) {
  state.current = { type: "group", id: group.id, name: group.name, group };
  clearUnread(group.id);
  state.roomUsers = group.members || [];
  socket.emit("group:history", { groupId: group.id });
  renderGroups();
  renderCurrentHistory();
  updateHeader();
  updateContextMembers();
  $("rightSidebar").classList.remove("open");
}

function updateHeader() {
  const c = state.current;
  $("conversationTitle").textContent = c.name;
  $("rightTitle").textContent = c.name;
  $("conversationIcon").textContent = c.type === "room" ? "#" : c.type === "dm" ? "↗" : "◇";

  if (c.type === "room") $("conversationSubtitle").textContent = `Public channel · ${state.roomUsers.length} members`;
  if (c.type === "dm") $("conversationSubtitle").textContent = `Direct message · ${isOnline(c.id) ? "online now" : "offline"}`;
  if (c.type === "group") $("conversationSubtitle").textContent = `Private group · ${state.roomUsers.length} members`;
}

function updateContextMembers() {
  const c = state.current;
  let users = [];
  let desc = "";

  if (c.type === "room") {
    users = state.roomUsers;
    desc = "A public channel for the workspace. Messages are visible only to people currently in this channel.";
  } else if (c.type === "dm") {
    users = [c.user];
    desc = "A private one-to-one conversation. Messages are delivered only to you and the selected person.";
  } else {
    const g = state.groups.find(x => x.id === c.id) || c.group;
    users = (g?.members || []).map(m => typeof m === "string" ? state.users.find(u => u.id === m) : m).filter(Boolean);
    desc = g?.description || "Private group conversation.";
    $("groupCodeCard").classList.remove("hidden");
    $("groupCode").textContent = g?.code || "—";
  }

  if (c.type !== "group") $("groupCodeCard").classList.add("hidden");
  $("contextCard").innerHTML = `<h3>${escapeHtml(c.type === "dm" ? "Private conversation" : c.type === "group" ? "About this group" : "About this channel")}</h3><p>${escapeHtml(desc)}</p>`;
  $("memberCount").textContent = users.length;
  $("memberList").innerHTML = users.map(u => `
    <div class="member">
      <span class="mini-avatar">${escapeHtml(initial(u.username))}</span>
      <span class="member-name">${escapeHtml(u.username)}</span>
      <span class="member-role">${u.id === state.user?.id ? "YOU" : "ONLINE"}</span>
    </div>
  `).join("");
}

function renderCurrentHistory() {
  const c = state.current;
  let list = [];
  if (c.type === "room" || c.type === "group") list = state.histories.get(c.id) || [];
  if (c.type === "dm") list = state.dmHistories.get(`dm:${c.id}`) || [];
  const q = $("searchInput").value.trim().toLowerCase();
  if (q) list = list.filter(m => m.message.toLowerCase().includes(q) || m.sender.toLowerCase().includes(q));
  renderMessages(list);
}

function renderMessages(list) {
  $("messages").innerHTML = "";
  if (!list.length) {
    $("messages").innerHTML = `
      <div class="welcome-state">
        <div class="welcome-orb">${state.current.type === "room" ? "#" : "✦"}</div>
        <h2>${state.current.type === "dm" ? "A private beginning." : "It's quiet here."}</h2>
        <p>Send the first message and give this conversation a little life.</p>
      </div>`;
    return;
  }
  list.forEach(appendMessage);
}

function appendMessage(msg) {
  const welcome = $("messages").querySelector(".welcome-state");
  if (welcome) welcome.remove();

  const mine = msg.senderId === state.user?.id;
  const row = document.createElement("div");
  row.className = "message-row " + (mine ? "mine" : "");
  row.innerHTML = `
    <div class="message-avatar">${escapeHtml(initial(msg.sender))}</div>
    <div class="message-content">
      <div class="message-meta"><b>${escapeHtml(msg.sender)}</b><time>${formatTime(msg.timestamp)}</time></div>
      <div class="bubble">${escapeHtml(msg.message)}</div>
    </div>`;
  $("messages").appendChild(row);
  $("messages").scrollTop = $("messages").scrollHeight;
}

function sendMessage() {
  const input = $("messageInput");
  const message = input.value.trim();
  if (!message || !state.user) return;

  const c = state.current;
  if (c.type === "room") socket.emit("chat:send", { room: c.id, message });
  else if (c.type === "group") socket.emit("group:send", { groupId: c.id, message });
  else socket.emit("direct:send", { recipientId: c.id, message });

  input.value = "";
  autoGrow(input);
  stopTyping();
}

let typingTimeout;
function onInput() {
  autoGrow($("messageInput"));
  const c = state.current;
  if (c.type === "dm") return;
  const room = c.id;
  socket.emit("typing:start", { room });
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(stopTyping, 1000);
}
function stopTyping() {
  const c = state.current;
  if (c.type !== "dm") socket.emit("typing:stop", { room: c.id });
}
function autoGrow(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 120) + "px";
}
function insertText(text) {
  const input = $("messageInput");
  input.value += text;
  input.focus();
  autoGrow(input);
}

function openCreateGroup() {
  state.selectedMembers.clear();
  $("groupNameInput").value = "";
  renderSelectUsers();
  $("groupModal").classList.remove("hidden");
}
function createGroup() {
  const name = $("groupNameInput").value.trim();
  if (!name) return toast("Name your group", "Add a group name first.");
  socket.emit("group:create", { name, memberIds: [...state.selectedMembers] });
  $("groupModal").classList.add("hidden");
}

function bumpUnread(key) {
  state.unread.set(key, (state.unread.get(key) || 0) + 1);
  renderRooms(); renderDMs(); renderGroups();
}
function clearUnread(key) {
  state.unread.delete(key);
  renderRooms(); renderDMs(); renderGroups();
}
function toast(title, text) {
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `<b>${escapeHtml(title)}</b><span>${escapeHtml(text)}</span>`;
  $("toastStack").appendChild(el);
  setTimeout(() => el.remove(), 3600);
}
function isOnline(id) { return state.users.some(u => u.id === id); }
function initial(name) { return (name || "?").trim().charAt(0).toUpperCase(); }
function formatTime(ts) {
  try { return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
  catch { return ""; }
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[c]));
}
