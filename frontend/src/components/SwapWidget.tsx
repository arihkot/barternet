import { useState, useEffect, useCallback } from "react";
import { scValToNative } from "@stellar/stellar-sdk";
import { useWallet } from "../context/WalletContext";
import {
  buildAndSimulate,
  submitSigned,
  explorerLink,
  scvAddress,
  scvI128,
} from "../lib/stellar";

const POOL = import.meta.env.VITE_BARTER_POOL_ADDRESS;

interface Balance {
  tokenAddress: string;
  symbol: string;
  balance: number;
  name: string;
}

export default function SwapWidget({ balances }: { balances: Balance[] }) {
  const { publicKey, signTransaction } = useWallet();
  const [tokenIn, setTokenIn] = useState<string>("");
  const [tokenOut, setTokenOut] = useState<string>("");
  const [amountIn, setAmountIn] = useState<string>("");
  const [minAmountOut, setMinAmountOut] = useState<string>("");
  const [estimatedOut, setEstimatedOut] = useState<string>("");
  const [estimating, setEstimating] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const selectedIn = balances.find((b) => b.tokenAddress === tokenIn);
  const selectedOut = balances.find((b) => b.tokenAddress === tokenOut);
  const insufficientBalance =
    selectedIn && amountIn && Number(amountIn) > selectedIn.balance;

  const estimateOutput = useCallback(async () => {
    if (!publicKey || !tokenIn || !tokenOut || !amountIn || Number(amountIn) <= 0) {
      setEstimatedOut("");
      return;
    }
    setEstimating(true);
    setError(null);
    try {
      const { sim } = await buildAndSimulate(publicKey, POOL, "swap_exact_in", [
        scvAddress(publicKey),
        scvAddress(tokenIn),
        scvAddress(tokenOut),
        scvI128(BigInt(Math.floor(Number(amountIn)))),
        scvI128(0n),
      ]);
      setEstimatedOut(String(scValToNative(sim.result!.retval)));
    } catch (e: any) {
      setEstimatedOut("");
      if (!e.message?.includes("Account not found")) {
        setError(e.message || "Estimation failed");
      }
    } finally {
      setEstimating(false);
    }
  }, [publicKey, tokenIn, tokenOut, amountIn]);

  useEffect(() => {
    const t = setTimeout(estimateOutput, 400);
    return () => clearTimeout(t);
  }, [estimateOutput]);

  const handleSwap = async () => {
    if (!publicKey || !tokenIn || !tokenOut || !amountIn) return;
    setSwapping(true);
    setError(null);
    setTxHash(null);
    try {
      if (insufficientBalance) {
        throw new Error("Insufficient balance");
      }
      const amountInInt = BigInt(Math.floor(Number(amountIn)));
      const minOutInt = minAmountOut
        ? BigInt(Math.floor(Number(minAmountOut)))
        : 0n;
      const { tx, sim } = await buildAndSimulate(publicKey, POOL, "swap_exact_in", [
        scvAddress(publicKey),
        scvAddress(tokenIn),
        scvAddress(tokenOut),
        scvI128(amountInInt),
        scvI128(minOutInt),
      ]);
      const hash = await submitSigned(tx, sim, signTransaction);
      setTxHash(hash);
      setAmountIn("");
      setMinAmountOut("");
      setEstimatedOut("");
    } catch (e: any) {
      setError(e.message || "Swap failed");
    } finally {
      setSwapping(false);
    }
  };

  const otherTokens = balances.filter((b) => b.tokenAddress !== tokenIn);

  return (
    <div className="card space-y-4">
      <h3 className="text-lg font-semibold">Swap Tokens</h3>

      <div>
        <label className="block text-sm text-gray-400 mb-1">From</label>
        <select
          className="input"
          value={tokenIn}
          onChange={(e) => {
            setTokenIn(e.target.value);
            setTxHash(null);
            setError(null);
          }}
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
        <label className="block text-sm text-gray-400 mb-1">Amount</label>
        <input
          type="number"
          className="input"
          value={amountIn}
          onChange={(e) => setAmountIn(e.target.value)}
          placeholder="0.00"
          min="0"
        />
        {insufficientBalance && (
          <p className="text-error text-xs mt-1">Insufficient balance</p>
        )}
      </div>

      <div className="flex justify-center">
        <span className="text-gray-600 text-lg">&#8595;</span>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">To</label>
        <select
          className="input"
          value={tokenOut}
          onChange={(e) => {
            setTokenOut(e.target.value);
            setTxHash(null);
            setError(null);
          }}
        >
          <option value="">Select token</option>
          {otherTokens.map((b) => (
            <option key={b.tokenAddress} value={b.tokenAddress}>
              {b.symbol}
            </option>
          ))}
          {tokenIn && otherTokens.length === 0 && (
            <option disabled value="">
              No other tokens available
            </option>
          )}
        </select>
      </div>

      {estimating && (
        <p className="text-sm text-gray-500">Loading...</p>
      )}
      {estimatedOut && !estimating && (
        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
          <p className="text-xs text-gray-500">Estimated output</p>
          <p className="text-lg font-semibold">
            {estimatedOut} {selectedOut?.symbol ?? ""}
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm text-gray-400 mb-1">
          Min Amount Out (slippage protection)
        </label>
        <input
          type="number"
          className="input"
          value={minAmountOut}
          onChange={(e) => setMinAmountOut(e.target.value)}
          placeholder="0"
          min="0"
        />
      </div>

      {error && <p className="text-error text-sm">{error}</p>}

      <button
        className="btn-primary w-full"
        disabled={
          !tokenIn ||
          !tokenOut ||
          !amountIn ||
          Number(amountIn) <= 0 ||
          insufficientBalance ||
          swapping ||
          tokenIn === tokenOut
        }
        onClick={handleSwap}
      >
        {swapping ? "Swapping..." : "Swap"}
      </button>

      {txHash && (
        <div className="bg-green-900/30 border border-green-800 rounded-lg p-3 text-sm">
          <p className="text-green-400 font-medium mb-1">Swap successful!</p>
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
