const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Feedback = sequelize.define('Feedback', {
  id:         { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  quiz_id:    { type: DataTypes.BIGINT, allowNull: false },
  student_id: { type: DataTypes.BIGINT, allowNull: false },
  rating:     { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 5 } },
  comment:    { type: DataTypes.TEXT, allowNull: true },
  quiz_title: { type: DataTypes.STRING, allowNull: true },
  course_title:{ type: DataTypes.STRING, allowNull: true },
  student_name:{ type: DataTypes.STRING, allowNull: true },
}, { tableName: 'feedbacks', timestamps: true });

module.exports = Feedback;