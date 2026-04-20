const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema({
  address: { type: String, lowercase: true, required: true },
  displayName: { type: String, required: true },
  foodEstimate: { type: Number, default: 0 },
  locked: { type: Number, default: 0 },
  finalShare: { type: Number, default: 0 },
  returned: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
}, { _id: false });

const tabSchema = new mongoose.Schema({
  onChainTabId: { type: Number, unique: true, index: true, required: true },
  name: { type: String, required: true },
  organizerAddress: { type: String, lowercase: true, index: true, required: true },
  status: { type: String, enum: ["OPEN", "SETTLED", "CANCELLED"], default: "OPEN" },
  actualBillTotal: { type: Number, default: 0 },
  payerAddress: { type: String, lowercase: true, default: null },
  members: [memberSchema],
  totalFoodEstimate: { type: Number, default: 0 },
  totalLocked: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  settledAt: { type: Date, default: null },
  txHashes: [{ type: String }],
  shareCode: { type: String, unique: true, index: true },
});

module.exports = mongoose.model("Tab", tabSchema);
