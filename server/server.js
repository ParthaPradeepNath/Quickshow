import express from "express";
import cors from "cors";
import 'dotenv/config'
import connectDB from "./config/db.js";

const  app = express();
const port = process.env.PORT || 3000;

await connectDB()

// Middleware
app.use(express.json());
app.use(cors());

// API Routes
app.get("/", (req, res) => {
  res.send(`Server is live`);
});

app.listen(port, () =>  console.log(`Server listening on port ${port}`));