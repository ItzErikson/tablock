# TabLock

**Lock your share before the bill arrives. Settle instantly.**

## What is TabLock

Group dinners are awkward when the bill arrives. Someone pays, everyone Venmos
them later — or doesn't. Equal splits punish people who ordered less. And nobody
wants to be the one who has to chase. TabLock fixes this by turning the
commitment upfront and financial. Everyone locks their USDC into a smart
contract before the meal ends. A 40% buffer covers tax and tip. When someone
pays the physical bill and declares the actual total, the contract calculates
each person's exact proportional share, sends it to the payer, and returns
everyone's unused buffer automatically. No chasing. No unfair splits. No trust
required — the code enforces it.

---

## How It Works

### Step by step

1. **Create a tab** — The organizer sets a tab name, enters their food estimate,
   and locks USDC (food estimate × 1.4 for the buffer).
2. **Share the code** — Everyone else joins via the share code or link. Each
   person enters their own food estimate and locks their USDC.
3. **Someone pays the physical bill** — Any member clicks "I Paid the Bill" and
   enters the actual total (including tax and tip).
4. **Contract settles automatically** — Each active member's proportional share
   is sent to the payer. Unused buffer (locked - share) is returned to each
   person. Done.

### The buffer math

Each person locks their food estimate × 1.4. The extra 40% is a buffer for tax,
tip, and rounding. After the actual bill is declared:

```
finalShare = (yourFoodEstimate / totalFoodEstimate) × actualBill
returned   = yourLocked - finalShare
```

**Example:**

| Person | Food estimate | Locked (×1.4) |
|--------|--------------|---------------|
| Alice  | $30          | $42           |
| Bob    | $20          | $28           |
| Carol  | $25          | $35           |
| **Total** | **$75**   | **$105**      |

Actual bill: **$82** (food + tax + tip)

| Person | Share calculation       | Final share | Returned |
|--------|------------------------|-------------|----------|
| Alice  | (30/75) × 82 = $32.80  | $32.80      | $9.20    |
| Bob    | (20/75) × 82 = $21.87  | $21.87      | $6.13    |
| Carol  | (25/75) × 82 = $27.33  | $27.33      | $7.67    |

Bob paid the physical bill:
- Receives Alice's $32.80 + Carol's $27.33
- His own $21.87 is deducted from his locked $28
- He gets $6.13 back (his unused buffer)
- Net cost to Bob: **$21.87** — his fair share, nothing more

---

## Why Arc

- **USDC is the native gas token** — no ETH or AVAX needed. You pay for
  transactions with the same token you're splitting. Fees are predictable and
  cheap.
- **Sub-second finality** — settlement is instant. The funds move the moment the
  transaction lands, not after 12 confirmations.
- **Purpose-built for programmable money** — TabLock is exactly the use case Arc
  was designed for: real-value USDC flows with smart contract logic and no
  bridging complexity.

**Arc Testnet details:**
- RPC: `https://rpc.testnet.arc.network`
- Chain ID: `5042002`
- Explorer: `https://testnet.arcscan.app`
- USDC: `0x3600000000000000000000000000000000000000`
- Faucet: `https://faucet.circle.com`

---

## Setup

### 1. Contracts

```bash
cd contracts
npm install
cp .env.example .env   # fill in PRIVATE_KEY
npx hardhat run scripts/deploy.js --network arc
```

The deployed address is saved to `contracts/deployments.json`. Copy it into the
backend and frontend `.env` files.

### 2. Backend

```bash
cd backend
npm install
# Edit .env — set TABLOCK_CONTRACT_ADDRESS to your deployed address
node src/index.js
```

Requires MongoDB running locally on `mongodb://localhost:27017`. The backend
will warn but continue if MongoDB is unavailable.

### 3. Frontend

```bash
cd frontend
npm install
# Edit .env — set VITE_CONTRACT_ADDRESS to your deployed address
npm run dev
```

Opens at `http://localhost:3000`.

---

## Smart Contract Functions

All functions are in `contracts/contracts/TabLock.sol`.

### `createTab(name, organizerName, foodEstimateRaw) → tabId`
Creates a new tab and locks the organizer's USDC. Requires prior ERC-20 approval.
- Caller: anyone (becomes organizer)
- `foodEstimateRaw`: USDC in 6-decimal units ($30 = 30000000)
- Locked amount: `foodEstimateRaw × 1.4`

### `joinTab(tabId, displayName, foodEstimateRaw)`
Joins an open tab and locks USDC. Requires prior ERC-20 approval.
- Caller: any non-member
- Tab must be OPEN

### `removeMember(tabId, memberAddress)`
Removes a member and returns their full locked amount to them.
- Caller: organizer only
- Cannot remove the organizer themselves
- Tab must be OPEN

### `leaveTab(tabId)`
The caller leaves the tab voluntarily and gets their full locked amount back.
- Caller: any non-organizer active member
- Tab must be OPEN

### `settleBill(tabId, actualBillRaw)`
Declares the actual bill total. Calculates shares, pays the payer, returns buffers.
- Caller: any active member (they become the declared payer)
- Tab must be OPEN with ≥ 2 active members

### `cancelTab(tabId)`
Cancels the tab and returns all locked USDC to every active member.
- Caller: organizer only
- Tab must be OPEN

### Read functions
- `getTab(tabId)` — full tab data
- `getMemberInfo(tabId, address)` — per-member data
- `getTabMembers(tabId)` — array of member addresses
- `getUserTabs(address)` — all tab IDs for a user

---

## Edge Cases

### Someone leaves before settlement (Example 2)

Alice ($30), Bob ($20), Carol ($25) join. Carol leaves → gets her $35 back.

New totals: food $50, locked $70. Actual bill: $55.

- Alice: (30/50) × 55 = $33 → returned $9
- Bob:   (20/50) × 55 = $22 → returned $6

Proportions adjust automatically based on remaining active members.

### Bill much larger than expected (Example 3)

Alice $10 food → locks $14. Bob $10 food → locks $14. Actual bill: $40.

- Alice share: (10/20) × 40 = $20 → **capped at $14**, returned $0
- Bob share: (10/20) × 40 = $20 → **capped at $14**, returned $0

Payer receives $14 + $14 = $28 from others. Their own $14 covered their capped
share. Payer absorbs the $6 gap. This only happens when the actual bill exceeds
the total locked amount — i.e., more than 40% over food estimates. Extremely
rare in practice. The UI warns users when this might occur.

---

## Project Structure

```
tablock/
  contracts/
    contracts/TabLock.sol      ← Solidity contract
    scripts/deploy.js          ← Hardhat deploy script
    hardhat.config.js
    .env                       ← PRIVATE_KEY, ARC_RPC
  backend/
    src/
      models/Tab.js            ← MongoDB Tab schema
      models/Session.js        ← MongoDB Session schema
      services/contract.js     ← ethers.js contract sync
      routes/tabs.js           ← /api/tabs routes
      routes/sessions.js       ← /api/sessions routes
      index.js                 ← Express app entry
    .env                       ← MONGODB_URI, contract address
  frontend/
    src/
      hooks/useWallet.jsx      ← MetaMask wallet state
      services/contract.js     ← contract interaction helpers
      services/api.js          ← backend API calls
      pages/Home.jsx
      pages/CreateTab.jsx
      pages/TabLobby.jsx       ← main shared screen
      pages/MyTabs.jsx
      components/              ← Navbar, MemberCard, modals, QR
    .env                       ← VITE_CONTRACT_ADDRESS
```
