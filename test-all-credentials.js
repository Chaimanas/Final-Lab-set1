const http = require('http');

function testLogin(email, password, role) {
  return new Promise((resolve) => {
    const data = JSON.stringify({ email, password });
    const opts = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    };
    
    const req = http.request(opts, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(body);
            console.log(`✓ ${email} / ${password}`);
            console.log(`  → Token: ${json.token.substring(0, 30)}...`);
            console.log(`  → User: ${json.user.username} (${json.user.role})`);
          } catch (e) {
            console.log(`✗ ${email} - Parse error: ${e.message}`);
          }
        } else {
          try {
            const json = JSON.parse(body);
            console.log(`✗ ${email} / ${password} - Status: ${res.statusCode}`);
            console.log(`  → Error: ${json.error}`);
          } catch {
            console.log(`✗ ${email} - Status: ${res.statusCode}`);
          }
        }
        resolve();
      });
    });
    
    req.on('error', (e) => {
      console.log(`✗ ${email} - Connection error: ${e.message}`);
      resolve();
    });
    
    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('=== TESTING LOGIN WITH SEEDED CREDENTIALS ===\n');
  
  await testLogin('alice@lab.local', 'alice123', 'member');
  console.log('');
  await testLogin('bob@lab.local', 'bob456', 'member');
  console.log('');
  await testLogin('admin@lab.local', 'adminpass', 'admin');
  console.log('');
  
  console.log('=== TESTING WRONG CREDENTIALS (should fail) ===\n');
  await testLogin('alice@lab.local', 'wrongpassword', 'member');
  console.log('');
  await testLogin('nonexistent@lab.local', 'anypassword', 'none');
}

runTests();
