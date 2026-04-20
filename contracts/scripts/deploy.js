const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

async function main() {
  console.log("Deploying TabLock to Arc Testnet...");
  console.log("USDC address:", USDC_ADDRESS);

  const TabLock = await hre.ethers.getContractFactory("TabLock");
  const tabLock = await TabLock.deploy(USDC_ADDRESS);
  await tabLock.waitForDeployment();

  const address = await tabLock.getAddress();
  console.log("TabLock deployed to:", address);

  const deployments = { TabLock: address, USDC: USDC_ADDRESS, network: "arc-testnet", chainId: 5042002 };
  fs.writeFileSync(
    path.join(__dirname, "../deployments.json"),
    JSON.stringify(deployments, null, 2)
  );
  console.log("Deployment saved to deployments.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
