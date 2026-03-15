# Complete Login Flow Debugging Guide

## ✅ Login Flow (Now Working)

```
Browser
  ↓
1. User enters credentials in frontend login form
  ↓
2. Frontend JavaScript:
   - Collects: email, password
   - Sends: POST https://localhost/api/auth/login
   - Headers: Content-Type: application/json
  ↓
3. nginx (port 443/80)
   - Receives HTTPS request on port 443
   - Redirects HTTP (80) to HTTPS
   - Proxies to: http://auth-service:3001/api/auth/login
  ↓
4. auth-service Express.js
   - Endpoint: POST /api/auth/login
   - Middleware: express.json() parses body
   - Middleware: app.set('trust proxy', 1) for rate limiter
  ↓
5. auth-service login handler:
   - Normalizes email: String(email).trim().toLowerCase()
   - Query: SELECT * FROM users WHERE email = $1 [normalized_email]
  ↓
6. Database Connection:
   - Uses: pool.query() from pg library
   - Config: DB_HOST=postgres, DB_USER=postgres, DB_PASSWORD=postgres, DB_NAME=finaldb
   - From: .env file
  ↓
7. Password Verification:
   - If user found: bcrypt.compare(password, user.password_hash)
   - Passwords must match hash in database
  ↓
8. Generate JWT Token:
   - jwt.sign({ id, username, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES })
   - Payload: {id: 1, username: 'alice', role: 'member'}
   - Secret: From process.env.JWT_SECRET (default: 'secret')
   - Expiration: From process.env.JWT_EXPIRES (default: '1d')
  ↓
9. Return Response:
   - Status: 200 OK
   - Body: {
       message: 'Login สำเร็จ',
       token: 'eyJhbGciOiJIUzI1NiIs...',
       user: { id: 1, username: 'alice', email: 'alice@lab.local', role: 'member' }
     }
  ↓
10. Frontend stores token:
    - localStorage.setItem('jwt_token', token)
    - Loads dashboard page
```

---

## Root Cause of Login Failures

### Problem #1: Frontend Credentials Don't Match Database ❌ (FIXED)

**Before:**
- Frontend HTML hardcoded: admin@example.com / password123
- Database has: admin@lab.local / adminpass

**Result:** Login always failed with "Email or Password incorrect" for ALL users

