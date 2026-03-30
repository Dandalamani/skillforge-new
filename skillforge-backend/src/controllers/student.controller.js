const User = require('../models/User');
const Course = require('../models/Course');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const Question = require('../models/Question');
const { Op } = require('sequelize');

const getDashboard = async (req, res) => {
  try {
    const studentId = req.user.id;
    const allCourses = await Course.findAll({
      where: { status: 'PUBLISHED' },
      include: [{ model: Quiz, as: 'quizzes' }],
      order: [['createdAt', 'DESC']],
    });
    const attempts = await QuizAttempt.findAll({
      where: { student_id: studentId, completed: true },
    });
    const totalAttempts = attempts.length;
    const avgScore = totalAttempts > 0
      ? parseFloat((attempts.reduce((s, a) => s + parseFloat(a.score || 0), 0) / totalAttempts).toFixed(1))
      : null;
    const attemptedQuizIds = attempts.map(a => Number(a.quiz_id));
    const allQuizzes = await Quiz.findAll({
      include: [{ model: Course, as: 'course', where: { status: 'PUBLISHED' } }],
      order: [['createdAt', 'DESC']],
    });
    const upcomingQuizzes = allQuizzes
      .filter(q => !attemptedQuizIds.includes(Number(q.id)))
      .slice(0, 5)
      .map(q => ({ id: q.id, title: q.title, course: q.course?.title, difficulty: q.difficulty_level, timeLimit: q.time_limit_minutes }));
    return res.status(200).json({
      dashboard: {
        totalCourses: allCourses.length, totalAttempts, avgScore, upcomingQuizzes,
        recentCourses: allCourses.slice(0, 4).map(c => ({ id: c.id, title: c.title, difficulty: c.difficulty_level, quizCount: c.quizzes?.length ?? 0 })),
      },
    });
  } catch (err) {
    console.error('getDashboard error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

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
    const enriched = await Promise.all(courses.map(async (c) => {
      const quizIds = (c.quizzes || []).map(q => q.id);
      const attempted = quizIds.length > 0
        ? await QuizAttempt.count({ where: { student_id: studentId, quiz_id: { [Op.in]: quizIds }, completed: true } })
        : 0;
      return {
        id: c.id, title: c.title, description: c.description,
        difficulty: c.difficulty_level, instructor: c.instructor?.name ?? 'Unknown',
        quizCount: quizIds.length, attempted, createdAt: c.createdAt,
      };
    }));
    return res.status(200).json({ courses: enriched });
  } catch (err) {
    console.error('getCourses error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

const getQuizzes = async (req, res) => {
  try {
    const studentId = req.user.id;
    const quizzes = await Quiz.findAll({
      include: [{ model: Course, as: 'course', where: { status: 'PUBLISHED' } }],
      order: [['createdAt', 'DESC']],
    });
    const attempts = await QuizAttempt.findAll({
      where: { student_id: studentId, completed: true },
      order: [['attempt_time', 'DESC']],
    });
    // Keep only LATEST attempt per quiz
    const attemptMap = {};
    for (const a of attempts) {
      const qId = Number(a.quiz_id);
      if (!attemptMap[qId]) {
        attemptMap[qId] = { score: parseFloat(a.score), attemptTime: a.attempt_time };
      }
    }
    // Count total attempts per quiz (for retake count)
    const attemptCountMap = {};
    for (const a of attempts) {
      const qId = Number(a.quiz_id);
      attemptCountMap[qId] = (attemptCountMap[qId] || 0) + 1;
    }
    const enriched = quizzes.map(q => ({
      id: q.id, title: q.title, description: q.description,
      course: q.course?.title, courseId: q.course_id,
      difficulty: q.difficulty_level, timeLimit: q.time_limit_minutes,
      generatedByAi: q.generated_by_ai,
      attempted: !!attemptMap[Number(q.id)],
      score: attemptMap[Number(q.id)]?.score ?? null,
      attemptTime: attemptMap[Number(q.id)]?.attemptTime ?? null,
      attemptCount: attemptCountMap[Number(q.id)] ?? 0,
    }));
    return res.status(200).json({ quizzes: enriched });
  } catch (err) {
    console.error('getQuizzes error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

const getProgress = async (req, res) => {
  try {
    const studentId = req.user.id;
    const attempts = await QuizAttempt.findAll({
      where: { student_id: studentId, completed: true },
      include: [{ model: Quiz, as: 'quiz', include: [{ model: Course, as: 'course' }] }],
      order: [['attempt_time', 'ASC']],
    });

    const totalAttempts = attempts.length;
    const avgScore = totalAttempts > 0
      ? parseFloat((attempts.reduce((s, a) => s + parseFloat(a.score || 0), 0) / totalAttempts).toFixed(1))
      : null;
    const passed = attempts.filter(a => parseFloat(a.score) >= 60).length;
    const passRate = totalAttempts > 0 ? parseFloat(((passed / totalAttempts) * 100).toFixed(1)) : null;

    // Get ALL published courses to show in bar chart (including 0-attempt ones)
    const allCourses = await Course.findAll({
      where: { status: 'PUBLISHED' },
      include: [{ model: Quiz, as: 'quizzes' }],
    });

    // Group attempted courses by title
    const courseMap = {};
    for (const a of attempts) {
      const courseTitle = a.quiz?.course?.title ?? 'Unknown';
      if (!courseMap[courseTitle]) courseMap[courseTitle] = { scores: [], quizzes: new Set() };
      courseMap[courseTitle].scores.push(parseFloat(a.score || 0));
      courseMap[courseTitle].quizzes.add(Number(a.quiz_id));
    }

    // Merge with all published courses — show 0 for unattempted ones
    const byCourse = allCourses.map(c => {
      const data = courseMap[c.title];
      if (data) {
        return {
          course: c.title,
          attempts: data.scores.length,
          quizCount: data.quizzes.size,
          avgScore: parseFloat((data.scores.reduce((s, v) => s + v, 0) / data.scores.length).toFixed(1)),
          hasAttempts: true,
        };
      }
      return {
        course: c.title,
        attempts: 0,
        quizCount: c.quizzes?.length ?? 0,
        avgScore: 0,
        hasAttempts: false,
      };
    });

    // Timeline — ALL attempts including re-attempts, track attempt number per quiz
    const quizAttemptCounter = {};
    const timeline = attempts.map(a => {
      const qId = Number(a.quiz_id);
      quizAttemptCounter[qId] = (quizAttemptCounter[qId] || 0) + 1;
      return {
        quizTitle: a.quiz?.title ?? 'Unknown',
        course: a.quiz?.course?.title ?? 'Unknown',
        score: parseFloat(a.score || 0),
        attemptTime: a.attempt_time,
        attemptNumber: quizAttemptCounter[qId],
      };
    }).reverse().slice(0, 20); // last 20 attempts, newest first

    return res.status(200).json({
      progress: { totalAttempts, avgScore, passRate, byCourse, timeline },
    });
  } catch (err) {
    console.error('getProgress error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

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

const markCourseStarted = async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.id;
    return res.status(200).json({ message: 'Course started.', courseId, studentId });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = { getDashboard, getCourses, getCourseContent, markCourseStarted, getQuizzes, getProgress };