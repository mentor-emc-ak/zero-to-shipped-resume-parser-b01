const pdfParse = require('pdf-parse');

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

module.exports = { extractResume, ServiceError };
