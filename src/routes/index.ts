import express from "express";
import imagesRouter from "./images";
import testWebSearch from "./websearch";

const router = express.Router();

router.use("/images", imagesRouter);
router.post("/test-websearch", (req, res, next) => {
  Promise.resolve(testWebSearch(req, res)).catch(next);
});

export default router;