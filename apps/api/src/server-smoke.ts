import app from './app';

const port = process.env.API_PORT ? Number(process.env.API_PORT) : 3000;

app.listen(port, () => {
  console.log(`🚀 BMAD API (smoke) listening on http://localhost:${port}`);
});


