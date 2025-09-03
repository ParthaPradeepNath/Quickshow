import express from "express";
import cors from "cors";
import 'dotenv/config'

const  app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// API Routes
app.get("/", (req, res) => {
  res.send(`Server is live`);
});

app.listen(port, () =>  console.log(`Server listening on port ${port}`));