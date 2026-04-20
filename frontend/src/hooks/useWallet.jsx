import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";

const USDC_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
];

const ARC_CHAIN_ID = parseInt(import.meta.env.VITE_ARC_CHAIN_ID || "5042002");
const ARC_CHAIN_ID_HEX = "0x4CEF52";
const USDC_ADDRESS = import.meta.env.VITE_USDC_ADDRESS;

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [address, setAddress] = useState(null);
  const [usdcBalance, setUsdcBalance] = useState("0.00");
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chainId, setChainId] = useState(null);

  const getUsdcBalance = useCallback(async (addr) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);
      const raw = await usdc.balanceOf(addr);
      return (Number(raw) / 1e6).toFixed(2);
    } catch {
      return "0.00";
    }
  }, []);

  const switchToArc = useCallback(async () => {
    if (!window.ethereum) throw new Error("MetaMask not installed");
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: ARC_CHAIN_ID_HEX }],
      });
    } catch (err) {
      if (err.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: ARC_CHAIN_ID_HEX,
            chainName: "Arc Testnet",
            nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
            rpcUrls: ["https://rpc.testnet.arc.network"],
            blockExplorerUrls: ["https://testnet.arcscan.app"],
          }],
        });
      } else {
        throw err;
      }
    }
  }, []);

  const refreshBalance = useCallback(async (addr) => {
    if (!addr) return;
    const bal = await getUsdcBalance(addr);
    setUsdcBalance(bal);
  }, [getUsdcBalance]);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError("MetaMask is not installed. Please install it to continue.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (accounts.length === 0) throw new Error("No accounts found");
      const addr = accounts[0].toLowerCase();
      setAddress(addr);

      const hexChainId = await window.ethereum.request({ method: "eth_chainId" });
      const currentChainId = parseInt(hexChainId, 16);
      setChainId(currentChainId);

      if (currentChainId !== ARC_CHAIN_ID) {
        await switchToArc();
        setIsCorrectNetwork(true);
      } else {
        setIsCorrectNetwork(true);
      }

      const bal = await getUsdcBalance(addr);
      setUsdcBalance(bal);
    } catch (err) {
      if (err.code !== 4001) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [switchToArc, getUsdcBalance]);

  // Auto-reconnect on mount (no popup)
  useEffect(() => {
    if (!window.ethereum) return;
    window.ethereum.request({ method: "eth_accounts" }).then(async (accounts) => {
      if (accounts.length > 0) {
        const addr = accounts[0].toLowerCase();
        setAddress(addr);
        const hexChainId = await window.ethereum.request({ method: "eth_chainId" });
        const currentChainId = parseInt(hexChainId, 16);
        setChainId(currentChainId);
        setIsCorrectNetwork(currentChainId === ARC_CHAIN_ID);
        const bal = await getUsdcBalance(addr);
        setUsdcBalance(bal);
      }
    }).catch(() => {});
  }, [getUsdcBalance]);

  // Listen to wallet events
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = async (accounts) => {
      if (accounts.length === 0) {
        setAddress(null);
        setUsdcBalance("0.00");
        setIsCorrectNetwork(false);
      } else {
        const addr = accounts[0].toLowerCase();
        setAddress(addr);
        const bal = await getUsdcBalance(addr);
        setUsdcBalance(bal);
      }
    };

    const handleChainChanged = (hexChainId) => {
      const id = parseInt(hexChainId, 16);
      setChainId(id);
      setIsCorrectNetwork(id === ARC_CHAIN_ID);
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [getUsdcBalance]);

  return (
    <WalletContext.Provider value={{
      address, usdcBalance, isCorrectNetwork, loading, error,
      connect, switchToArc, refreshBalance, getUsdcBalance,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}

export default useWallet;
