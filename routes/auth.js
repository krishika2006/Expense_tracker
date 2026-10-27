import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import requireAuth from '../middleware/auth.js';

const router = Router();

function makeToken(userId) {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'development_only_change_me',
    { expiresIn: '7d' }
  );
}

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: 'Name, email and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (await User.findOne({ email: normalizedEmail })) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name: name.trim(), email: normalizedEmail, passwordHash });
    res.status(201).json({
      message: 'Account created successfully.',
      token: makeToken(user.id),
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Email already registered.' });
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: 'Incorrect email or password.' });
    }

    res.json({
      message: 'Login successful.',
      token: makeToken(user.id),
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select('name email createdAt');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json({ user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt } });
  } catch (error) {
    next(error);
  }
});

export default router;
