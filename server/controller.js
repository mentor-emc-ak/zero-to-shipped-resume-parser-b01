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

module.exports = { uploadResume };
