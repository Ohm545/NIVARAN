import 'dotenv/config';
import app from './app.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`[NIVARAN] Server running on http://localhost:${PORT}`);
  console.log(`[NIVARAN] Environment: ${process.env.NODE_ENV || 'development'}`);
});
