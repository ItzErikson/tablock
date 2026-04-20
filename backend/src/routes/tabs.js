const express = require("express");
const { ethers } = require("ethers");
const router = express.Router();
const Tab = require("../models/Tab");
const { getProvider, syncTabFromChain } = require("../services/contract");

const ADJECTIVES = ["SUNNY", "CRISPY", "GOLDEN", "SPICY", "SAVORY", "FRESH", "TASTY", "ZESTY", "BOLD", "SMOKY"];
const NOUNS = ["TABLE", "FEAST", "BITES", "PLATE", "BOWL", "SPREAD", "GRUB", "ROUND", "LUNCH", "DINNER"];

function generateShareCode(tabId) {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj}-${noun}-${tabId}`;
}

async function waitForReceipt(txHash, maxAttempts = 10, intervalMs = 2000) {
  const provider = getProvider();
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const receipt = await provider.getTransactionReceipt(txHash);
      if (receipt) return receipt;
    } catch (e) {
      // keep polling
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Transaction ${txHash} not confirmed after ${maxAttempts} attempts`);
}

// POST /api/tabs — after createTab tx
router.post("/", async (req, res) => {
  try {
    const { txHash, organizerAddress, sessionId } = req.body;
    if (!txHash || !organizerAddress) return res.status(400).json({ error: "txHash and organizerAddress required" });

    const receipt = await waitForReceipt(txHash);

    // Parse TabCreated event
    const iface = new ethers.Interface([
      "event TabCreated(uint256 indexed tabId, address indexed organizer, string name, uint256 foodEstimate, uint256 locked)",
    ]);
    let tabId = null;
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed && parsed.name === "TabCreated") {
          tabId = Number(parsed.args.tabId);
          break;
        }
      } catch (_) {}
    }
    if (tabId === null) return res.status(400).json({ error: "TabCreated event not found in receipt" });

    const tabDoc = await syncTabFromChain(tabId);

    // Generate share code if not set
    if (!tabDoc.shareCode) {
      tabDoc.shareCode = generateShareCode(tabId);
      await tabDoc.save();
    }

    if (txHash && !tabDoc.txHashes.includes(txHash)) {
      tabDoc.txHashes.push(txHash);
      await tabDoc.save();
    }

    res.status(201).json(tabDoc);
  } catch (err) {
    console.error("POST /api/tabs error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tabs/user/:address — must be before /:tabId
router.get("/user/:address", async (req, res) => {
  try {
    const address = req.params.address.toLowerCase();
    const tabs = await Tab.find({ "members.address": address }).sort({ createdAt: -1 });
    res.json(tabs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tabs/code/:shareCode
router.get("/code/:shareCode", async (req, res) => {
  try {
    const tab = await Tab.findOne({ shareCode: req.params.shareCode.toUpperCase() });
    if (!tab) return res.status(404).json({ error: "Tab not found" });
    res.json(tab);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tabs/:tabId
router.get("/:tabId", async (req, res) => {
  try {
    const tab = await Tab.findOne({ onChainTabId: Number(req.params.tabId) });
    if (!tab) return res.status(404).json({ error: "Tab not found" });
    res.json(tab);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tabs/:tabId/join
router.post("/:tabId/join", async (req, res) => {
  try {
    const { txHash, memberAddress, sessionId } = req.body;
    if (!txHash || !memberAddress) return res.status(400).json({ error: "txHash and memberAddress required" });

    await waitForReceipt(txHash);
    const tabDoc = await syncTabFromChain(Number(req.params.tabId));

    if (txHash && !tabDoc.txHashes.includes(txHash)) {
      tabDoc.txHashes.push(txHash);
      await tabDoc.save();
    }

    res.json(tabDoc);
  } catch (err) {
    console.error("POST join error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tabs/:tabId/leave
router.post("/:tabId/leave", async (req, res) => {
  try {
    const { txHash, memberAddress } = req.body;
    if (!txHash) return res.status(400).json({ error: "txHash required" });

    await waitForReceipt(txHash);
    const tabDoc = await syncTabFromChain(Number(req.params.tabId));

    if (txHash && !tabDoc.txHashes.includes(txHash)) {
      tabDoc.txHashes.push(txHash);
      await tabDoc.save();
    }

    res.json(tabDoc);
  } catch (err) {
    console.error("POST leave error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tabs/:tabId/remove
router.post("/:tabId/remove", async (req, res) => {
  try {
    const { txHash, organizerAddress, removedAddress } = req.body;
    if (!txHash) return res.status(400).json({ error: "txHash required" });

    await waitForReceipt(txHash);
    const tabDoc = await syncTabFromChain(Number(req.params.tabId));

    if (txHash && !tabDoc.txHashes.includes(txHash)) {
      tabDoc.txHashes.push(txHash);
      await tabDoc.save();
    }

    res.json(tabDoc);
  } catch (err) {
    console.error("POST remove error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tabs/:tabId/settle
router.post("/:tabId/settle", async (req, res) => {
  try {
    const { txHash, payerAddress, actualBillRaw } = req.body;
    if (!txHash) return res.status(400).json({ error: "txHash required" });

    await waitForReceipt(txHash);
    const tabDoc = await syncTabFromChain(Number(req.params.tabId));

    if (txHash && !tabDoc.txHashes.includes(txHash)) {
      tabDoc.txHashes.push(txHash);
      await tabDoc.save();
    }

    res.json(tabDoc);
  } catch (err) {
    console.error("POST settle error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tabs/:tabId/cancel
router.post("/:tabId/cancel", async (req, res) => {
  try {
    const { txHash, organizerAddress } = req.body;
    if (!txHash) return res.status(400).json({ error: "txHash required" });

    await waitForReceipt(txHash);
    const tabDoc = await syncTabFromChain(Number(req.params.tabId));

    if (txHash && !tabDoc.txHashes.includes(txHash)) {
      tabDoc.txHashes.push(txHash);
      await tabDoc.save();
    }

    res.json(tabDoc);
  } catch (err) {
    console.error("POST cancel error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
