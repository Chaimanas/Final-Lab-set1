const https = require('https');
const fs = require('fs');

// Disable SSL verification for testing
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

console.log('=== Full Authentication Flow Test ===\n');

// Step 1: Login via nginx
console.log('1️⃣  Login via nginx (POST https://localhost/api/auth/login)...');
const loginData = JSON.stringify({ email: 'alice@lab.local', password: 'alice123' });
const loginOptions = {
  hostname: 'nginx',
  port: 443,
  path: '/api/auth/login',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': loginData.length },
  rejectUnauthorized: false
};

let token = null;

const loginReq = https.request(loginOptions, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    if (res.statusCode === 200) {
      try {
        const json = JSON.parse(body);
        token = json.token;
        console.log(`   ✓ Status: ${res.statusCode}`);
        console.log(`   ✓ Token received: ${token.substring(0, 40)}...`);

        // Step 2: Verify token
        setTimeout(() => {
          console.log('\n2️⃣  Verify token via nginx (GET https://localhost/api/auth/verify)...');
          const verifyOptions = {
            hostname: 'nginx',
            port: 443,
            path: '/api/auth/verify',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` },
            rejectUnauthorized: false
          };

          const verifyReq = https.request(verifyOptions, (res) => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => {
              console.log(`   ✓ Status: ${res.statusCode}`);
              if (res.statusCode === 200) {
                const json = JSON.parse(body);
                console.log(`   ✓ User: ${json.user.username} (${json.user.role})`);
              } else {
                console.log(`   Error: ${body}`);
              }

              // Step 3: Access protected endpoint
              setTimeout(() => {
                console.log('\n3️⃣  Access protected endpoint (GET https://localhost/api/tasks)...');
                const tasksOptions = {
                  hostname: 'nginx',
                  port: 443,
                  path: '/api/tasks',
                  method: 'GET',
                  headers: { 'Authorization': `Bearer ${token}` },
                  rejectUnauthorized: false
                };

                const tasksReq = https.request(tasksOptions, (res) => {
                  let body = '';
                  res.on('data', d => body += d);
                  res.on('end', () => {
                    console.log(`   ${res.statusCode === 200 ? '✓' : '✗'} Status: ${res.statusCode}`);
                    if (res.statusCode === 200) {
                      try {
                        const json = JSON.parse(body);
                        console.log(`   ✓ Tasks retrieved: ${json.count} items`);
                      } catch {
                        console.log(`   Response: ${body.substring(0, 100)}`);
                      }
                    } else {
                      console.log(`   Error: ${body.substring(0, 100)}`);
                    }

                    // Step 4: Test WITHOUT token
                    setTimeout(() => {
                      console.log('\n4️⃣  Test 401 (without token)...');
                      const noTokenOptions = {
                        hostname: 'nginx',
                        port: 443,
                        path: '/api/tasks',
                        method: 'GET',
                        rejectUnauthorized: false
                      };

                      const noTokenReq = https.request(noTokenOptions, (res) => {
                        let body = '';
                        res.on('data', d => body += d);
                        res.on('end', () => {
                          console.log(`   ${res.statusCode === 401 ? '✓' : '✗'} Status: ${res.statusCode} (Expected: 401)`);
                          if (res.statusCode === 401) {
                            const json = JSON.parse(body);
                            console.log(`   ✓ Error: ${json.error}`);
                          }
                          process.exit(0);
                        });
                      });
                      noTokenReq.on('error', e => {
                        console.log(`Error: ${e.message}`);
                        process.exit(1);
                      });
                      noTokenReq.end();
                    }, 300);
                  });
                });
                tasksReq.on('error', e => {
                  console.log(`Error: ${e.message}`);
                  process.exit(1);
                });
                tasksReq.end();
              }, 300);
            });
          });
          verifyReq.on('error', e => {
            console.log(`Error: ${e.message}`);
            process.exit(1);
          });
          verifyReq.end();
        }, 300);
      } catch (e) {
        console.log(`   Error parsing response: ${e.message}`);
        process.exit(1);
      }
    } else {
      console.log(`   ✗ Status: ${res.statusCode}`);
      console.log(`   Error: ${body.substring(0, 100)}`);
      process.exit(1);
    }
  });
});
loginReq.on('error', e => {
  console.log(`Error: ${e.message}`);
  process.exit(1);
});
loginReq.write(loginData);
loginReq.end();
