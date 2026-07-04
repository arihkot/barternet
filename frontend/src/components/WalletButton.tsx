import { useState } from "react";
import { useWallet } from "../context/WalletContext";

export default function WalletButton() {
  const { connected, publicKey, network, connect, disconnect } = useWallet();
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setError(null);
    try {
      await connect();
    } catch (e: any) {
      setError(e.message || "Failed to connect");
    }
  };

  if (connected && publicKey) {
    const short = `${publicKey.slice(0, 6)}...${publicKey.slice(-4)}`;
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">{short}</span>
        <span className="text-xs px-2 py-0.5 rounded bg-green-900/50 text-green-400 border border-green-800">
          Testnet
        </span>
        <button onClick={disconnect} className="wallet-btn bg-gray-800 hover:bg-gray-700 text-gray-300">
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="text-xs text-error max-w-[200px] truncate">{error}</span>
      )}
      <button onClick={handleConnect} className="btn-primary">
        Connect Freighter
      </button>
    </div>
  );
}
