import express, { Request, Response } from 'express';
import * as auth from '../auth';

export const authRouter = express.Router();

authRouter.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required." });
  }

  const user = await auth.getValidUser(email, password);
  if (user) {
    res.json({ success: true, user });
  } else {
    res.status(401).json({ success: false, message: "Invalid email/username or password." });
  }
});

authRouter.post('/register', async (req: Request, res: Response) => {
  const result = await auth.registerUser(req.body);
  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});
