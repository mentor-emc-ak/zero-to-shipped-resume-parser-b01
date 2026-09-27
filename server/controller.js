const service = require('./service');

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

module.exports = { uploadResume, scoreResume };
