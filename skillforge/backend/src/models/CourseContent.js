const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CourseContent = sequelize.define('CourseContent', {
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  course_id: { type: DataTypes.BIGINT, allowNull: false },
  title: { type: DataTypes.STRING(200), allowNull: false },
  type: { type: DataTypes.ENUM('VIDEO', 'PDF', 'LINK'), allowNull: false },
  url: { type: DataTypes.STRING(1000), allowNull: true },
  file_path: { type: DataTypes.STRING(500), allowNull: true },
  file_name: { type: DataTypes.STRING(200), allowNull: true },
  file_size: { type: DataTypes.BIGINT, allowNull: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  order_index: { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  tableName: 'course_contents',
  timestamps: true,
});

module.exports = CourseContent;