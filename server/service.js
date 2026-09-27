const pdfParse = require('pdf-parse');
const { scoreAgainstJobDescription } = require('./scoring');
const db = require('./db');

// Anything shorter can't describe a role, so don't spend labd credits on it.
const MIN_JD_LENGTH = 100;
const MAX_JD_LENGTH = 20000;

// Thrown for expected, client-facing failures; the controller maps
// err.status and err.message onto the JSON response.
class ServiceError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function extractResume(file) {
  let data;
  try {
    // pdf-parse's bundled pdf.js v1.10.100 mis-handles Node Buffers in this
    // setup ("bad XRef entry"); a plain Uint8Array parses correctly.
    data = await pdfParse(new Uint8Array(file.buffer));
  } catch (err) {
    throw new ServiceError(
      422,
      'Failed to parse the PDF. The file may be corrupted or not a valid PDF.'
    );
  }

  const text = (data.text || '').trim();
  if (!text) {
    throw new ServiceError(
      422,
      'The PDF was read but no text could be extracted. It may be a scanned image.'
    );
  }

  return {
    filename: file.originalname,
    sizeBytes: file.size,
    pages: data.numpages,
    text,
  };
}

async function scoreResume(file, jobDescription) {
  if (jobDescription.length > MAX_JD_LENGTH) {
    throw new ServiceError(
      400,
      `The job description is too long. Keep it under ${MAX_JD_LENGTH} characters.`
    );
  }
  if (jobDescription.length < MIN_JD_LENGTH) {
    throw new ServiceError(
      422,
      'The job description is too short to score against. Paste the full posting.'
    );
  }

  const resume = await extractResume(file);
  const result = {
    filename: resume.filename,
    pages: resume.pages,
    ...(await scoreAgainstJobDescription(resume.text, jobDescription)),
  };

  // The score already cost a labd call, so a failed save is logged, not shown.
  try {
    await db.saveScore({ ...result, sizeBytes: resume.sizeBytes, resumeText: resume.text, jobDescription });
  } catch (err) {
    console.error(`[Mongo] failed to save score: ${err.message}`);
  }
  return result;
}

module.exports = { extractResume, scoreResume, ServiceError };
