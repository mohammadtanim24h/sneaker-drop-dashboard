import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { dropRouter } from "./routes/drop.routes.js";
import { userRouter } from "./routes/user.routes.js";
import { startExpiryJob } from "./jobs/expireReservations.js";
import { startReleaseDropsJob } from "./jobs/releaseUpcomingDrops.js";

const PORT = process.env.PORT;
const app = express();
const httpServer = createServer(app);

export const io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL },
});

app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

app.use("/api/drops", dropRouter);
app.use("/api/users", userRouter);

io.on("connection", (socket) => {
    socket.join("drops");
});

app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});

// Start background jobs
startExpiryJob();
startReleaseDropsJob();

httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
