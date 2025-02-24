import { Router } from "express";
import { getUserProfile, loginUser, registerUser } from "../controllers/authController.js";
import { verifyJWT } from "../middlewares/authMiddleware.js";

const router = Router()

router.route("/register").post(registerUser)
router.route("/login").post(loginUser)
router.route("/dashboard").get(verifyJWT, getUserProfile)


export default router