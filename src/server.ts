import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import routes from "./routes";
import { startWebSocketServer } from "./websocket";

dotenv.config();

const app = express();
const BACKEND_PORT = process.env.BACKEND_PORT || 5000;

const corOptions = {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
}
app.use(cors(corOptions));
app.use(express.json());

app.use("/api", routes);

app.get("/", (req, res) => {
    res.send("Backend is runnings!");
});

const server = http.createServer(app);

server.listen(BACKEND_PORT, () => {
    console.log(`Server is running on port ${BACKEND_PORT}`);
    console.log(`http://localhost:${BACKEND_PORT}`);
});

startWebSocketServer(server);