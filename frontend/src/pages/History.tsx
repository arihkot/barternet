import { useState, useEffect, useCallback } from "react";
import { useWallet } from "../context/WalletContext";
import { getRpc, explorerLink } from "../lib/stellar";

interface TxEntry {
  hash: string;
  type: string;
  timestamp: string;
  ledger: number;
}

export default function History() {
  const { connected, publicKey } = useWallet();
  const [transactions, setTransactions] = useState<TxEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!publicKey) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const server = getRpc();
      const latestLedger = await server.getLatestLedger();

      const startLedger = Math.max(1, latestLedger.sequence - 500);
      const resp = await server.getTransactions({
        startLedger,
        limit: 20,
      });

      const entries: TxEntry[] = resp.transactions.map((tx) => ({
        hash: tx.txHash,
        type: tx.feeBump ? "Fee Bump" : "Contract Call",
        timestamp: new Date(Number(tx.createdAt) * 1000).toLocaleString(),
        ledger: tx.ledger,
      }));

      setTransactions(entries);
    } catch (e: any) {
      setError(e.message || "Failed to load transaction history");
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  if (!connected || !publicKey) {
    return (
      <div className="card text-center space-y-4 py-12">
        <p className="text-gray-400">
          Connect your Freighter wallet to view transaction history.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transaction History</h1>
        <button className="btn-secondary text-xs" onClick={fetchHistory}>
          Refresh
        </button>
      </div>

      {loading && <p className="text-gray-400">Loading...</p>}
      {error && (
        <div className="card">
          <p className="text-error text-sm mb-2">{error}</p>
          <button className="btn-secondary" onClick={fetchHistory}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && transactions.length === 0 && (
        <div className="card text-center py-8">
          <p className="text-gray-500">
            No recent transactions found on the network.
          </p>
        </div>
      )}

      {!loading && !error && transactions.length > 0 && (
        <div className="space-y-2">
          {transactions.map((tx) => (
            <div
              key={tx.hash}
              className="card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-300 font-medium">
                  {tx.type}
                </span>
                <div>
                  <p className="text-xs text-gray-500">
                    Ledger #{tx.ledger} &middot; {tx.timestamp}
                  </p>
                </div>
              </div>
              <a
                href={explorerLink(tx.hash)}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-brand-light hover:underline break-all sm:text-right"
              >
                {tx.hash.slice(0, 24)}...
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
