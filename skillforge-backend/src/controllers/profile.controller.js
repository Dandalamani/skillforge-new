const User = require('../models/User');
const bcrypt = require('bcryptjs');

// GET /api/profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
    });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    return res.status(200).json({ user });
  } catch (err) {
    console.error('getProfile error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// PUT /api/profile
const updateProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const { name, dob, gender, location, bio, linkedin, github, twitter, website } = req.body;

    await user.update({ name, dob, gender, location, bio, linkedin, github, twitter, website });

    const updated = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
    });
    return res.status(200).json({ message: 'Profile updated successfully.', user: updated });
  } catch (err) {
    console.error('updateProfile error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// PUT /api/profile/password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: 'Both current and new password are required.' });
    if (newPassword.length < 6)
      return res.status(400).json({ message: 'New password must be at least 6 characters.' });

    const user = await User.findByPk(req.user.id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect.' });

    const hashed = await bcrypt.hash(newPassword, 12);
    await user.update({ password: hashed });
    return res.status(200).json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('changePassword error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = { getProfile, updateProfile, changePassword };