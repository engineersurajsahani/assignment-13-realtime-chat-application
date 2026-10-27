const { createMessage, addToHistory, getHistory } = require("../utils/messageStore");
const { makeCode, makeGroupId } = require("../utils/groupStore");
const { usersInRoom } = require("./userHandler");

function register(io, socket, state) {
  socket.on("group:create", ({ name, memberIds = [] } = {}) => {
    const creator = state.connectedUsers.get(socket.id);
    if (!creator) return;

    name = String(name || "").trim().slice(0, 40);
    if (!name) return socket.emit("app:error", { message: "Group name is required." });

    const members = new Set([socket.id]);
    memberIds.forEach(id => {
      if (state.connectedUsers.has(id)) members.add(id);
    });

    const group = {
      id: makeGroupId(),
      name,
      code: makeCode(),
      ownerId: socket.id,
      createdAt: new Date().toISOString(),
      members: [...members],
      description: "Private conversation for invited members."
    };

    state.groups.set(group.id, group);
    state.roomHistories.set(group.id, []);
    members.forEach(id => {
      if (!state.userGroups.has(id)) state.userGroups.set(id, new Set());
      state.userGroups.get(id).add(group.id);
      io.sockets.sockets.get(id)?.join(group.id);
      io.to(id).emit("group:added", sanitize(group, state));
    });

    io.to(group.id).emit("group:userlist", {
      groupId: group.id,
      users: usersInRoom(io, state, group.id)
    });
  });

  socket.on("group:join", ({ code } = {}) => {
    const user = state.connectedUsers.get(socket.id);
    const group = [...state.groups.values()].find(g => g.code === String(code || "").trim().toUpperCase());

    if (!user) return;
    if (!group) return socket.emit("app:error", { message: "Invalid group invitation code." });
    if (!group.members.includes(socket.id)) group.members.push(socket.id);

    if (!state.userGroups.has(socket.id)) state.userGroups.set(socket.id, new Set());
    state.userGroups.get(socket.id).add(group.id);

    socket.join(group.id);
    socket.emit("group:added", sanitize(group, state));
    socket.emit("group:history", {
      groupId: group.id,
      messages: getHistory(state.roomHistories, group.id)
    });

    io.to(group.id).emit("group:userlist", {
      groupId: group.id,
      users: usersInRoom(io, state, group.id)
    });
  });

  socket.on("group:history", ({ groupId } = {}) => {
    const group = state.groups.get(groupId);
    if (!group || !group.members.includes(socket.id)) return;
    socket.emit("group:history", {
      groupId,
      messages: getHistory(state.roomHistories, groupId)
    });
  });

  socket.on("group:send", ({ groupId, message } = {}) => {
    const user = state.connectedUsers.get(socket.id);
    const group = state.groups.get(groupId);
    message = String(message || "").trim().slice(0, 2000);

    if (!user || !group || !group.members.includes(socket.id) || !message) return;

    const msg = createMessage({
      sender: user.username,
      senderId: socket.id,
      message,
      room: groupId
    });

    addToHistory(state.roomHistories, groupId, msg);
    io.to(groupId).emit("chat:receive", msg);
    io.to(groupId).emit("group:message", msg);
  });

  socket.on("group:leave", ({ groupId } = {}) => {
    const group = state.groups.get(groupId);
    if (!group) return;

    group.members = group.members.filter(id => id !== socket.id);
    state.userGroups.get(socket.id)?.delete(groupId);
    socket.leave(groupId);

    io.to(groupId).emit("group:userlist", {
      groupId,
      users: usersInRoom(io, state, groupId)
    });
    socket.emit("group:removed", { groupId });
  });
}

function sanitize(group, state) {
  return {
    ...group,
    members: group.members
      .map(id => state.connectedUsers.get(id))
      .filter(Boolean)
      .map(u => ({ id: u.id, username: u.username, avatar: u.avatar }))
  };
}

module.exports = register;
