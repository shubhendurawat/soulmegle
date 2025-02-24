import { Router } from "express";
import { findMatch } from "../controllers/video.controller.js";
import { verifyJWT } from "../middlewares/authMiddleware.js";

const router = Router()

router.post("/findmatch", verifyJWT, findMatch)

export default router