const { io } = require("socket.io-client");

const URL = "http://localhost:5001";
const results = [];
const fail = (label, extra = "") => {
  results.push(`✗ ${label} ${extra}`);
};
const pass = (label) => {
  results.push(`✓ ${label}`);
};

const waitFor = (socket, event, timeoutMs = 4000) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), timeoutMs);
    socket.once(event, (data) => {
      clearTimeout(t);
      resolve(data);
    });
  });

const waitMs = (ms) => new Promise((r) => setTimeout(r, ms));

async function login(username, avatar) {
  const socket = io(URL, { transports: ["websocket"] });
  const connected = waitFor(socket, "connect");
  const loggedInP = waitFor(socket, "user:loggedin");
  const historyP = waitFor(socket, "room:history");
  const userlistP = waitFor(socket, "room:userlist");
  socket.emit("user:login", { username, avatar });
  await connected;
  const loggedIn = await loggedInP;
  const initialHistory = await historyP;
  const initialUserlist = await userlistP;
  return { socket, ...loggedIn, initialHistory, initialUserlist };
}

async function joinRoom(user, room) {
  const historyP = waitFor(user.socket, "room:history");
  const userlistP = waitFor(user.socket, "room:userlist");
  user.socket.emit("room:join", { room });
  const history = await historyP;
  const userlist = await userlistP;
  return { history, userlist };
}

(async () => {
  try {
    /* --- 1. Three users log in, auto-joined to #general --- */
    const aarav = await login("Aarav", "avatar1.svg");
    const priya = await login("Priya", "avatar2.svg");
    const rohan = await login("Rohan", "avatar3.svg");
    pass("all three users logged in & auto-joined #general");
    results.push(`  (Aarav socket: ${aarav.socketId}, Priya: ${priya.socketId}, Rohan: ${rohan.socketId})`);

    const aaravUserlist = await waitFor(aarav.socket, "room:userlist");
    pass("room:userlist broadcast to #general");
    results.push(`  users=${JSON.stringify(aaravUserlist.users.map((u) => u.username))}`);

    /* --- 2. Aarav & Priya join #developers, Rohan joins #random --- */
    const aDev = await joinRoom(aarav, "developers");
    const pDev = await joinRoom(priya, "developers");
    await joinRoom(rohan, "random");
    pass("#developers history + roster sent to Aarav & Priya");
    pass(`#developers roster now = ${pDev.userlist.users.length} users`);

    /* --- 3. Typing indicator isolation --- */
    const priyaTyping = waitFor(priya.socket, "typing:update");
    let rohanGotTyping = false;
    rohan.socket.on("typing:update", () => {
      rohanGotTyping = true;
    });

    aarav.socket.emit("typing:start", { room: "developers" });
    const typing = await priyaTyping;
    if (typing.username === "Aarav" && typing.isTyping === true) pass("Priya sees 'Aarav is typing'");
    else fail("typing:update", JSON.stringify(typing));

    aarav.socket.emit("typing:stop", { room: "developers" });
    const typingStop = await waitFor(priya.socket, "typing:update");
    if (!typingStop.isTyping) pass("Priya sees Aarav stopped typing");

    await waitMs(300);
    if (rohanGotTyping) fail("Rohan received typing update (should be isolated!)");
    else pass("Rohan in #random does NOT receive #developers typing events");

    /* --- 4. Group messaging isolation --- */
    const priyaMsg = waitFor(priya.socket, "chat:receive");
    let rohanGotMsg = false;
    rohan.socket.on("chat:receive", () => {
      rohanGotMsg = true;
    });

    aarav.socket.emit("chat:send", { room: "developers", message: "Hey everyone!" });
    const recv = await priyaMsg;
    if (recv.sender === "Aarav" && recv.message === "Hey everyone!" && recv.room === "developers")
      pass("Priya receives group message in real time");
    else fail("chat:receive payload", JSON.stringify(recv));

    await waitMs(300);
    if (rohanGotMsg) fail("Rohan received #developers message (should be isolated!)");
    else pass("Rohan does NOT receive #developers messages");

    /* --- 5. History hydration for a new joiner --- */
    const fourth = await login("Dev4", "avatar4.svg");
    const fourthHist = await joinRoom(fourth, "developers");
    const hadAarav = fourthHist.history.messages.some(
      (m) => m.sender === "Aarav" && m.message === "Hey everyone!"
    );
    if (hadAarav) pass("New joiner hydrates past messages from history");
    else fail("new joiner history missing messages", JSON.stringify(fourthHist.history.messages));

    /* --- 6. Direct messages are private --- */
    const priyaDm = waitFor(priya.socket, "direct:receive");
    const aaravAck = waitFor(aarav.socket, "direct:sent");
    let rohanGotDm = false;
    rohan.socket.on("direct:receive", () => {
      rohanGotDm = true;
    });

    aarav.socket.emit("direct:send", {
      recipientId: priya.socketId,
      message: "pssst, this is private",
    });

    const dm = await priyaDm;
    if (dm.from === "Aarav" && dm.message === "pssst, this is private")
      pass("Priya receives private DM from Aarav");
    else fail("direct:receive payload", JSON.stringify(dm));

    const ack = await aaravAck;
    if (ack.to === "Priya") pass("Sender receives direct:sent ack");
    else fail("direct:sent ack", JSON.stringify(ack));

    await waitMs(300);
    if (rohanGotDm) fail("Rohan received private DM (should NEVER happen!)");
    else pass("Rohan does NOT receive the private DM");

    /* --- 7. Cleanup --- */
    for (const u of [aarav, priya, rohan, fourth]) u.socket.disconnect();
  } catch (error) {
    fail(`EXECUTION ERROR: ${error.message}`);
  }

  console.log("\n===== SMOKE TEST RESULTS =====");
  results.forEach((r) => console.log(r));
  const failed = results.filter((r) => r.startsWith("✗")).length;
  console.log(`\n${failed === 0 ? "ALL TESTS PASSED" : `${failed} TEST(S) FAILED`}`);
  process.exit(failed === 0 ? 0 : 1);
})();