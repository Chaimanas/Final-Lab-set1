const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET || 'engse207-super-secret-change-in-production-abc123';
const expires = process.env.JWT_EXPIRES || '1h';

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    secret,
    { expiresIn: expires }
  );
};

module.exports = { generateToken, secret };