import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { scValToNative } from "@stellar/stellar-sdk";
import { useWallet } from "../context/WalletContext";
import { buildAndSimulate, scvAddress, getFactoryAddress } from "../lib/stellar";
import SwapWidget from "../components/SwapWidget";

const FACTORY = getFactoryAddress();

interface Balance {
  tokenAddress: string;
  symbol: string;
  balance: number;
  name: string;
}

interface Merchant {
  merchant: string;
  name: string;
  symbol: string;
  token_address: string;
}

export default function ConsumerDashboard() {
  const { connected, publicKey } = useWallet();
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = useCallback(async () => {
    if (!publicKey) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { sim } = await buildAndSimulate(publicKey, FACTORY, "list_merchants", []);
      const merchants = scValToNative(sim.result!.retval) as any[];
      const results: Balance[] = [];

      for (const m of merchants) {
        const tokenAddr = String(m.token_address);
        try {
          const { sim: balanceSim } = await buildAndSimulate(
            publicKey,
            tokenAddr,
            "balance",
            [scvAddress(publicKey)]
          );
          const bal = Number(scValToNative(balanceSim.result!.retval));
          if (bal > 0) {
            results.push({
              tokenAddress: tokenAddr,
              symbol: String(m.symbol),
              balance: bal,
              name: String(m.name),
            });
          }
        } catch {
          // skip if balance query fails
        }
      }
      setBalances(results);
    } catch (e: any) {
      setError(e.message || "Failed to load balances");
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  if (!connected || !publicKey) {
    return (
      <div className="card text-center space-y-4 py-12">
        <p className="text-gray-400">
          Connect your Freighter wallet to view your balances and swap tokens.
        </p>
      </div>
    );
  }

  if (!FACTORY) {
    return (
      <div className="card text-center space-y-4 py-12">
        <p className="text-gray-400">
          Contracts not yet deployed. Update contracts.json and rebuild.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Consumer Dashboard</h1>

      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Your Balances</h3>
          <button className="btn-secondary text-xs" onClick={fetchBalances}>
            Refresh
          </button>
        </div>

        {loading && <p className="text-gray-400">Loading...</p>}
        {error && (
          <div>
            <p className="text-error text-sm mb-2">{error}</p>
            <button className="btn-secondary" onClick={fetchBalances}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && balances.length === 0 && (
          <p className="text-gray-500 text-sm">
            No token balances yet. Visit the{" "}
            <Link to="/marketplace" className="text-brand-light hover:underline">
              Marketplace
            </Link>{" "}
            to find merchants and earn tokens.
          </p>
        )}

        {!loading && !error && balances.length > 0 && (
          <div className="grid gap-2">
            {balances.map((b) => (
              <div
                key={b.tokenAddress}
                className="flex items-center justify-between bg-gray-800/50 rounded-lg px-4 py-3 border border-gray-700"
              >
                <div>
                  <p className="font-medium">{b.symbol}</p>
                  <p className="text-xs text-gray-500">{b.name}</p>
                </div>
                <p className="text-lg font-semibold text-brand-light">
                  {b.balance}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Link to="/marketplace" className="btn-secondary text-sm flex-1 text-center">
            Browse Marketplace
          </Link>
        </div>
      </div>

      {balances.length >= 2 && (
        <SwapWidget balances={balances} />
      )}

      {balances.length === 1 && (
        <div className="card">
          <p className="text-sm text-gray-500">
            You need at least two token types to swap. Earn more tokens from
            different merchants.
          </p>
        </div>
      )}
    </div>
  );
}
