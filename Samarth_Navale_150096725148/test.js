const app = require('./server');
const server = app.server;
const { io: ioClient } = require('socket.io-client');
const request = require('supertest');

const PORT = 5066;

const runTests = async () => {
  let passed = 0;
  let total = 0;

  const assert = (condition, name) => {
    total++;
    if (condition) {
      console.log(`PASS: ${name}`);
      passed++;
    } else {
      console.error(`FAIL: ${name}`);
    }
  };

  await new Promise((resolve) => server.listen(PORT, resolve));

  const clientUrl = `http://localhost:${PORT}`;

  try {
    const statusRes = await request(app).get('/api/status');
    assert(statusRes.status === 200 && statusRes.body.success, 'HTTP - API status endpoint');

    const socketA = ioClient(clientUrl, { reconnection: false });
    const socketB = ioClient(clientUrl, { reconnection: false });
    const socketC = ioClient(clientUrl, { reconnection: false });

    await new Promise((resolve) => socketA.on('connect', resolve));
    await new Promise((resolve) => socketB.on('connect', resolve));
    await new Promise((resolve) => socketC.on('connect', resolve));
    assert(socketA.connected && socketB.connected && socketC.connected, 'Socket.io - 3 clients connected');

    socketA.emit('user:login', { username: 'Aarav' });
    socketB.emit('user:login', { username: 'Priya' });
    socketC.emit('user:login', { username: 'Rohan' });

    const userListPromiseB = new Promise((resolve) => {
      socketB.on('room:userlist', (data) => {
        if (data.room === 'developers' && data.users.includes('Aarav') && data.users.includes('Priya')) {
          resolve(data);
        }
      });
    });

    socketA.emit('room:join', { room: 'developers' });
    socketB.emit('room:join', { room: 'developers' });
    socketC.emit('room:join', { room: 'random' });

    const userlistData = await userListPromiseB;
    assert(userlistData.users.length >= 2, 'Socket.io - Room joining & userlist broadcast');

    let rohanGotTyping = false;
    socketC.on('typing:update', () => {
      rohanGotTyping = true;
    });

    const typingPromiseB = new Promise((resolve) => {
      socketB.on('typing:update', (data) => {
        resolve(data);
      });
    });

    socketA.emit('typing:start', { room: 'developers' });
    const typingData = await typingPromiseB;
    assert(typingData.username === 'Aarav' && typingData.isTyping && !rohanGotTyping, 'Socket.io - Room isolated typing indicator');

    let rohanGotMsg = false;
    socketC.on('chat:receive', () => {
      rohanGotMsg = true;
    });

    const chatPromiseB = new Promise((resolve) => {
      socketB.on('chat:receive', (data) => {
        resolve(data);
      });
    });

    socketA.emit('chat:send', { room: 'developers', message: 'Hello team!' });
    const chatData = await chatPromiseB;
    assert(chatData.sender === 'Aarav' && chatData.message === 'Hello team!' && !rohanGotMsg, 'Socket.io - Room chat broadcasting');

    const socketD = ioClient(clientUrl, { reconnection: false });
    await new Promise((resolve) => socketD.on('connect', resolve));
    socketD.emit('user:login', { username: 'Deepak' });

    const historyPromiseD = new Promise((resolve) => {
      socketD.on('room:history', (data) => {
        resolve(data);
      });
    });

    socketD.emit('room:join', { room: 'developers' });
    const historyData = await historyPromiseD;
    assert(historyData.messages.some((m) => m.message === 'Hello team!'), 'Socket.io - Message history hydration for new joiner');

    const dmPromiseB = new Promise((resolve) => {
      socketB.on('direct:receive', (data) => {
        resolve(data);
      });
    });

    socketA.emit('direct:send', {
      recipientId: socketB.id,
      message: 'Secret DM'
    });

    const dmData = await dmPromiseB;
    assert(dmData.from === 'Aarav' && dmData.message === 'Secret DM', 'Socket.io - Private Direct Messaging');

    socketA.disconnect();
    socketB.disconnect();
    socketC.disconnect();
    socketD.disconnect();
    server.close();

    console.log(`\nTests completed: ${passed}/${total} passed`);
    process.exit(passed === total ? 0 : 1);
  } catch (err) {
    console.error('Test error:', err);
    server.close();
    process.exit(1);
  }
};

runTests();
