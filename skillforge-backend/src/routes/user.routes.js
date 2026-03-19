const express = require('express');
const {
  getAllUsers, getUserById, getStudentAnalytics,
  getInstructorStudents, getInstructorAnalytics, deleteUser,
} = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(authenticate);

router.get('/', authorize('ADMIN'), getAllUsers);
router.get('/students', authorize('INSTRUCTOR', 'ADMIN'), getInstructorStudents);
router.get('/instructor/analytics', authorize('INSTRUCTOR', 'ADMIN'), getInstructorAnalytics);
router.get('/me/analytics', authorize('STUDENT'), getStudentAnalytics);
router.get('/:id', authorize('ADMIN'), getUserById);
router.delete('/:id', authorize('ADMIN'), deleteUser);

module.exports = router;