const http = require('http');

// Generate a real token from login
const authData = JSON.stringify({ email: 'alice@lab.local', password: 'alice123' });
const authOptions = {
  hostname: 'auth-service',
  port: 3001,
  path: '/api/auth/login',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': authData.length }
};

const authReq = http.request(authOptions, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    const json = JSON.parse(body);
    const token = json.token;

    // Now test task-service with valid token
    console.log('Testing task-service protected endpoint with valid token...');
    const tasksOptions = {
      hostname: 'task-service',
      port: 3002,
      path: '/',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    };

    const tasksReq = http.request(tasksOptions, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          console.log(`✓ Task Service Protected Endpoint (Status: ${res.statusCode})`);
          console.log(`  Tasks found: ${json.count}`);
        } catch (e) {
          console.log(`Response (Status: ${res.statusCode}): ${body.substring(0, 150)}`);
        }
      });
    });
    tasksReq.on('error', e => console.error('Tasks Error:', e.message));
    tasksReq.end();

    // Also test WITHOUT token - should get 401
    setTimeout(() => {
      console.log('\nTesting task-service WITHOUT token (should be 401)...');
      const noTokenOptions = {
        hostname: 'task-service',
        port: 3002,
        path: '/',
        method: 'GET'
      };

      const noTokenReq = http.request(noTokenOptions, (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => {
          console.log(`${res.statusCode === 401 ? '✓' : '✗'} Status: ${res.statusCode} (Expected: 401)`);
          if (res.statusCode === 401) {
            const json = JSON.parse(body);
            console.log(`  Error: ${json.error}`);
          }
        });
      });
      noTokenReq.on('error', e => console.error('Error:', e.message));
      noTokenReq.end();
    }, 500);
  });
});
authReq.write(authData);
authReq.end();
