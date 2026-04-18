import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { dropRouter } from "./routes/drop.routes.js";

const PORT = process.env.PORT;
const app = express();
const httpServer = createServer(app);

export const io = new Server(httpServer, {
    cors: { origin: "*" },
});

app.use(cors());
app.use(express.json());

app.use("/api/drops", dropRouter);

io.on("connection", (socket) => {
    socket.join("drops");
});

app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});

httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