**Solution:** Updated frontend [index.html](frontend/index.html#L384-L388) with correct credentials:
- Changed to: alice@lab.local / alice123
- Updated test credentials hint

---

## Files to Inspect for Login Issues

| File | Purpose | Check For |
|------|---------|-----------|
| [.env](\.env) | Environment variables | JWT_SECRET matches across services, DB_* vars match docker-compose.yml |
| [docker-compose.yml](docker-compose.yml#L21-L32) | Service config | PostgreSQL credentials, JWT_SECRET, environment vars |
| [auth-service/src/db/db.js](auth-service/src/db/db.js) | Database connection | Uses process.env.DB_* variables, correct connection pool setup |
| [db/init.sql](db/init.sql#L67-L69) | Database seeding | Valid bcrypt password hashes matching test credentials |
| [auth-service/src/routes/auth.js](auth-service/src/routes/auth.js#L25-L88) | Login endpoint | Email normalization, bcrypt.compare(), JWT generation |
| [auth-service/src/middleware/jwtUtils.js](auth-service/src/middleware/jwtUtils.js) | JWT handling | generateToken() and verifyToken() functions |
| [frontend/index.html](frontend/index.html#L384-L388) | Frontend form | Test credentials, API endpoint URL |
| [nginx/nginx.conf](nginx/nginx.conf) | Reverse proxy | proxy_pass to auth-service, Authorization header forwarding |

---

## Testing Login Directly

### Test 1: Login via auth-service directly
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@lab.local","password":"alice123"}'

# Expected Response (Status 200):
{
  "message": "Login สำเร็จ",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "alice",
    "email": "alice@lab.local",
    "role": "member"
  }
}
```

### Test 2: Login via nginx (through HTTPS)
```bash
curl -k -X POST https://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@lab.local","password":"alice123"}'

# Expected Response (Status 200): Same as above
```

### Test 3: Login with wrong password (should be 401)
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@lab.local","password":"wrongpassword"}'

# Expected Response (Status 401):
{"error":"Email หรือ Password ไม่ถูกต้อง"}
```

### Test 4: Verify token after login
```bash
TOKEN="<paste_token_from_login_response>"
curl -X GET http://localhost:3001/api/auth/verify \
  -H "Authorization: Bearer $TOKEN"

# Expected Response (Status 200):
{
  "valid": true,
  "user": {
    "id": 1,
    "username": "alice",
    "role": "member",
    "iat": 1234567890,
    "exp": 1234654290
  }
}
```

---

## Docker Commands for Debugging

```bash
# Check if services are running
docker ps

# View auth service logs
docker logs final-lab-set1-auth-service-1 --tail 50

# Check database users
docker exec final-lab-set1-postgres-1 \
  psql -U postgres -d finaldb \
  -c "SELECT id, email, username, role FROM users;"

# Verify password hash
docker exec final-lab-set1-postgres-1 \
  psql -U postgres -d finaldb \
  -c "SELECT email, password_hash FROM users WHERE email = 'alice@lab.local';"

# Check .env is loaded
docker exec final-lab-set1-auth-service-1 env | grep JWT_SECRET

# Test database connection from auth-service
docker exec final-lab-set1-auth-service-1 node -e \
  "const { pool } = require('./src/db/db'); \
   pool.query('SELECT COUNT(*) FROM users', (err, res) => { \
     console.log(err ? 'FAIL: ' + err.message : 'OK: ' + res.rows[0].count + ' users'); \
   });"
```

---

## Valid Test Credentials (After Fix)

✅ All working now:

| Email | Password | Role |
|-------|----------|------|
| alice@lab.local | alice123 | member |
| bob@lab.local | bob456 | member |
| admin@lab.local | adminpass | admin |

---

## Common Issues & Solutions

| Issue | Root Cause | Solution |
|-------|-----------|----------|
| "Email or Password incorrect" for all users | Frontend credentials don't match DB | Update frontend [index.html](frontend/index.html) test values |
| Login page shows empty form | Frontend HTML not updated in container | Rebuild: `docker compose up -d --build` |
| 401 on protected endpoints | Authorization header not forwarded by nginx | Add `proxy_set_header Authorization` to nginx.conf |
| Token verification fails | JWT_SECRET mismatch between services | Ensure same JWT_SECRET in .env file |
| Database connection fails | DB credentials wrong | Check .env POSTGRES_* vars match docker-compose.yml |
| Password hashes invalid | Seed SQL has placeholder hashes | Replace with valid bcrypt hashes in [db/init.sql](db/init.sql) |

---

## How to Make Login Work After Cloning

### Step 1: Create .env from template
```bash
cp .env.example .env
```

### Step 2: Verify .env has correct values
```env
POSTGRES_DB=finaldb
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
JWT_SECRET=secret
JWT_EXPIRES=1d
```

### Step 3: Build and start
```bash
docker compose down --volumes
docker compose up -d --build
```

### Step 4: Wait for services to initialize
```bash
# Wait 5-10 seconds for PostgreSQL initialization
sleep 10

# Verify services running
docker ps
```

### Step 5: Test login
```bash
# Direct test
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@lab.local","password":"alice123"}'

# Via frontend
# Open https://localhost in browser
# Login form auto-filled with: alice@lab.local / alice123
```

---

## Checklist for Login Issues

- [ ] All Docker containers running: `docker ps` shows 6 containers
- [ ] PostgreSQL healthy: `docker ps | grep postgres` shows "(healthy)"
- [ ] Users seeded in DB: `docker exec final-lab-set1-postgres-1 psql -U postgres -d finaldb -c "SELECT COUNT(*) FROM users;"`  should return 3
- [ ] .env file exists
- [ ] .env has correct credentials matching docker-compose.yml
- [ ] Password hashes in DB are valid bcrypt (start with $2a$ or $2b$)
- [ ] Frontend has correct test email/password
- [ ] nginx forwards Authorization header
- [ ] JWT_SECRET same in .env (used by auth-service)
- [ ] Test login works: `curl http://localhost:3001/api/auth/login`


## ✅ Status

**Login is now working!**

```
✓ alice@lab.local / alice123        → Token + member role
✓ bob@lab.local / bob456             → Token + member role
✓ admin@lab.local / adminpass        → Token + admin role
✓ Protected endpoints accessible with token
✓ 401 returned for missing/invalid tokens
```
