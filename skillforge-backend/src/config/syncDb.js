require('dotenv').config();
const sequelize = require('./database');

// Import all models to register them
require('../models/User');
require('../models/Course');
require('../models/Quiz');
require('../models/Question');
require('../models/QuizAttempt');

async function syncDatabase() {
  try {
    console.log('🔄 Connecting to MySQL...');
    await sequelize.authenticate();
    console.log('✅ Database connected successfully.');

    console.log('🔄 Syncing models (ALTER)...');
    await sequelize.sync({ alter: true });
    console.log('✅ All tables synced successfully.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Database sync failed:', error.message);
    process.exit(1);
  }
}

syncDatabase();
