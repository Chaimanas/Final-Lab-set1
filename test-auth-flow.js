const http = require('http');

// Test 1: Login
console.log('=== TEST 1: Login ===');
const loginData = JSON.stringify({ email: 'alice@lab.local', password: 'alice123' });
const loginOptions = {
  hostname: 'auth-service',
  port: 3001,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

const loginReq = http.request(loginOptions, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    if (res.statusCode === 200) {
      const json = JSON.parse(body);
      const token = json.token;
      console.log(`✓ Login Success (Status: ${res.statusCode})`);
      console.log(`Token: ${token.substring(0, 50)}...`);

      // Test 2: Verify endpoint with token
      console.log('\n=== TEST 2: Verify Token ===');
      const verifyOptions = {
        hostname: 'auth-service',
        port: 3001,
        path: '/api/auth/verify',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      const verifyReq = http.request(verifyOptions, (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => {
          if (res.statusCode === 200) {
            const json = JSON.parse(body);
            console.log(`✓ Token Valid (Status: ${res.statusCode})`);
            console.log(`Decoded: ${JSON.stringify(json.user)}`);
          } else {
            console.log(`✗ Token Verification Failed (Status: ${res.statusCode})`);
            console.log(`Error: ${body}`);
          }
        });
      });
      verifyReq.on('error', e => console.error('Verify Error:', e.message));
      verifyReq.end();

      // Test 3: Protected endpoint (task-service) with token
      setTimeout(() => {
        console.log('\n=== TEST 3: Protected Endpoint (GET /api/tasks) ===');
        const tasksOptions = {
          hostname: 'task-service',
          port: 3002,
          path: '/',
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        };

        const tasksReq = http.request(tasksOptions, (res) => {
          let body = '';
          res.on('data', d => body += d);
          res.on('end', () => {
            if (res.statusCode === 200) {
              const json = JSON.parse(body);
              console.log(`✓ Protected Endpoint Success (Status: ${res.statusCode})`);
              console.log(`Tasks: ${json.tasks.length} rows`);
            } else {
              console.log(`✗ Protected Endpoint Failed (Status: ${res.statusCode})`);
              console.log(`Error: ${body}`);
            }
            process.exit(0);
          });
        });
        tasksReq.on('error', e => console.error('Tasks Error:', e.message));
        tasksReq.end();
      }, 500);
    } else {
      console.log(`✗ Login Failed (Status: ${res.statusCode})`);
      console.log(`Error: ${body}`);
      process.exit(1);
    }
  });
});
loginReq.on('error', e => console.error('Login Error:', e.message));
loginReq.write(loginData);
loginReq.end();
