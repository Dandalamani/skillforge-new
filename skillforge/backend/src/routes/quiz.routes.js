const express = require('express');
const { body } = require('express-validator');
const {
  getQuizzes, getQuizById, createQuiz, generateAIQuiz,
  submitQuizAttempt, getAiUsage, publishQuiz, unpublishQuiz, deleteQuiz, updateQuiz
} = require('../controllers/quiz.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(authenticate);

router.get('/', getQuizzes);
router.get('/ai-usage', authorize('INSTRUCTOR', 'ADMIN'), getAiUsage);
router.get('/:id', getQuizById);

router.post('/', authorize('INSTRUCTOR', 'ADMIN'), [
  body('title').trim().notEmpty(),
  body('course_id').notEmpty(),
], createQuiz);

router.post('/generate-ai', authorize('INSTRUCTOR', 'ADMIN'), [
  body('topic').trim().notEmpty(),
  body('course_id').notEmpty(),
], generateAIQuiz);

router.put('/:id', authorize('INSTRUCTOR', 'ADMIN'), updateQuiz);
router.patch('/:id/publish',   authorize('INSTRUCTOR', 'ADMIN'), publishQuiz);
router.patch('/:id/unpublish', authorize('INSTRUCTOR', 'ADMIN'), unpublishQuiz);
router.delete('/:id',          authorize('INSTRUCTOR', 'ADMIN'), deleteQuiz);
router.post('/:id/attempt', authorize('STUDENT'), submitQuizAttempt);

module.exports = router;