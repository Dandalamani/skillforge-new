const express = require('express');
const { body } = require('express-validator');
const { getQuizzes, getQuizById, createQuiz, generateAIQuiz, submitQuizAttempt, getAiUsage } = require('../controllers/quiz.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(authenticate);

router.get('/', getQuizzes);
router.get('/ai-usage', authorize('INSTRUCTOR', 'ADMIN'), getAiUsage);
router.get('/:id', getQuizById);

router.post('/', authorize('INSTRUCTOR', 'ADMIN'), [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('course_id').notEmpty().withMessage('course_id is required'),
], createQuiz);

router.post('/generate-ai', authorize('INSTRUCTOR', 'ADMIN'), [
  body('topic').trim().notEmpty().withMessage('Topic is required'),
  body('course_id').notEmpty().withMessage('course_id is required'),
], generateAIQuiz);

router.post('/:id/attempt', authorize('STUDENT'), submitQuizAttempt);

module.exports = router;