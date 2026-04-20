# 🔒 TabLock

> **Lock your share before the bill arrives. Settle instantly.**

Built for the **SCBC 2026 Hackathon** — Circle Track: Programmable Money for Humans & Agents

![Solidity](https://img.shields.io/badge/Solidity-0.8.19-363636?logo=solidity)
![Arc Testnet](https://img.shields.io/badge/Network-Arc%20Testnet-blue)
![USDC](https://img.shields.io/badge/Token-USDC-2775CA)
![React](https://img.shields.io/badge/Frontend-React-61DAFB?logo=react)
![Node.js](https://img.shields.io/badge/Backend-Node.js-339933?logo=node.js)

---

## The Problem

Group dinners are awkward when the bill arrives. Someone pays upfront, then spends the next week chasing people on Venmo — hoping everyone pays, trusting one person to do the math, and relying on social pressure to make it work.

**There is no enforcement. There is no guarantee.**

## The Solution

TabLock makes the commitment financial and upfront.

1. Everyone locks their estimated share in a smart contract on Arc
2. A **40% buffer** covers tax and tip automatically
3. When the payer declares the actual bill total, the contract calculates each person's exact proportional share, sends it to the payer, and returns unused buffer to each member

No chasing. No unfair splits. No trust required — the contract enforces it.

---

## How It Works

**Step 1 — Create a Tab**
The organizer creates a tab, enters their food estimate, and locks USDC (estimate × 1.4) into the smart contract. A shareable link and QR code are generated.

**Step 2 — Members Join**
Each member opens the link, enters their food estimate, and locks their share. All funds sit in the contract — no one can touch them.

**Step 3 — Settle**
When the bill arrives, whoever paid the restaurant declares the actual total. The contract atomically:
- Sends each member's proportional share to the payer
- Returns each member's unused buffer back to them

**Settlement Formula**

    share = (memberFoodEstimate / totalFoodEstimate) × actualBill
    returned = memberLocked - share

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | Solidity 0.8.19, Hardhat, OpenZeppelin |
| Blockchain | Arc Testnet (Chain ID: 5042002) |
| Payment Token | USDC (0x3600000000000000000000000000000000000000) |
| Frontend | React, Vite, Tailwind CSS, ethers.js |
| Backend | Node.js, Express, MongoDB |

---

## Deployed Contract

| Network | Address |
|---------|---------|
| Arc Testnet | 0xBb3F4bcC03DFcA3Cb12FD5044231f8322E2E54Df |

[View on Arc Explorer](https://testnet.arcscan.app/address/0xBb3F4bcC03DFcA3Cb12FD5044231f8322E2E54Df)

---

## Project Structure

    tablock/
    ├── contracts/          # Solidity smart contract + Hardhat config
    │   └── contracts/
    │       └── TabLock.sol
    ├── backend/            # Express API + MongoDB + chain sync
    │   └── src/
    │       ├── models/
    │       ├── routes/
    │       └── services/
    └── frontend/           # React app
        └── src/
            ├── components/
            ├── pages/
            ├── hooks/
            └── services/

---

## Local Setup

### Prerequisites

- Node.js v18+
- MongoDB running locally
- MetaMask with Arc Testnet configured
- Testnet USDC from https://faucet.circle.com

### Arc Testnet MetaMask Config

| Field | Value |
|-------|-------|
| Network Name | Arc Testnet |
| RPC URL | https://rpc.testnet.arc.network |
| Chain ID | 5042002 |
| Currency Symbol | USDC |

### 1. Deploy the Contract

    cd contracts
    cp .env.example .env
    # Add your PRIVATE_KEY to .env
    npm install
    npx hardhat run scripts/deploy.js --network arc

### 2. Start the Backend

    cd backend
    cp .env.example .env
    # Add TABLOCK_CONTRACT_ADDRESS from step 1
    npm install
    npm run dev

### 3. Start the Frontend

    cd frontend
    cp .env.example .env
    # Add VITE_CONTRACT_ADDRESS from step 1
    npm install
    npm run dev

Open http://localhost:5173

---

## Key Features

- **Trustless escrow** — funds held by contract, not by any person
- **Proportional splits** — based on food estimate, not equal division
- **40% buffer** — automatically covers tax and tip, unused amount returned
- **Share codes** — join a tab with a human-readable code like GOLDEN-FEAST-7
- **QR codes** — scan to join from any device
- **Real-time sync** — tab state polls every 10 seconds across all participants
- **Arc Explorer links** — every settlement links to the on-chain transaction

---

## Smart Contract Security

- ReentrancyGuard on all state-mutating functions
- Address reuse prevention — removed members cannot rejoin
- Payer cap logic — if actual bill exceeds locked amounts, shares are capped and payer absorbs shortfall
- All funds accounted for — contract holds zero residual USDC after settlement

---

*Built at SCBC 2026 — Southern California Blockchain Conference Hackathon*
