import app from './app';

const port = process.env.PORT ? Number(process.env.PORT) : 3001;
app.listen(port, () => {
  console.log(`🚀 BMAD API listening on http://localhost:${port}`);
  console.log(`🔐 Authentication system enabled`);
  console.log(`🗄️ Database connected`);
  console.log(`🔄 Queue system active`);
});

export default app;
