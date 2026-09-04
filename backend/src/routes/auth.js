const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function normalizeFullName(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function isValidFullName(name) {
  const normalized = normalizeFullName(name);
  const parts = normalized.split(' ').filter(Boolean);
  // Require at least first + last name, letters (including unicode) allowed
  if (parts.length < 2) return false;
  return parts.every((part) => /^[\p{L}'-]+$/u.test(part));
}

router.post('/register', async (req, res) => {
  try {
    const { email, name, password } = req.body;
    if (!email || !name || !password) {
      return res.status(400).json({ message: 'Email, full name, and password are required' });
    }
    if (!isValidFullName(name)) {
      return res.status(400).json({
        message: 'Please enter your full name (first and last name)',
      });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existing = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const fullName = normalizeFullName(name);
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: String(email).toLowerCase().trim(),
      name: fullName,
      passwordHash,
    });

    const token = signToken(user._id);
    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        hasCompletedOnboarding: user.hasCompletedOnboarding,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, name, password } = req.body;
    if (!email || !name || !password) {
      return res.status(400).json({ message: 'Email, full name, and password are required' });
    }
    if (!isValidFullName(name)) {
      return res.status(400).json({
        message: 'Please enter your full name (first and last name)',
      });
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const enteredName = normalizeFullName(name).toLowerCase();
    const storedName = normalizeFullName(user.name).toLowerCase();
    if (enteredName !== storedName) {
      return res.status(401).json({ message: 'Full name does not match this account' });
    }

    const token = signToken(user._id);
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        hasCompletedOnboarding: user.hasCompletedOnboarding,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login failed' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.userId).select('-passwordHash');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        hasCompletedOnboarding: user.hasCompletedOnboarding,
      },
    });
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
});

module.exports = router;
