import express from "express"
import cors from "cors"
import cookieParser from 'cookie-parser';
import authRouter from "../src/routes/user.routes.js"
import audioRouter from "../src/routes/audio.routes.js"
import videoRouter from "../src/routes/video.routes.js"
import path from 'path'


const app = express()
const __dirname = path.resolve();

app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173" || "http://192.168.1.4:5173/" || "ws://localhost:8082",
    credentials: true,
    methods: "GET, POST"
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())
app.use('/api/v1/auth', authRouter)
app.use('/api/v1/audio', audioRouter)
app.use('/api/v1/video-chat', videoRouter)

app.use(express.static(path.join(__dirname,"/frontend/dist")))

app.get("*",(req,res)=>{
    res.sendFile(path.join(__dirname,"frontend","dist","index.html"))
})



export {app}