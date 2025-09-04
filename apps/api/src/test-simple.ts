import express = require('express');

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'api-simple' });
});

const port = 3001;
app.listen(port, () => {
  console.log(`API Simple listening on http://localhost:${port}`);
});
