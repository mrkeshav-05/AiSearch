import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import routes from "./routes";

dotenv.config();

const app = express();
const server = http.createServer(app);
const BACKEND_PORT = process.env.BACKEND_PORT || 8000;

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

app.listen(BACKEND_PORT, () => {
    console.log(`Server is running on port ${BACKEND_PORT}`);
    console.log(`http://localhost:${BACKEND_PORT}`);
});
