const CourseContent = require('../models/CourseContent');
const Course = require('../models/Course');
const path = require('path');
const fs = require('fs');

/* =========================
   COURSE CRUD OPERATIONS
========================= */

// GET /api/courses
const getAllCourses = async (req, res) => {
  try {
    const courses = await Course.findAll();
    return res.status(200).json({ courses });
  } catch (err) {
    console.error('getAllCourses error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/courses/:id
const getCourseById = async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found.' });

    return res.status(200).json({ course });
  } catch (err) {
    console.error('getCourseById error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// POST /api/courses
const createCourse = async (req, res) => {
  try {
    const course = await Course.create({
      ...req.body,
      instructor_id: req.user.id,
    });

    return res.status(201).json({
      message: 'Course created successfully.',
      course,
    });
  } catch (err) {
    console.error('createCourse error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// PUT /api/courses/:id
const updateCourse = async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    await course.update(req.body);

    return res.status(200).json({
      message: 'Course updated successfully.',
      course,
    });
  } catch (err) {
    console.error('updateCourse error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// DELETE /api/courses/:id
const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    await course.destroy();

    return res.status(200).json({
      message: 'Course deleted successfully.',
    });
  } catch (err) {
    console.error('deleteCourse error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

/* =========================
   COURSE CONTENT FEATURES
========================= */

// GET /api/courses/:courseId/contents
const getContents = async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.courseId);
    if (!course) return res.status(404).json({ message: 'Course not found.' });

    const contents = await CourseContent.findAll({
      where: { course_id: req.params.courseId },
      order: [['order_index', 'ASC'], ['createdAt', 'ASC']],
    });

    return res.status(200).json({ contents });
  } catch (err) {
    console.error('getContents error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// POST /api/courses/:courseId/contents/link
const addLink = async (req, res) => {
  try {
    const { title, url, description } = req.body;

    if (!title || !url) {
      return res.status(400).json({ message: 'Title and URL are required.' });
    }

    const course = await Course.findByPk(req.params.courseId);
    if (!course) return res.status(404).json({ message: 'Course not found.' });

    if (course.instructor_id !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Not authorized.' });
    }

    const maxOrder =
      (await CourseContent.max('order_index', {
        where: { course_id: req.params.courseId },
      })) || 0;

    const content = await CourseContent.create({
      course_id: req.params.courseId,
      title,
      url,
      description,
      type: 'LINK',
      order_index: maxOrder + 1,
    });

    return res.status(201).json({
      message: 'Link added.',
      content,
    });
  } catch (err) {
    console.error('addLink error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// POST /api/courses/:courseId/contents/upload
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const course = await Course.findByPk(req.params.courseId);
    if (!course) return res.status(404).json({ message: 'Course not found.' });

    if (course.instructor_id !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Not authorized.' });
    }

    const { title, description } = req.body;

    const ext = path.extname(req.file.originalname).toLowerCase();
    const type = ext === '.pdf' ? 'PDF' : 'VIDEO';

    const fileUrl = `/uploads/${req.file.filename}`;

    const maxOrder =
      (await CourseContent.max('order_index', {
        where: { course_id: req.params.courseId },
      })) || 0;

    const content = await CourseContent.create({
      course_id: req.params.courseId,
      title: title || req.file.originalname,
      description,
      type,
      file_path: req.file.filename,
      file_name: req.file.originalname,
      file_size: req.file.size,
      url: fileUrl,
      order_index: maxOrder + 1,
    });

    return res.status(201).json({
      message: `${type} uploaded.`,
      content,
    });
  } catch (err) {
    console.error('uploadFile error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// DELETE /api/courses/:courseId/contents/:id
const deleteContent = async (req, res) => {
  try {
    const content = await CourseContent.findOne({
      where: { id: req.params.id, course_id: req.params.courseId },
    });

    if (!content) {
      return res.status(404).json({ message: 'Content not found.' });
    }

    const course = await Course.findByPk(req.params.courseId);

    if (course.instructor_id !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Not authorized.' });
    }

    if (content.file_path) {
      const filePath = path.join(__dirname, '../../uploads', content.file_path);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await content.destroy();

    return res.status(200).json({ message: 'Content deleted.' });
  } catch (err) {
    console.error('deleteContent error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// PUT /api/courses/:courseId/contents/:id
const updateContent = async (req, res) => {
  try {
    const content = await CourseContent.findOne({
      where: { id: req.params.id, course_id: req.params.courseId },
    });

    if (!content) {
      return res.status(404).json({ message: 'Content not found.' });
    }

    const { title, description, url } = req.body;

    await content.update({
      title,
      description,
      ...(content.type === 'LINK' ? { url } : {}),
    });

    return res.status(200).json({
      message: 'Updated.',
      content,
    });
  } catch (err) {
    console.error('updateContent error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

/* =========================
   EXPORTS
========================= */

module.exports = {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  getContents,
  addLink,
  uploadFile,
  deleteContent,
  updateContent,
};