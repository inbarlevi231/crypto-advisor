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
  if (parts.length < 2) return false;
  return parts.every((part) => /^[\p{L}'-]+$/u.test(part));
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function sendError(res, status, code, message) {
  return res.status(status).json({ message, code });
}

router.post('/register', async (req, res) => {
  try {
    const { email, name, password } = req.body;
    if (!email || !name || !password) {
      return sendError(res, 400, 'MISSING_FIELDS', 'Please fill in full name, email, and password.');
    }
    if (!isValidFullName(name)) {
      return sendError(
        res,
        400,
        'INVALID_FULL_NAME',
        'Please enter your full name (first and last name).'
      );
    }
    if (!isValidEmail(email)) {
      return sendError(res, 400, 'INVALID_EMAIL', 'Please enter a valid email address.');
    }
    if (String(password).length < 6) {
      return sendError(res, 400, 'WEAK_PASSWORD', 'Password must be at least 6 characters.');
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return sendError(res, 409, 'EMAIL_EXISTS', 'An account with this email already exists.');
    }

    const fullName = normalizeFullName(name);
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: normalizedEmail,
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
    return sendError(res, 500, 'SERVER_ERROR', 'Registration failed. Please try again.');
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, name, password } = req.body;
    if (!email || !name || !password) {
      return sendError(res, 400, 'MISSING_FIELDS', 'Please fill in full name, email, and password.');
    }
    if (!isValidFullName(name)) {
      return sendError(
        res,
        400,
        'INVALID_FULL_NAME',
        'Please enter your full name (first and last name).'
      );
    }
    if (!isValidEmail(email)) {
      return sendError(res, 400, 'INVALID_EMAIL', 'Please enter a valid email address.');
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user) {
      return sendError(res, 401, 'INVALID_CREDENTIALS', 'Incorrect email or password.');
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return sendError(res, 401, 'INVALID_CREDENTIALS', 'Incorrect email or password.');
    }

    const enteredName = normalizeFullName(name).toLowerCase();
    const storedName = normalizeFullName(user.name).toLowerCase();
    if (enteredName !== storedName) {
      return sendError(res, 401, 'NAME_MISMATCH', 'Full name does not match this account.');
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
    return sendError(res, 500, 'SERVER_ERROR', 'Login failed. Please try again.');
  }
});

router.get('/me', async (req, res) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return sendError(res, 401, 'AUTH_REQUIRED', 'Authentication required');
    }
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.userId).select('-passwordHash');
    if (!user) {
      return sendError(res, 401, 'USER_NOT_FOUND', 'User not found');
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
    return sendError(res, 401, 'INVALID_TOKEN', 'Invalid or expired token');
  }
});

module.exports = router;
