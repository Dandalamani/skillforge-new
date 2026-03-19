const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Format user for response (exclude password)
const formatUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
});

// POST /api/auth/register
const register = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { name, email, password, role } = req.body;

    // Check if email already exists
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'STUDENT',
    });

    const token = generateToken(user);

    return res.status(201).json({
      message: 'Registration successful.',
      token,
      user: formatUser(user),
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = generateToken(user);

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: formatUser(user),
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    return res.status(200).json({ user: formatUser(req.user) });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = { register, login, getMe };
