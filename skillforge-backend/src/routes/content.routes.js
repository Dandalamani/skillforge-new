const express = require('express');
const path = require('path');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { getContents, addLink, uploadFile, deleteContent, updateContent } = require('../controllers/content.controller');

const router = express.Router({ mergeParams: true });

// Lazy-load multer so missing package doesn't crash server startup
function getUpload() {
  const multer = require('multer');
  const fs = require('fs');
  const uploadDir = path.join(__dirname, '../../uploads');
  fs.mkdirSync(uploadDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
      cb(null, `${unique}${path.extname(file.originalname)}`);
    },
  });

  const fileFilter = (req, file, cb) => {
    const allowed = ['.pdf', '.mp4', '.webm', '.mov', '.avi', '.mkv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only PDF and video files are allowed.'));
  };

  return multer({ storage, fileFilter, limits: { fileSize: 500 * 1024 * 1024 } });
}

router.use(authenticate);

router.get('/', getContents);
router.post('/link', authorize('INSTRUCTOR', 'ADMIN'), addLink);
router.post('/upload', authorize('INSTRUCTOR', 'ADMIN'), (req, res, next) => {
  try {
    getUpload().single('file')(req, res, next);
  } catch (e) {
    res.status(500).json({ message: 'File upload not available. Run: npm install multer' });
  }
}, uploadFile);
router.put('/:id', authorize('INSTRUCTOR', 'ADMIN'), updateContent);
router.delete('/:id', authorize('INSTRUCTOR', 'ADMIN'), deleteContent);

module.exports = router;