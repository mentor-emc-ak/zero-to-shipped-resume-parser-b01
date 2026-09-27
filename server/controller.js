const service = require('./service');
const auth = require('./auth');

async function uploadResume(req, res) {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No file uploaded. Send the PDF as form-data field "resume".',
    });
  }

  try {
    const result = await service.extractResume(req.file);
    return res.json({ success: true, ...result });
  } catch (err) {
    const status = err.status || 500;
    const error = err.status ? err.message : 'Internal server error.';
    return res.status(status).json({ success: false, error });
  }
}

async function scoreResume(req, res) {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No file uploaded. Send the PDF as form-data field "resume".',
    });
  }
  // A repeated or bracketed form field ("jobDescription[x]") parses to an array or object.
  const rawJobDescription = req.body.jobDescription;
  const jobDescription = typeof rawJobDescription === 'string' ? rawJobDescription.trim() : '';
  if (!jobDescription) {
    return res.status(400).json({
      success: false,
      error: 'No job description provided. Send it as form-data field "jobDescription".',
    });
  }

  try {
    const result = await service.scoreResume(req.file, jobDescription);
    return res.json({ success: true, ...result });
  } catch (err) {
    const status = err.status || 500;
    const error = err.status ? err.message : 'Internal server error.';
    return res.status(status).json({ success: false, error });
  }
}

function sendServiceError(res, err) {
  const status = err.status || 500;
  const error = err.status ? err.message : 'Internal server error.';
  if (!err.status) console.error(`[Auth] ${err.message}`);
  return res.status(status).json({ success: false, error });
}

async function signup(req, res) {
  try {
    const result = await auth.signup(req.body?.email, req.body?.password);
    return res.status(201).json({ success: true, ...result });
  } catch (err) {
    return sendServiceError(res, err);
  }
}

async function login(req, res) {
  try {
    const result = await auth.login(req.body?.email, req.body?.password);
    return res.json({ success: true, ...result });
  } catch (err) {
    return sendServiceError(res, err);
  }
}

// Reads "Authorization: Bearer <jwt>" and sets req.userId, or answers 401.
function requireAuth(req, res, next) {
  const [scheme, token] = (req.get('Authorization') || '').split(' ');
  try {
    req.userId = scheme === 'Bearer' && token ? auth.verifyToken(token) : null;
  } catch (err) {
    return sendServiceError(res, err);
  }
  if (!req.userId) {
    return res.status(401).json({ success: false, error: 'Log in to continue.' });
  }
  return next();
}

async function me(req, res) {
  try {
    const user = await auth.currentUser(req.userId);
    return res.json({ success: true, user });
  } catch (err) {
    return sendServiceError(res, err);
  }
}

module.exports = { uploadResume, scoreResume, signup, login, requireAuth, me };
