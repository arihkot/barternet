import { useState, useEffect, useCallback } from "react";
import { scValToNative } from "@stellar/stellar-sdk";
import { useWallet } from "../context/WalletContext";
import { buildAndSimulate } from "../lib/stellar";
import RedemptionCatalog from "../components/RedemptionCatalog";

const FACTORY = import.meta.env.VITE_TOKEN_FACTORY_ADDRESS;

interface Merchant {
  merchant: string;
  name: string;
  symbol: string;
  token_address: string;
}

export default function Marketplace() {
  const { connected, publicKey } = useWallet();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedMerchant, setSelectedMerchant] = useState<string | null>(null);
  const [selectedToken, setSelectedToken] = useState<string>("");

  const fetchMerchants = useCallback(async () => {
    if (!publicKey) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { sim } = await buildAndSimulate(publicKey, FACTORY, "list_merchants", []);
      const raw = scValToNative(sim.result!.retval) as any[];
      setMerchants(
        raw.map((m: any) => ({
          merchant: String(m.merchant),
          name: String(m.name),
          symbol: String(m.symbol),
          token_address: String(m.token_address),
        }))
      );
    } catch (e: any) {
      setError(e.message || "Failed to load merchants");
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    fetchMerchants();
  }, [fetchMerchants]);

  const filtered = merchants.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.symbol.toLowerCase().includes(search.toLowerCase()) ||
      m.merchant.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Marketplace</h1>

      <div>
        <input
          className="input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, symbol, or address..."
        />
      </div>

      {loading && <p className="text-gray-400">Loading...</p>}
      {error && (
        <div className="card">
          <p className="text-error text-sm mb-2">{error}</p>
          <button className="btn-secondary" onClick={fetchMerchants}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="card text-center py-8">
          <p className="text-gray-500">
            {search
              ? "No merchants match your search."
              : "No merchants registered yet."}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((m) => {
          const shortAddr = `${m.merchant.slice(0, 8)}...${m.merchant.slice(-6)}`;
          const isSelected = selectedMerchant === m.merchant;

          return (
            <div key={m.merchant} className="card space-y-3">
              <div>
                <p className="font-semibold text-lg">{m.name}</p>
                <p className="text-sm text-brand">{m.symbol}</p>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <p className="break-all">Token: {m.token_address}</p>
                <p>Owner: {shortAddr}</p>
              </div>
              {connected && (
                <button
                  className="btn-secondary w-full text-sm"
                  onClick={() => {
                    if (isSelected) {
                      setSelectedMerchant(null);
                      setSelectedToken("");
                    } else {
                      setSelectedMerchant(m.merchant);
                      setSelectedToken(m.token_address);
                    }
                  }}
                >
                  {isSelected ? "Hide Catalog" : "View Catalog"}
                </button>
              )}
              {!connected && (
                <p className="text-xs text-gray-600">
                  Connect wallet to view catalog
                </p>
              )}
              {isSelected && selectedToken && connected && (
                <RedemptionCatalog
                  merchantAddress={selectedMerchant}
                  tokenAddress={selectedToken}
                  onRedeem={() => {}}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
