const express = require("express");
const router = express.Router();
const Session = require("../models/Session");

// POST /api/sessions
router.post("/", async (req, res) => {
  try {
    const { sessionId, walletAddress, displayName } = req.body;
    if (!sessionId) return res.status(400).json({ error: "sessionId required" });

    const session = await Session.findOneAndUpdate(
      { sessionId },
      { sessionId, walletAddress: walletAddress?.toLowerCase(), displayName },
      { upsert: true, new: true }
    );
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sessions/:sessionId
router.get("/:sessionId", async (req, res) => {
  try {
    const session = await Session.findOne({ sessionId: req.params.sessionId });
    if (!session) return res.status(404).json({ error: "Session not found" });
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
