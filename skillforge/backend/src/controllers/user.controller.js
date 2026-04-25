const User = require('../models/User');
const QuizAttempt = require('../models/QuizAttempt');
const Quiz = require('../models/Quiz');
const Course = require('../models/Course');
const { Op } = require('sequelize');

// GET /api/users — admin only
const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
    });
    return res.status(200).json({ users });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/users/students — instructor: get all students enrolled in their courses
const getInstructorStudents = async (req, res) => {
  try {
    // Get all students (STUDENT role) registered in the system
    const students = await User.findAll({
      where: { role: 'STUDENT' },
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
    });

    // For each student, count their quiz attempts
    const studentData = await Promise.all(students.map(async (student) => {
      const attempts = await QuizAttempt.findAll({
        where: { student_id: student.id, completed: true },
      });

      const avgScore = attempts.length > 0
        ? (attempts.reduce((sum, a) => sum + parseFloat(a.score || 0), 0) / attempts.length).toFixed(1)
        : null;

      // Last active = most recent attempt
      const lastAttempt = await QuizAttempt.findOne({
        where: { student_id: student.id },
        order: [['attempt_time', 'DESC']],
      });

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        quizAttempts: attempts.length,
        avgScore: avgScore ? parseFloat(avgScore) : null,
        joinedAt: student.createdAt,
        lastActive: lastAttempt ? lastAttempt.attempt_time : student.createdAt,
      };
    }));

    return res.status(200).json({ students: studentData });
  } catch (error) {
    console.error('getInstructorStudents error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/users/instructor/analytics — instructor analytics from real data
const getInstructorAnalytics = async (req, res) => {
  try {
    const instructorId = req.user.id;

    // Get instructor's courses
    const courses = await Course.findAll({
      where: { instructor_id: instructorId },
    });

    const totalCourses = courses.length;
    const publishedCourses = courses.filter(c => c.status === 'PUBLISHED').length;

    // Count all quizzes for instructor's courses
    const courseIds = courses.map(c => c.id);
    let totalQuizzes = 0;
    let totalAttempts = 0;
    let totalScore = 0;
    let passCount = 0;

    const courseStats = await Promise.all(courses.map(async (course) => {
      const quizzes = await Quiz.findAll({ where: { course_id: course.id } });
      const quizIds = quizzes.map(q => q.id);
      totalQuizzes += quizzes.length;

      if (quizIds.length === 0) {
        return { courseId: course.id, title: course.title, attempts: 0, avgScore: null, passRate: null };
      }

      const attempts = await QuizAttempt.findAll({
        where: { quiz_id: { [Op.in]: quizIds }, completed: true },
      });

      totalAttempts += attempts.length;
      const courseAvg = attempts.length > 0
        ? attempts.reduce((sum, a) => sum + parseFloat(a.score || 0), 0) / attempts.length
        : null;
      const coursePasses = attempts.filter(a => parseFloat(a.score) >= 60).length;

      if (courseAvg !== null) totalScore += courseAvg;
      passCount += coursePasses;

      return {
        courseId: course.id,
        title: course.title,
        quizCount: quizzes.length,
        attempts: attempts.length,
        avgScore: courseAvg !== null ? parseFloat(courseAvg.toFixed(1)) : null,
        passRate: attempts.length > 0 ? parseFloat(((coursePasses / attempts.length) * 100).toFixed(1)) : null,
      };
    }));

    // Count total students
    const totalStudents = await User.count({ where: { role: 'STUDENT' } });

    const overallAvgScore = courseStats.filter(c => c.avgScore !== null).length > 0
      ? (courseStats.filter(c => c.avgScore !== null).reduce((s, c) => s + c.avgScore, 0) / courseStats.filter(c => c.avgScore !== null).length).toFixed(1)
      : null;

    const overallPassRate = totalAttempts > 0
      ? ((passCount / totalAttempts) * 100).toFixed(1)
      : null;

    return res.status(200).json({
      analytics: {
        totalCourses,
        publishedCourses,
        totalQuizzes,
        totalAttempts,
        totalStudents,
        overallAvgScore: overallAvgScore ? parseFloat(overallAvgScore) : null,
        overallPassRate: overallPassRate ? parseFloat(overallPassRate) : null,
        courseStats,
      },
    });
  } catch (error) {
    console.error('getInstructorAnalytics error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/users/me/analytics — student analytics
const getStudentAnalytics = async (req, res) => {
  try {
    const studentId = req.user.id;
    const attempts = await QuizAttempt.findAll({
      where: { student_id: studentId, completed: true },
      include: [{ model: Quiz, as: 'quiz', include: [{ model: Course, as: 'course' }] }],
      order: [['attempt_time', 'ASC']],
    });

    const totalAttempts = attempts.length;
    const avgScore = totalAttempts > 0
      ? (attempts.reduce((sum, a) => sum + parseFloat(a.score || 0), 0) / totalAttempts).toFixed(2)
      : 0;

    const topicPerformance = {};
    for (const attempt of attempts) {
      const topic = attempt.quiz?.course?.title || 'Unknown';
      if (!topicPerformance[topic]) topicPerformance[topic] = { total: 0, count: 0 };
      topicPerformance[topic].total += parseFloat(attempt.score || 0);
      topicPerformance[topic].count += 1;
    }

    const topicStats = Object.entries(topicPerformance).map(([topic, data]) => ({
      topic, avgScore: (data.total / data.count).toFixed(2), attempts: data.count,
    }));

    const progressOverTime = attempts.map((a) => ({
      date: a.attempt_time, score: parseFloat(a.score), quizTitle: a.quiz?.title,
    }));

    return res.status(200).json({ analytics: { totalAttempts, avgScore, topicStats, progressOverTime } });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// DELETE /api/users/:id — admin only
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    await user.destroy();
    return res.status(200).json({ message: 'User deleted.' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, { attributes: { exclude: ['password'] } });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = { getAllUsers, getUserById, getStudentAnalytics, getInstructorStudents, getInstructorAnalytics, deleteUser };