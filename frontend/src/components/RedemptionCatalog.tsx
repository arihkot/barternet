import { useState, useEffect, useCallback } from "react";
import { scValToNative } from "@stellar/stellar-sdk";
import { useWallet } from "../context/WalletContext";
import {
  buildAndSimulate,
  submitSigned,
  explorerLink,
  scvAddress,
  scvI128,
  scvU32,
} from "../lib/stellar";

const REDEMPTION = import.meta.env.VITE_REDEMPTION_REGISTRY_ADDRESS;

interface CatalogItem {
  item_id: number;
  price: number;
  stock: number;
}

interface RedemptionCatalogProps {
  merchantAddress: string;
  tokenAddress: string;
  onRedeem: () => void;
}

export default function RedemptionCatalog({
  merchantAddress,
  tokenAddress,
  onRedeem,
}: RedemptionCatalogProps) {
  const { publicKey, signTransaction } = useWallet();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState<number | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  const fetchCatalog = useCallback(async () => {
    if (!publicKey) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { sim } = await buildAndSimulate(
        publicKey,
        REDEMPTION,
        "get_catalog",
        [scvAddress(merchantAddress)]
      );
      const raw = scValToNative(sim.result!.retval) as any[];
      setItems(
        raw.map((item: any) => ({
          item_id: Number(item.item_id),
          price: Number(item.price),
          stock: Number(item.stock),
        }))
      );
    } catch (e: any) {
      setError(e.message || "Failed to load catalog");
    } finally {
      setLoading(false);
    }
  }, [publicKey, merchantAddress]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const handleRedeem = async (itemId: number) => {
    if (!publicKey) return;
    setRedeeming(itemId);
    setRedeemError(null);
    setTxHash(null);
    try {
      const { tx, sim } = await buildAndSimulate(publicKey, REDEMPTION, "redeem", [
        scvAddress(publicKey),
        scvAddress(merchantAddress),
        scvU32(itemId),
      ]);
      const hash = await submitSigned(tx, sim, signTransaction);
      setTxHash(hash);
      await fetchCatalog();
      onRedeem();
    } catch (e: any) {
      setRedeemError(e.message || "Redemption failed");
    } finally {
      setRedeeming(null);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <p className="text-error">{error}</p>
        <button className="btn-secondary mt-3" onClick={fetchCatalog}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      <h3 className="text-lg font-semibold">Redemption Catalog</h3>

      {items.length === 0 && (
        <p className="text-gray-500 text-sm">
          No items in this merchant&apos;s catalog yet.
        </p>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.item_id}
            className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          >
            <div>
              <p className="font-medium">Item #{item.item_id}</p>
              <p className="text-sm text-gray-400">
                Price: {item.price} tokens
              </p>
              <p
                className={`text-sm ${
                  item.stock > 0 ? "text-green-400" : "text-error"
                }`}
              >
                Stock: {item.stock > 0 ? item.stock : "Out of stock"}
              </p>
            </div>
            <button
              className="btn-primary"
              disabled={item.stock === 0 || redeeming !== null}
              onClick={() => handleRedeem(item.item_id)}
            >
              {redeeming === item.item_id ? "Redeeming..." : "Redeem"}
            </button>
          </div>
        ))}
      </div>

      {redeemError && <p className="text-error text-sm">{redeemError}</p>}

      {txHash && (
        <div className="bg-green-900/30 border border-green-800 rounded-lg p-3 text-sm">
          <p className="text-green-400 font-medium mb-1">
            Redemption successful!
          </p>
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
