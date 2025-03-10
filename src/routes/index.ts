import express from 'express';
import imageRouter from './images';
const router = express.Router();

router.use("/images", imageRouter);

export default router;