const Feedback = require('../models/Feedback');
const Quiz     = require('../models/Quiz');
const Course   = require('../models/Course');
const User     = require('../models/User');

// POST /api/feedback
const submitFeedback = async (req, res) => {
  try {
    const { quiz_id, rating, comment } = req.body;
    const student_id = req.user.id;

    if (!quiz_id || !rating) return res.status(400).json({ message: 'quiz_id and rating are required.' });
    if (rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be 1-5.' });

    // Fetch quiz and course separately — avoids association dependency
    const quiz    = await Quiz.findByPk(quiz_id);
    const student = await User.findByPk(student_id, { attributes: ['name'] });

    // Try to get course title safely
    let course_title = '';
    if (quiz && quiz.course_id) {
      const course = await Course.findByPk(quiz.course_id, { attributes: ['title'] });
      course_title = course?.title || '';
    }

    const existing = await Feedback.findOne({ where: { quiz_id, student_id } });
    if (existing) {
      await existing.update({ rating, comment: comment || '' });
      return res.status(200).json({ message: 'Feedback updated.', feedback: existing });
    }

    const feedback = await Feedback.create({
      quiz_id,
      student_id,
      rating,
      comment:      comment || '',
      quiz_title:   quiz?.title        || '',
      course_title: course_title,
      student_name: student?.name      || 'Student',
    });

    return res.status(201).json({ message: 'Feedback submitted. Thank you!', feedback });
  } catch (err) {
    console.error('submitFeedback error:', err);
    return res.status(500).json({ message: err.message || 'Internal server error.' });
  }
};

// GET /api/feedback
const getFeedback = async (req, res) => {
  try {
    const feedbacks = await Feedback.findAll({ order: [['createdAt', 'DESC']] });
    const avgRating = feedbacks.length
      ? parseFloat((feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(1))
      : null;
    return res.status(200).json({ feedbacks, avgRating, total: feedbacks.length });
  } catch (err) {
    console.error('getFeedback error:', err);
    return res.status(500).json({ message: err.message || 'Internal server error.' });
  }
};

module.exports = { submitFeedback, getFeedback };