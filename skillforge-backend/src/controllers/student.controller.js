const User = require('../models/User');
const Course = require('../models/Course');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const Question = require('../models/Question');
const { Op } = require('sequelize');

// GET /api/student/dashboard — overview stats + enrolled courses + upcoming quizzes
const getDashboard = async (req, res) => {
  try {
    const studentId = req.user.id;

    // All published courses (student sees all available)
    const allCourses = await Course.findAll({
      where: { status: 'PUBLISHED' },
      include: [{ model: Quiz, as: 'quizzes' }],
      order: [['createdAt', 'DESC']],
    });

    // All quiz attempts by this student
    const attempts = await QuizAttempt.findAll({
      where: { student_id: studentId, completed: true },
    });

    const totalAttempts = attempts.length;
    const avgScore = totalAttempts > 0
      ? parseFloat((attempts.reduce((s, a) => s + parseFloat(a.score || 0), 0) / totalAttempts).toFixed(1))
      : null;

    // Upcoming quizzes = quizzes not yet attempted
    const attemptedQuizIds = attempts.map(a => Number(a.quiz_id));
    const allQuizzes = await Quiz.findAll({
      include: [{ model: Course, as: 'course', where: { status: 'PUBLISHED' } }],
      order: [['createdAt', 'DESC']],
    });
    const upcomingQuizzes = allQuizzes
      .filter(q => !attemptedQuizIds.includes(Number(q.id)))
      .slice(0, 5)
      .map(q => ({
        id: q.id,
        title: q.title,
        course: q.course?.title,
        difficulty: q.difficulty_level,
        timeLimit: q.time_limit_minutes,
      }));

    return res.status(200).json({
      dashboard: {
        totalCourses: allCourses.length,
        totalAttempts,
        avgScore,
        upcomingQuizzes,
        recentCourses: allCourses.slice(0, 4).map(c => ({
          id: c.id,
          title: c.title,
          difficulty: c.difficulty_level,
          quizCount: c.quizzes?.length ?? 0,
        })),
      },
    });
  } catch (err) {
    console.error('getDashboard error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/student/courses — all published courses
const getCourses = async (req, res) => {
  try {
    const studentId = req.user.id;
    const courses = await Course.findAll({
      where: { status: 'PUBLISHED' },
      include: [
        { model: Quiz, as: 'quizzes' },
        { model: User, as: 'instructor', attributes: ['id', 'name', 'email'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    // For each course, check how many quizzes student attempted
    const enriched = await Promise.all(courses.map(async (c) => {
      const quizIds = (c.quizzes || []).map(q => q.id);
      const attempted = quizIds.length > 0
        ? await QuizAttempt.count({ where: { student_id: studentId, quiz_id: { [Op.in]: quizIds }, completed: true } })
        : 0;
      return {
        id: c.id,
        title: c.title,
        description: c.description,
        difficulty: c.difficulty_level,
        instructor: c.instructor?.name ?? 'Unknown',
        quizCount: quizIds.length,
        attempted,
        createdAt: c.createdAt,
      };
    }));

    return res.status(200).json({ courses: enriched });
  } catch (err) {
    console.error('getCourses error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/student/quizzes — all available quizzes with attempt status
const getQuizzes = async (req, res) => {
  try {
    const studentId = req.user.id;
    const quizzes = await Quiz.findAll({
      include: [{ model: Course, as: 'course', where: { status: 'PUBLISHED' } }],
      order: [['createdAt', 'DESC']],
    });

    const attempts = await QuizAttempt.findAll({
      where: { student_id: studentId, completed: true },
    });
    const attemptMap = {};
    for (const a of attempts) {
      attemptMap[Number(a.quiz_id)] = { score: parseFloat(a.score), attemptTime: a.attempt_time };
    }

    const enriched = quizzes.map(q => ({
      id: q.id,
      title: q.title,
      description: q.description,
      course: q.course?.title,
      courseId: q.course_id,
      difficulty: q.difficulty_level,
      timeLimit: q.time_limit_minutes,
      generatedByAi: q.generated_by_ai,
      attempted: !!attemptMap[Number(q.id)],
      score: attemptMap[Number(q.id)]?.score ?? null,
      attemptTime: attemptMap[Number(q.id)]?.attemptTime ?? null,
    }));

    return res.status(200).json({ quizzes: enriched });
  } catch (err) {
    console.error('getQuizzes error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/student/progress — analytics per course/quiz
const getProgress = async (req, res) => {
  try {
    const studentId = req.user.id;
    const attempts = await QuizAttempt.findAll({
      where: { student_id: studentId, completed: true },
      include: [{
        model: Quiz, as: 'quiz',
        include: [{ model: Course, as: 'course' }],
      }],
      order: [['attempt_time', 'ASC']],
    });

    const totalAttempts = attempts.length;
    const avgScore = totalAttempts > 0
      ? parseFloat((attempts.reduce((s, a) => s + parseFloat(a.score || 0), 0) / totalAttempts).toFixed(1))
      : null;
    const passed = attempts.filter(a => parseFloat(a.score) >= 60).length;
    const passRate = totalAttempts > 0 ? parseFloat(((passed / totalAttempts) * 100).toFixed(1)) : null;

    // Group by course
    const courseMap = {};
    for (const a of attempts) {
      const courseTitle = a.quiz?.course?.title ?? 'Unknown';
      if (!courseMap[courseTitle]) courseMap[courseTitle] = { scores: [], quizzes: new Set() };
      courseMap[courseTitle].scores.push(parseFloat(a.score || 0));
      courseMap[courseTitle].quizzes.add(Number(a.quiz_id));
    }

    const byCoure = Object.entries(courseMap).map(([course, data]) => ({
      course,
      attempts: data.scores.length,
      quizCount: data.quizzes.size,
      avgScore: parseFloat((data.scores.reduce((s, v) => s + v, 0) / data.scores.length).toFixed(1)),
    }));

    // Recent attempts timeline
    const timeline = attempts.slice(-10).reverse().map(a => ({
      quizTitle: a.quiz?.title ?? 'Unknown',
      course: a.quiz?.course?.title ?? 'Unknown',
      score: parseFloat(a.score || 0),
      attemptTime: a.attempt_time,
    }));

    return res.status(200).json({
      progress: { totalAttempts, avgScore, passRate, byCourse: byCoure, timeline },
    });
  } catch (err) {
    console.error('getProgress error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/student/courses/:courseId/content
const getCourseContent = async (req, res) => {
  try {
    const CourseContent = require('../models/CourseContent');
    const { courseId } = req.params;
    const course = await Course.findByPk(courseId, {
      include: [{ model: User, as: 'instructor', attributes: ['id', 'name'] }],
    });
    if (!course || course.status !== 'PUBLISHED')
      return res.status(404).json({ message: 'Course not found.' });
    const contents = await CourseContent.findAll({
      where: { course_id: courseId },
      order: [['order_index', 'ASC'], ['createdAt', 'ASC']],
    });
    return res.status(200).json({ course, contents });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// POST /api/student/courses/:courseId/start
const markCourseStarted = async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.id;
    // Store in a simple in-memory way via quiz attempts count or just return success
    // We'll use a separate table — for now just return success and track on frontend
    return res.status(200).json({ message: 'Course started.', courseId, studentId });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = { getDashboard, getCourses, getCourseContent, markCourseStarted, getQuizzes, getProgress };