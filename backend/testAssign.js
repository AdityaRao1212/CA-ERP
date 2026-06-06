const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(body) });
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

(async () => {
  try {
    const loginResult = await request({
      hostname: 'localhost',
      port: 3001,
      path: '/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, { username: 'manager', password: 'manager123' });

    console.log('login status', loginResult.statusCode);
    console.log(loginResult.body);

    const token = loginResult.body.token;
    const assignResult = await request({
      hostname: 'localhost',
      port: 3001,
      path: '/risks/1/assign',
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }, { assignee: 'manager', comments: 'Assigning risk for review' });

    console.log('assign status', assignResult.statusCode);
    console.log(assignResult.body);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
