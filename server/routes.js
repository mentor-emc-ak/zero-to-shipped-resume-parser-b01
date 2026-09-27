const express = require('express');
const multer = require('multer');
const controller = require('./controller');

// Vercel Functions reject request bodies over 4.5 MB before Express sees them.
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB

// Store the upload in memory (never touches disk) and enforce the limits.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const isPdf =
      file.mimetype === 'application/pdf' ||
      file.originalname.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      cb(null, true);
    } else {
      cb(new Error('ONLY_PDF_ALLOWED'));
    }
  },
});

const router = express.Router();

router.get('/health', (req, res) => res.json({ status: 'ok' }));
router.post('/api/resume', upload.single('resume'), controller.uploadResume);
router.post('/api/score', upload.single('resume'), controller.scoreResume);

const authBody = express.json({ limit: '10kb' });
router.post('/api/auth/signup', authBody, controller.signup);
router.post('/api/auth/login', authBody, controller.login);
router.get('/api/auth/me', controller.requireAuth, controller.me);

// Multer errors (file too large, wrong type) and malformed JSON bodies land here.
function uploadErrorHandler(err, req, res, next) {
  if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') {
    return res.status(400).json({ success: false, error: 'Send a JSON body with email and password.' });
  }
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: 'File too large. Maximum allowed size is 4 MB.',
    });
  }
  if (err && err.message === 'ONLY_PDF_ALLOWED') {
    return res.status(415).json({
      success: false,
      error: 'Only PDF files are accepted.',
    });
  }
  return res.status(500).json({ success: false, error: 'Internal server error.' });
}

module.exports = { router, uploadErrorHandler };
