const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Quiz = require('./Quiz');
const User = require('./User');

const QuizAttempt = sequelize.define('QuizAttempt', {
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  },
  quiz_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: { model: Quiz, key: 'id' },
  },
  student_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: { model: User, key: 'id' },
  },
  answers: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Map of question_id -> student answer',
  },
  score: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
  },
  total_marks: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  attempt_time: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  completed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'quiz_attempts',
  timestamps: true,
});

QuizAttempt.belongsTo(Quiz, { foreignKey: 'quiz_id', as: 'quiz' });
QuizAttempt.belongsTo(User, { foreignKey: 'student_id', as: 'student' });
Quiz.hasMany(QuizAttempt, { foreignKey: 'quiz_id', as: 'attempts' });
User.hasMany(QuizAttempt, { foreignKey: 'student_id', as: 'attempts' });

module.exports = QuizAttempt;
