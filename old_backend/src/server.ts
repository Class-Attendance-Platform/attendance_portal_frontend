import express from 'express';
import cors from 'cors';
import * as fs from 'fs';
import * as path from 'path';

import { checkAndSeed } from './db';
import { authRouter } from './routes/auth';
import { studentRouter } from './routes/student';
import { teacherRouter } from './routes/teacher';
import { adminRouter } from './routes/admin';
import { portalRouter } from './routes/portal';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const oldPublicDir = path.join(__dirname, '../../old/src/main/resources/public');
if (fs.existsSync(oldPublicDir)) {
  try {
    fs.readdirSync(oldPublicDir).forEach(file => {
      fs.copyFileSync(path.join(oldPublicDir, file), path.join(publicDir, file));
    });
    console.log("Copied static assets from old resources successfully.");
  } catch (err) {
    console.error("Failed to copy static assets from old resources.", err);
  }
}

app.use(express.static(publicDir));

app.use('/api/auth', authRouter);
app.use('/api/student', studentRouter);
app.use('/api/teacher', teacherRouter);
app.use('/api/admin', adminRouter);
app.use('/', portalRouter);

checkAndSeed().then(() => {
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Express Attendance Server listening at http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error("Failed to initialize database and seed records:", err);
  process.exit(1);
});
