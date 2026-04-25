const express = require('express');
const { body } = require('express-validator');
const {
  getAllCourses, getCourseById, createCourse, updateCourse, deleteCourse,
} = require('../controllers/course.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);

router.get('/', getAllCourses);
router.get('/:id', getCourseById);

router.post(
  '/',
  authorize('INSTRUCTOR', 'ADMIN'),
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('difficulty_level').optional().isIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  ],
  createCourse
);

router.put('/:id', authorize('INSTRUCTOR', 'ADMIN'), updateCourse);
router.delete('/:id', authorize('INSTRUCTOR', 'ADMIN'), deleteCourse);

module.exports = router;