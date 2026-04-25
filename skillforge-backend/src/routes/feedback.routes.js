const express = require('express');
const { submitFeedback, getFeedback } = require('../controllers/feedback.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(authenticate);
router.post('/', authorize('STUDENT'), submitFeedback);
router.get('/', authorize('INSTRUCTOR', 'ADMIN'), getFeedback);

module.exports = router;