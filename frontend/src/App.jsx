import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Home from "./pages/Home.jsx";
import CreateTab from "./pages/CreateTab.jsx";
import TabLobby from "./pages/TabLobby.jsx";
import MyTabs from "./pages/MyTabs.jsx";
import { WalletProvider } from "./hooks/useWallet.jsx";

export default function App() {
  return (
    <WalletProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/create" element={<CreateTab />} />
              <Route path="/tab/:shareCode" element={<TabLobby />} />
              <Route path="/my-tabs" element={<MyTabs />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </WalletProvider>
  );
}
