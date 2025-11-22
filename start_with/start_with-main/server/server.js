import express from "express";
import cors from "cors";
import dbconnect from "./db/databaseConnect.js";
import cookieParser from "cookie-parser";
import { Server } from 'socket.io';
import { createServer } from 'http';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { initSocket } from "./socket/index.js";
// import router from "./route.js";
import ownerRoute from "./routes/owner.routes.js";
import googleRoute from "./routes/google.route.js";
import webhookRoute from "./routes/webhook.routes.js";


// import { startAttendanceScheduler } from "./utilits/cron_jobs/attendanceScheduler.cron.js";
// import socket from "./socket.js";

// import path from "path";
// import { fileURLToPath } from "url";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

const app = express();

const server = createServer(app)

initSocket(server);


const G1 = process.env.G1;
const G2 = process.env.G2;
const G3 = process.env.G3;

// const io = new Server(server, {
//     cors: {
//         origin: ["//frontend url"],
//         methods: ["GET", "POST"],
//         credentials: true,
//     },
// })
// io.on("connection", (socket) => {
//     console.log("Client connected:", socket.id);
// });



app.use(express.json());
app.use(cookieParser())
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3121', 'https://startwith.live', 'https://60f01cb99d34.ngrok-free.app', 'https://coruscating-crumble-6992a8.netlify.app','https://emailservice.startwith.live'],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
}))

app.use((req, res, next) => {
    const t = new Date().toISOString()
    console.log(`[${t}] ${req.method} ${req.path}`)
    next()
})


app.use("/api", ownerRoute)
app.use("/api/google", googleRoute);
app.use("/email", webhookRoute);

dbconnect()
    .then(() => {
        app.on("error", (error) => {
            console.log(`Server is not talking: ${error}`);
            throw error;
        });
        // app.listen(process.env.PORT || 4000, () => {
        //     console.log(`⚙️ Server running on port ${process.env.PORT || 4000}`);
        // });
        server.listen(process.env.PORT || 4000, () => {
            console.log(`⚙️ Server running on port ${process.env.PORT || 4000}`);
        });
    })
    .catch((error) => {
        console.error(`Error from app.js:::-> ${error}`);
    });
// startAttendanceScheduler()

export const geminiAPI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.get("/", (req, res) => {
    res.send("hello  Shail [UPDATED] :)");
});
