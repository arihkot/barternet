import { useState, useEffect, useCallback } from "react";
import { useWallet } from "../context/WalletContext";
import { explorerLink } from "../lib/stellar";

interface TxEntry {
  hash: string;
  type: string;
  timestamp: string;
  ledger: number;
}

const HORIZON_URL = "https://horizon-testnet.stellar.org";

const OP_LABELS: Record<string, string> = {
  invoke_host_function: "Contract Call",
  payment: "Payment",
  create_account: "Create Account",
  manage_sell_offer: "DEX Trade",
  path_payment_strict_send: "Path Payment",
  path_payment_strict_receive: "Path Payment",
  change_trust: "Trust Line",
  clawback: "Clawback",
  set_options: "Account Config",
};

function classifyOpType(operation: any): string {
  return OP_LABELS[operation.type] ?? operation.type ?? "Unknown";
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
      const url = `${HORIZON_URL}/accounts/${publicKey}/operations?limit=30&order=desc&join=transactions`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch history: ${response.statusText}`);
      }
      const data = await response.json();
      const records: any[] = data._embedded?.records ?? [];

      const seen = new Set<string>();
      const entries: TxEntry[] = [];
      for (const op of records) {
        const hash = op.transaction_hash;
        if (!hash || seen.has(hash)) continue;
        seen.add(hash);

        const type = op.transaction_successful
          ? classifyOpType(op)
          : `Failed: ${classifyOpType(op)}`;

        entries.push({
          hash,
          type,
          timestamp: new Date(op.created_at).toLocaleString(),
          ledger: op.transaction?.ledger ?? 0,
        });
      }

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
            No transactions found for this wallet.
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
                <span
                  className={`text-xs px-2 py-1 rounded font-medium ${
                    tx.type.startsWith("Failed")
                      ? "bg-red-900/50 text-red-400"
                      : "bg-gray-800 text-gray-300"
                  }`}
                >
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
