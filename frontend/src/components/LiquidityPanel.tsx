import { useState, useEffect, useCallback } from "react";
import { scValToNative } from "@stellar/stellar-sdk";
import { useWallet } from "../context/WalletContext";
import {
  buildAndSimulate,
  submitSigned,
  explorerLink,
  scvAddress,
  scvI128,
  getPoolAddress,
} from "../lib/stellar";

const POOL = getPoolAddress();

interface Balance {
  tokenAddress: string;
  symbol: string;
  balance: number;
  name: string;
}

export default function LiquidityPanel({ balances }: { balances: Balance[] }) {
  const { publicKey, signTransaction } = useWallet();
  const [token, setToken] = useState("");
  const [tokenAmt, setTokenAmt] = useState("");
  const [hubAmt, setHubAmt] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const selected = balances.find((b) => b.tokenAddress === token);
  const insufficientToken =
    selected && tokenAmt && Number(tokenAmt) > selected.balance;

  const handleAddLiquidity = async () => {
    if (!publicKey || !token || !tokenAmt || !hubAmt) return;
    setAdding(true);
    setError(null);
    setTxHash(null);
    try {
      if (insufficientToken) {
        throw new Error("Insufficient token balance");
      }
      const { tx, sim } = await buildAndSimulate(publicKey, POOL, "add_liquidity", [
        scvAddress(publicKey),
        scvAddress(token),
        scvI128(BigInt(Math.floor(Number(tokenAmt)))),
        scvI128(BigInt(Math.floor(Number(hubAmt) * 1e7))),
      ]);
      const hash = await submitSigned(tx, sim, signTransaction);
      setTxHash(hash);
      setToken("");
      setTokenAmt("");
      setHubAmt("");
    } catch (e: any) {
      setError(e.message || "Failed to add liquidity");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="card space-y-4">
      <h3 className="text-lg font-semibold">Add Liquidity</h3>
      <p className="text-sm text-gray-400">
        Deposit tokens and XLM into a pool to enable swaps. You must hold both assets.
      </p>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Token</label>
        <select
          className="input"
          value={token}
          onChange={(e) => { setToken(e.target.value); setTxHash(null); setError(null); }}
        >
          <option value="">Select token</option>
          {balances.map((b) => (
            <option key={b.tokenAddress} value={b.tokenAddress}>
              {b.symbol} — Balance: {b.balance}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Token Amount</label>
        <input
          type="number"
          className="input"
          value={tokenAmt}
          onChange={(e) => setTokenAmt(e.target.value)}
          placeholder="100"
          min="0"
        />
        {insufficientToken && (
          <p className="text-error text-xs mt-1">Insufficient token balance</p>
        )}
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">XLM Amount</label>
        <input
          type="number"
          className="input"
          value={hubAmt}
          onChange={(e) => setHubAmt(e.target.value)}
          placeholder="10"
          min="0"
          step="0.1"
        />
        <p className="text-xs text-gray-500 mt-1">
          XLM is used as the hub asset for all pools.
        </p>
      </div>

      {error && <p className="text-error text-sm">{error}</p>}

      <button
        className="btn-primary w-full"
        disabled={!token || !tokenAmt || !hubAmt || Number(tokenAmt) <= 0 || Number(hubAmt) <= 0 || insufficientToken || adding}
        onClick={handleAddLiquidity}
      >
        {adding ? "Adding Liquidity..." : "Add Liquidity"}
      </button>

      {txHash && (
        <div className="bg-green-900/30 border border-green-800 rounded-lg p-3 text-sm">
          <p className="text-green-400 font-medium mb-1">Liquidity added!</p>
          <a
            href={explorerLink(txHash)}
            target="_blank"
            rel="noreferrer"
            className="text-brand-light hover:underline break-all text-xs"
          >
            {txHash}
          </a>
        </div>
      )}
    </div>
  );
}
