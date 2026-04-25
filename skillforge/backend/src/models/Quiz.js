const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Course = require('./Course');

const Quiz = sequelize.define('Quiz', {
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  course_id: { type: DataTypes.BIGINT, allowNull: false, references: { model: Course, key: 'id' } },
  title: { type: DataTypes.STRING(100), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  generated_by_ai: { type: DataTypes.BOOLEAN, defaultValue: false },
  time_limit_minutes: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 30 },
  difficulty_level: { type: DataTypes.ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED'), defaultValue: 'BEGINNER' },
  status: { type: DataTypes.ENUM('DRAFT', 'PUBLISHED'), defaultValue: 'DRAFT', allowNull: false },
}, { tableName: 'quizzes', timestamps: true });

Quiz.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });
Course.hasMany(Quiz, { foreignKey: 'course_id', as: 'quizzes' });

module.exports = Quiz;