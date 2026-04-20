require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const tabsRouter = require("./routes/tabs");
const sessionsRouter = require("./routes/sessions");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/tabs", tabsRouter);
app.use("/api/sessions", sessionsRouter);

app.get("/health", (req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/tablock";

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.warn("MongoDB connection warning:", err.message, "— continuing without DB"));

app.listen(PORT, () => {
  console.log(`TabLock backend running on port ${PORT}`);
});
