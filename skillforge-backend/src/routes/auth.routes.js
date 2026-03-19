const express = require('express');
const { body } = require('express-validator');
const { register, login, getMe } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// POST /api/auth/register
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2 }),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['STUDENT', 'INSTRUCTOR', 'ADMIN']).withMessage('Invalid role'),
  ],
  register
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  login
);

// GET /api/auth/me (protected)
router.get('/me', authenticate, getMe);

module.exports = router;
