const Quiz = require('../models/Quiz');
const Question = require('../models/Question');

const updateQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findByPk(req.params.id, {
      include: [{ model: Question, as: 'questions' }],
    });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found.' });

    const { title, difficulty_level, time_limit_minutes, questions } = req.body;

    // Update quiz meta
    await quiz.update({ title, difficulty_level, time_limit_minutes });

    // Update each question
    if (questions && Array.isArray(questions)) {
      for (const q of questions) {
        if (q.id) {
          await Question.update({
            question_text: q.question_text,
            correct_answer: q.correct_answer,
            explanation: q.explanation || '',
            options: Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]'),
          }, { where: { id: q.id } });
        }
      }
    }

    // Return full updated quiz with questions
    const updated = await Quiz.findByPk(quiz.id, {
      include: [{ model: Question, as: 'questions' }],
    });

    return res.status(200).json({ message: 'Quiz updated.', quiz: updated });
  } catch (err) {
    console.error('updateQuiz error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = { updateQuiz };