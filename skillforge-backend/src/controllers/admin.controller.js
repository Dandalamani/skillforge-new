const User = require('../models/User');
const Course = require('../models/Course');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const { Op } = require('sequelize');

// GET /api/admin/dashboard
const getDashboard = async (req, res) => {
  try {
    const totalUsers = await User.count();
    const totalStudents = await User.count({ where: { role: 'STUDENT' } });
    const totalInstructors = await User.count({ where: { role: 'INSTRUCTOR' } });
    const totalCourses = await Course.count();
    const publishedCourses = await Course.count({ where: { status: 'PUBLISHED' } });
    const totalQuizzes = await Quiz.count();
    const aiQuizzes = await Quiz.count({ where: { generated_by_ai: true } });
    const totalAttempts = await QuizAttempt.count({ where: { completed: true } });

    // Recent registrations (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentUsers = await User.findAll({
      where: { createdAt: { [Op.gte]: sevenDaysAgo } },
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
      limit: 10,
    });

    return res.status(200).json({
      dashboard: {
        totalUsers, totalStudents, totalInstructors,
        totalCourses, publishedCourses,
        totalQuizzes, aiQuizzes, totalAttempts,
        recentUsers,
      },
    });
  } catch (err) {
    console.error('admin getDashboard error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/admin/users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
    });
    // Enrich with attempt counts
    const enriched = await Promise.all(users.map(async (u) => {
      const attempts = u.role === 'STUDENT'
        ? await QuizAttempt.count({ where: { student_id: u.id, completed: true } })
        : null;
      return { ...u.toJSON(), attempts };
    }));
    return res.status(200).json({ users: enriched });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.id === req.user.id) return res.status(400).json({ message: 'Cannot delete yourself.' });
    await user.destroy();
    return res.status(200).json({ message: 'User deleted.' });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/admin/courses
const getAllCourses = async (req, res) => {
  try {
    const courses = await Course.findAll({
      include: [
        { model: User, as: 'instructor', attributes: ['id', 'name', 'email'] },
        { model: Quiz, as: 'quizzes', attributes: ['id'] },
      ],
      order: [['createdAt', 'DESC']],
    });
    const enriched = courses.map(c => ({
      id: c.id,
      title: c.title,
      description: c.description,
      status: c.status,
      difficulty: c.difficulty_level,
      instructor: c.instructor?.name ?? 'Unknown',
      instructorEmail: c.instructor?.email,
      quizCount: c.quizzes?.length ?? 0,
      createdAt: c.createdAt,
    }));
    return res.status(200).json({ courses: enriched });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// DELETE /api/admin/courses/:id
const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found.' });
    await course.destroy();
    return res.status(200).json({ message: 'Course deleted.' });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/admin/reports
const getReports = async (req, res) => {
  try {
    const totalUsers = await User.count();
    const totalCourses = await Course.count();
    const totalQuizzes = await Quiz.count();
    const totalAttempts = await QuizAttempt.count({ where: { completed: true } });

    const attempts = await QuizAttempt.findAll({ where: { completed: true } });
    const avgScore = attempts.length > 0
      ? parseFloat((attempts.reduce((s, a) => s + parseFloat(a.score || 0), 0) / attempts.length).toFixed(1))
      : null;
    const passed = attempts.filter(a => parseFloat(a.score) >= 60).length;
    const passRate = attempts.length > 0 ? parseFloat(((passed / attempts.length) * 100).toFixed(1)) : null;

    // Users by role
    const students = await User.count({ where: { role: 'STUDENT' } });
    const instructors = await User.count({ where: { role: 'INSTRUCTOR' } });
    const admins = await User.count({ where: { role: 'ADMIN' } });

    // Courses by status
    const published = await Course.count({ where: { status: 'PUBLISHED' } });
    const draft = await Course.count({ where: { status: 'DRAFT' } });

    // AI vs manual quizzes
    const aiQuizzes = await Quiz.count({ where: { generated_by_ai: true } });
    const manualQuizzes = totalQuizzes - aiQuizzes;

    return res.status(200).json({
      reports: {
        totalUsers, totalCourses, totalQuizzes, totalAttempts,
        avgScore, passRate,
        usersByRole: { students, instructors, admins },
        coursesByStatus: { published, draft },
        quizzesByType: { ai: aiQuizzes, manual: manualQuizzes },
      },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/admin/ai-logs
const getAiLogs = async (req, res) => {
  try {
    const aiQuizzes = await Quiz.findAll({
      where: { generated_by_ai: true },
      include: [{ model: Course, as: 'course', attributes: ['id', 'title'] }],
      order: [['createdAt', 'DESC']],
    });
    const logs = aiQuizzes.map(q => ({
      id: q.id,
      quizTitle: q.title,
      course: q.course?.title ?? 'Unknown',
      difficulty: q.difficulty_level,
      createdAt: q.createdAt,
    }));
    return res.status(200).json({ logs, total: logs.length });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = { getDashboard, getAllUsers, deleteUser, getAllCourses, deleteCourse, getReports, getAiLogs };