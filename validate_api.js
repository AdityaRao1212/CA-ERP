const http = require('http');

const request = (options, body) => new Promise((resolve, reject) => {
  const req = http.request(options, (res) => {
    const chunks = [];
    res.on('data', (chunk) => chunks.push(chunk));
    res.on('end', () => {
      const payload = Buffer.concat(chunks).toString('utf8');
      let data;
      try {
        data = JSON.parse(payload);
      } catch (e) {
        data = payload;
      }
      resolve({ status: res.statusCode, data });
    });
  });
  req.on('error', reject);
  if (body) {
    req.write(body);
  }
  req.end();
});

const postJson = (path, body, token) => request({
  hostname: 'localhost',
  port: 3001,
  path,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  },
}, body);

const getJson = (path, token) => request({
  hostname: 'localhost',
  port: 3001,
  path,
  method: 'GET',
  headers: {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  },
});

(async () => {
  try {
    const login = await postJson('/auth/login', JSON.stringify({ username: 'alex', password: 'password123' }));
    console.log('login', login.status, login.data);
    if (!login.data || !login.data.token) return;
    const token = login.data.token;
    const users = await getJson('/users', token);
    console.log('users', users.status, users.data);
    const tickets = await getJson('/tickets', token);
    console.log('ticketsCount', Array.isArray(tickets.data) ? tickets.data.length : tickets.data);
    const created = await postJson('/tickets', JSON.stringify({
      title: 'Integration test ticket',
      description: 'Created during integration test',
      category: 'BUG',
      priority: 'LOW',
      severity: 'LOW',
      assignedToId: 2,
      dueDate: '2026-12-31',
    }), token);
    console.log('create', created.status, created.data);
  } catch (error) {
    console.error('error', error);
    process.exit(1);
  }
})();
