const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Quiz = require('./Quiz');

const Question = sequelize.define('Question', {
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
  question_text: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  question_type: {
    type: DataTypes.ENUM('MCQ', 'SHORT_ANSWER'),
    defaultValue: 'MCQ',
  },
  options: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of option strings for MCQ',
  },
  correct_answer: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  explanation: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  marks: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
}, {
  tableName: 'questions',
  timestamps: true,
});

Question.belongsTo(Quiz, { foreignKey: 'quiz_id', as: 'quiz' });
Quiz.hasMany(Question, { foreignKey: 'quiz_id', as: 'questions' });

module.exports = Question;
