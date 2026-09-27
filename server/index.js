const express = require('express');
const { router, uploadErrorHandler } = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(router);
app.use(uploadErrorHandler);

// When run directly (npm start / npm dev), listen on a port.
// On Vercel the file is required as a module, so the app is exported instead.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

module.exports = app;

