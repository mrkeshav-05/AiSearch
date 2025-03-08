import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";

dotenv.config();

const app = express();
const server = http.createServer(app);
const BACKEND_PORT = process.env.BACKEND_PORT || 8000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Backend is runnings!");
});

app.listen(BACKEND_PORT, () => {
    console.log(`Server is running on port ${BACKEND_PORT}`);
});
