const express = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { getDashboard, getCourses, getCourseContent, markCourseStarted, getQuizzes, getProgress } = require('../controllers/student.controller');

const router = express.Router();
router.use(authenticate, authorize('STUDENT'));

router.get('/dashboard', getDashboard);
router.get('/courses', getCourses);
router.get('/courses/:courseId/content', getCourseContent);
router.post('/courses/:courseId/start', markCourseStarted);
router.get('/quizzes', getQuizzes);
router.get('/progress', getProgress);

module.exports = router;