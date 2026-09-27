const express = require('express');
const { router, uploadErrorHandler } = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(router);
app.use(uploadErrorHandler);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

