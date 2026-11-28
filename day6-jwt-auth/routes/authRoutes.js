const express = require('express');
const { randomUUID } = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { users } = require('../data/store');

const router = express.Router();
const SALT_ROUNDS = 12;

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function validEmail(email) {
  return typeof email === 'string' &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function coachEmails() {
  return (process.env.COACH_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (
    typeof name !== 'string' ||
    name.trim().length < 2 ||
    name.trim().length > 80 ||
    !validEmail(normalizedEmail) ||
    typeof password !== 'string' ||
    Buffer.byteLength(password) < 8 ||
    Buffer.byteLength(password) > 72
  ) {
    return res.status(400).json({
      error: 'Provide a name (2-80 characters), valid email, and password (8-72 bytes).',
    });
  }

  if (users.some((user) => user.email === normalizedEmail)) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  // Hashing is asynchronous, so check again to avoid duplicate email races.
  if (users.some((existingUser) => existingUser.email === normalizedEmail)) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const user = {
    id: randomUUID(),
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    // Roles are assigned by server configuration, never accepted from the request.
    role: coachEmails().includes(normalizedEmail) ? 'coach' : 'user',
  };

  users.push(user);
  return res.status(201).json({ user: publicUser(user) });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (
    !validEmail(normalizedEmail) ||
    typeof password !== 'string' ||
    Buffer.byteLength(password) < 1 ||
    Buffer.byteLength(password) > 72
  ) {
    return res.status(400).json({ error: 'Provide a valid email and password.' });
  }

  const user = users.find((candidate) => candidate.email === normalizedEmail);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = jwt.sign(
    { role: user.role },
    process.env.JWT_SECRET,
    { subject: user.id, expiresIn: '1h', algorithm: 'HS256' },
  );

  return res.json({ token, tokenType: 'Bearer', expiresIn: 3600, user: publicUser(user) });
});

module.exports = router;
