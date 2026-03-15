#!/bin/bash
# Test all three valid users

echo "=== TESTING LOGIN WITH CORRECT CREDENTIALS ==="
echo ""

test_login() {
  local email="$1"
  local password="$2"
  local expected_role="$3"
  
  echo "Testing: $email / $password"
  
  local response=$(docker exec final-lab-set1-auth-service-1 node -e "
const http = require('http');
const data = JSON.stringify({email: '$email', password: '$password'});
const opts = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/login',
  method: 'POST',
  headers: {'Content-Type': 'application/json', 'Content-Length': data.length}
};
const req = http.request(opts, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    console.log(res.statusCode === 200 ? 'SUCCESS' : 'FAILED');
    if (res.statusCode === 200) {
      const json = JSON.parse(body);
      console.log('Token: ' + json.token.substring(0, 30) + '...');
      console.log('User: ' + json.user.username + ' (' + json.user.role + ')');
    } else {
      console.log('Error: ' + body.substring(0, 100));
    }
  });
});
req.write(data);
req.end();
")
  
  echo "$response"
  echo ""
}

test_login "alice@lab.local" "alice123" "member"
test_login "bob@lab.local" "bob456" "member"
test_login "admin@lab.local" "adminpass" "admin"

echo "Testing WRONG credentials (should fail):"
test_login "admin@lab.local" "wrongpassword" "admin"
