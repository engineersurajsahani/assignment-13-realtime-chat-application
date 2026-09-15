/**
 * Automated Real-Time Chat & REST API Validation Suite
 * Assignment 13: Real-Time Group Chat & Messaging Engine (Socket.io)
 * Student: Prince Yadav (150096725032)
 */

const http = require('http');
const { io } = require('socket.io-client');
const assert = require('assert');
const { server } = require('./server');

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function checkServerAvailable(url) {
  return new Promise((resolve) => {
    const req = http.get(`${url}/health`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(800, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function apiRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const postData = data ? JSON.stringify(data) : null;
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {})
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function resolveServerUrl() {
  if (process.env.SERVER_URL) return process.env.SERVER_URL;
  const candidates = ['http://localhost:5000', 'http://localhost:5050'];
  for (const url of candidates) {
    const ok = await checkServerAvailable(url);
    if (ok) return url;
  }

  // Fallback: start testing instance on port 5055
  const testPort = 5055;
  await new Promise((resolve) => {
    server.listen(testPort, () => resolve());
  });
  return `http://localhost:${testPort}`;
}

function createClient(serverUrl, username, avatar) {
  return new Promise((resolve, reject) => {
    const socket = io(serverUrl, {
      transports: ['websocket'],
      forceNew: true
    });

    socket.on('connect', () => {
      socket.emit('user:login', { username, avatar });
    });

    socket.on('user:login:success', (data) => {
      resolve({ socket, user: data.user });
    });

    socket.on('connect_error', (err) => {
      reject(err);
    });
  });
}

async function runTests() {
  const SERVER_URL = await resolveServerUrl();

  console.log('🧪 ========================================================');
  console.log('🧪 ASSIGNMENT 13: BACKEND REST APIS & SOCKET.IO TEST SUITE');
  console.log('🧪 Target Server:', SERVER_URL);
  console.log('🧪 Student: Prince Yadav (150096725032)');
  console.log('🧪 ========================================================\n');

  try {
    // -----------------------------------------------------------------
    // Part 1: REST API Tests
    // -----------------------------------------------------------------
    console.log('▶ [Test 1] Testing REST API: GET /health and GET /api/rooms...');
    const healthRes = await apiRequest(`${SERVER_URL}/health`);
    assert.strictEqual(healthRes.status, 200);
    assert.strictEqual(healthRes.data.status, 'online');
    console.log('   ✅ Health endpoint verified: status online.');

    const roomsRes = await apiRequest(`${SERVER_URL}/api/rooms`);
    assert.strictEqual(roomsRes.status, 200);
    assert.ok(Array.isArray(roomsRes.data.rooms));
    console.log('   ✅ GET /api/rooms returned %d rooms.', roomsRes.data.count);

    console.log('\n▶ [Test 2] Testing REST API: POST /api/rooms (create room)...');
    const createRoomRes = await apiRequest(`${SERVER_URL}/api/rooms`, 'POST', { room: 'cybersecurity' });
    assert.strictEqual(createRoomRes.status, 201);
    assert.strictEqual(createRoomRes.data.room, 'cybersecurity');
    console.log('   ✅ Created channel #cybersecurity via REST API.');

    // -----------------------------------------------------------------
    // Part 2: Socket.io Multi-Client Session & Room Isolation Tests
    // -----------------------------------------------------------------
    console.log('\n▶ [Test 3] Connecting 3 concurrent Socket clients: Aarav, Priya, Rohan...');
    const clientAarav = await createClient(SERVER_URL, 'Aarav', 'avatar1.png');
    const clientPriya = await createClient(SERVER_URL, 'Priya', 'avatar2.png');
    const clientRohan = await createClient(SERVER_URL, 'Rohan', 'avatar3.png');
    console.log('   ✅ Aarav connected (ID: %s)', clientAarav.socket.id);
    console.log('   ✅ Priya connected (ID: %s)', clientPriya.socket.id);
    console.log('   ✅ Rohan connected (ID: %s)', clientRohan.socket.id);

    console.log('\n▶ [Test 4] Joining rooms: Aarav & Priya -> #developers, Rohan -> #random...');
    let priyaRosterUpdated = false;
    let rohanRosterUpdated = false;

    clientPriya.socket.on('room:userlist', (data) => {
      if (data.room === 'developers' && data.users.includes('Aarav') && data.users.includes('Priya')) {
        priyaRosterUpdated = true;
      }
    });

    clientRohan.socket.on('room:userlist', (data) => {
      if (data.room === 'random' && data.users.includes('Rohan')) {
        rohanRosterUpdated = true;
      }
    });

    clientAarav.socket.emit('room:join', { room: 'developers' });
    clientPriya.socket.emit('room:join', { room: 'developers' });
    clientRohan.socket.emit('room:join', { room: 'random' });

    await wait(400);
    assert.strictEqual(priyaRosterUpdated, true, 'Priya must receive room:userlist containing Aarav and Priya');
    assert.strictEqual(rohanRosterUpdated, true, 'Rohan must receive room:userlist containing Rohan');
    console.log('   ✅ Room roster isolation verified successfully.');

    // -----------------------------------------------------------------
    // Part 3: Debounced Typing Indicators
    // -----------------------------------------------------------------
    console.log('\n▶ [Test 5] Aarav types in #developers: verify only Priya receives typing:update, Rohan receives NOTHING...');
    let priyaSawTyping = false;
    let rohanSawTyping = false;

    clientPriya.socket.on('typing:update', (data) => {
      if (data.username === 'Aarav' && data.isTyping === true && data.room === 'developers') {
        priyaSawTyping = true;
      }
    });

    clientRohan.socket.on('typing:update', () => {
      rohanSawTyping = true;
    });

    clientAarav.socket.emit('typing:start', { room: 'developers' });
    await wait(300);

    assert.strictEqual(priyaSawTyping, true, 'Priya should receive typing indicator from Aarav');
    assert.strictEqual(rohanSawTyping, false, 'Rohan must NOT receive typing indicator from Aarav');
    console.log('   ✅ Typing indicator received by Priya and isolated from Rohan.');

    clientAarav.socket.emit('typing:stop', { room: 'developers' });
    await wait(200);

    // -----------------------------------------------------------------
    // Part 4: Group Chat Message Dispatching
    // -----------------------------------------------------------------
    console.log('\n▶ [Test 6] Aarav sends message in #developers: verify Priya receives it, Rohan does not...');
    let priyaReceivedMsg = null;
    let rohanReceivedMsg = null;

    clientPriya.socket.on('chat:receive', (data) => {
      if (data.sender === 'Aarav' && data.message === 'Hello developers!') {
        priyaReceivedMsg = data;
      }
    });

    clientRohan.socket.on('chat:receive', (data) => {
      if (data.sender === 'Aarav') {
        rohanReceivedMsg = data;
      }
    });

    clientAarav.socket.emit('chat:send', {
      room: 'developers',
      message: 'Hello developers!'
    });

    await wait(300);
    assert.ok(priyaReceivedMsg, 'Priya must receive chat:receive event');
    assert.strictEqual(priyaReceivedMsg.room, 'developers');
    assert.strictEqual(priyaReceivedMsg.sender, 'Aarav');
    assert.strictEqual(priyaReceivedMsg.message, 'Hello developers!');
    assert.strictEqual(rohanReceivedMsg, null, 'Rohan must NOT receive messages from #developers');
    console.log('   ✅ Group message delivery and room boundary verified.');

    // -----------------------------------------------------------------
    // Part 5: REST API Message Injection & Socket Broadcast
    // -----------------------------------------------------------------
    console.log('\n▶ [Test 7] Sending message via REST API (POST /api/rooms/developers/messages)...');
    let priyaReceivedApiMsg = false;
    clientPriya.socket.on('chat:receive', (data) => {
      if (data.message === 'Automated broadcast from REST API') {
        priyaReceivedApiMsg = true;
      }
    });

    const postMsgRes = await apiRequest(`${SERVER_URL}/api/rooms/developers/messages`, 'POST', {
      sender: 'SystemBot',
      message: 'Automated broadcast from REST API'
    });
    assert.strictEqual(postMsgRes.status, 201);
    await wait(300);
    assert.strictEqual(priyaReceivedApiMsg, true, 'Priya should receive REST-injected message in real time over Socket');
    console.log('   ✅ REST API message successfully broadcasted to room over Socket.io.');

    // -----------------------------------------------------------------
    // Part 6: Message History Replay
    // -----------------------------------------------------------------
    console.log('\n▶ [Test 8] Fourth user (LateJoiner) connects: verify message history replay (room:history)...');
    const clientLateJoiner = await createClient(SERVER_URL, 'LateJoiner', 'avatar4.png');
    let historyReceived = null;

    clientLateJoiner.socket.on('room:history', (data) => {
      if (data.room === 'developers') {
        historyReceived = data.messages;
      }
    });

    clientLateJoiner.socket.emit('room:join', { room: 'developers' });
    await wait(400);

    assert.ok(Array.isArray(historyReceived), 'LateJoiner must receive room:history as an array');
    assert.ok(historyReceived.length >= 2, 'History buffer must contain at least 2 prior messages');
    console.log('   ✅ Message history buffer replayed successfully (%d messages found).', historyReceived.length);

    // -----------------------------------------------------------------
    // Part 7: Private Direct Messaging (Socket & REST)
    // -----------------------------------------------------------------
    console.log('\n▶ [Test 9] Aarav sends a private direct message to Priya: verify Rohan does not receive it...');
    let priyaReceivedDm = null;
    let rohanReceivedDm = null;

    clientPriya.socket.on('direct:receive', (data) => {
      priyaReceivedDm = data;
    });

    clientRohan.socket.on('direct:receive', (data) => {
      rohanReceivedDm = data;
    });

    clientAarav.socket.emit('direct:send', {
      recipientId: clientPriya.socket.id,
      message: 'Secret DM for Priya only'
    });

    await wait(300);
    assert.ok(priyaReceivedDm, 'Priya must receive the direct message');
    assert.strictEqual(priyaReceivedDm.from, 'Aarav');
    assert.strictEqual(priyaReceivedDm.message, 'Secret DM for Priya only');
    assert.strictEqual(rohanReceivedDm, null, 'Rohan must NOT receive private DM sent to Priya');
    console.log('   ✅ Direct message delivered exclusively to target recipient.');

    // -----------------------------------------------------------------
    // Part 8: Disconnect & Cleanup
    // -----------------------------------------------------------------
    console.log('\n▶ [Test 10] Disconnecting clients and verifying cleanup...');
    clientAarav.socket.disconnect();
    clientPriya.socket.disconnect();
    clientRohan.socket.disconnect();
    clientLateJoiner.socket.disconnect();
    await wait(300);
    console.log('   ✅ All test sockets closed cleanly.');

    console.log('\n🎉 ========================================================');
    console.log('🎉 ALL BACKEND APIS & SOCKET.IO TESTS PASSED! (100/100)');
    console.log('🎉 ========================================================\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error);
    process.exit(1);
  }
}

runTests();
