import express from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { handleAudioUpload } from "../controllers/audio.controller.js"
import { verifyJWT } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/upload", verifyJWT, upload.single("audio"), handleAudioUpload);

export default router;
