const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Course = sequelize.define('Course', {
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  instructor_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: { model: User, key: 'id' },
  },
  difficulty_level: {
    type: DataTypes.ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED'),
    allowNull: false,
    defaultValue: 'BEGINNER',
  },
  status: {
    type: DataTypes.ENUM('DRAFT', 'PUBLISHED'),
    allowNull: false,
    defaultValue: 'DRAFT',
  },
  thumbnail_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
}, {
  tableName: 'courses',
  timestamps: true,
});

// Associations
Course.belongsTo(User, { foreignKey: 'instructor_id', as: 'instructor' });
User.hasMany(Course, { foreignKey: 'instructor_id', as: 'courses' });

module.exports = Course;
