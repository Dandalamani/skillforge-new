// These functions get merged into quiz.controller.js
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const QuizAttempt = require('../models/QuizAttempt');

const publishQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findByPk(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found.' });
    await quiz.update({ status: 'PUBLISHED' });
    return res.status(200).json({ message: 'Quiz published successfully.', quiz });
  } catch (err) {
    console.error('publishQuiz error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

const unpublishQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findByPk(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found.' });
    await quiz.update({ status: 'DRAFT' });
    return res.status(200).json({ message: 'Quiz unpublished.', quiz });
  } catch (err) {
    console.error('unpublishQuiz error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

const deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findByPk(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found.' });
    await QuizAttempt.destroy({ where: { quiz_id: quiz.id } });
    await Question.destroy({ where: { quiz_id: quiz.id } });
    await quiz.destroy();
    return res.status(200).json({ message: 'Quiz deleted.' });
  } catch (err) {
    console.error('deleteQuiz error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = { publishQuiz, unpublishQuiz, deleteQuiz };