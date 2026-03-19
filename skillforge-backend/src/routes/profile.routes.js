const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { getProfile, updateProfile, changePassword } = require('../controllers/profile.controller');

const router = express.Router();
router.use(authenticate);
router.get('/', getProfile);
router.put('/', updateProfile);
router.put('/password', changePassword);

module.exports = router;