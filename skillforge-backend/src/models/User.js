const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id:       { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  name:     { type: DataTypes.STRING(100), allowNull: false, validate: { notEmpty: true, len: [2,100] } },
  email:    { type: DataTypes.STRING(100), allowNull: false, unique: true, validate: { isEmail: true } },
  password: { type: DataTypes.STRING(255), allowNull: false },
  role:     { type: DataTypes.ENUM('STUDENT','INSTRUCTOR','ADMIN'), allowNull: false, defaultValue: 'STUDENT' },
  // Profile fields
  dob:      { type: DataTypes.DATEONLY, allowNull: true },
  gender:   { type: DataTypes.ENUM('Male','Female','Non-binary','Prefer not to say'), allowNull: true },
  location: { type: DataTypes.STRING(200), allowNull: true },
  bio:      { type: DataTypes.TEXT, allowNull: true },
  linkedin: { type: DataTypes.STRING(300), allowNull: true },
  github:   { type: DataTypes.STRING(300), allowNull: true },
  twitter:  { type: DataTypes.STRING(300), allowNull: true },
  website:  { type: DataTypes.STRING(300), allowNull: true },
}, { tableName: 'users', timestamps: true });

module.exports = User;