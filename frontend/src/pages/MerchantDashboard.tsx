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
  scvString,
  getFactoryAddress,
  getRedemptionAddress,
} from "../lib/stellar";

const FACTORY = getFactoryAddress();
const REDEMPTION = getRedemptionAddress();

type Tab = "register" | "mint" | "catalog";

interface CatalogItem {
  item_id: number;
  price: number;
  stock: number;
}

export default function MerchantDashboard() {
  const { connected, publicKey, signTransaction } = useWallet();
  const [tab, setTab] = useState<Tab>("register");

  if (!connected || !publicKey) {
    return (
      <div className="card text-center space-y-4 py-12">
        <p className="text-gray-400">Connect your Freighter wallet to access the merchant dashboard.</p>
      </div>
    );
  }

  if (!FACTORY || !REDEMPTION) {
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
      <h1 className="text-2xl font-bold">Merchant Dashboard</h1>

      <div className="flex gap-1 border-b border-gray-800 overflow-x-auto">
        {(["register", "mint", "catalog"] as Tab[]).map((t) => (
          <button
            key={t}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t
                ? "border-brand text-brand"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "register" && (
        <RegisterTab
          publicKey={publicKey}
          signTransaction={signTransaction}
          onRegistered={() => setTab("mint")}
        />
      )}
      {tab === "mint" && (
        <MintTab publicKey={publicKey} signTransaction={signTransaction} />
      )}
      {tab === "catalog" && (
        <CatalogTab publicKey={publicKey} signTransaction={signTransaction} />
      )}
    </div>
  );
}

function RegisterTab({
  publicKey,
  signTransaction,
  onRegistered,
}: {
  publicKey: string;
  signTransaction: (xdr: string) => Promise<string>;
  onRegistered: () => void;
}) {
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tokenAddress, setTokenAddress] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [alreadyRegistered, setAlreadyRegistered] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { sim } = await buildAndSimulate(publicKey, FACTORY, "get_merchant", [
          scvAddress(publicKey),
        ]);
        const result = scValToNative(sim.result!.retval);
        if (result && !cancelled) {
          setAlreadyRegistered(String(result.token_address ?? ""));
        }
      } catch {
        // not registered
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [publicKey]);

  const handleRegister = async () => {
    if (!name || !symbol) return;
    setLoading(true);
    setError(null);
    setTxHash(null);
    setTokenAddress(null);
    try {
      const { tx, sim } = await buildAndSimulate(publicKey, FACTORY, "register_merchant", [
        scvAddress(publicKey),
        scvString(name),
        scvString(symbol),
      ]);
      const hash = await submitSigned(tx, sim, signTransaction);
      setTxHash(hash);
      const addr = String(scValToNative(sim.result!.retval));
      setTokenAddress(addr);
      setAlreadyRegistered(addr);
      setName("");
      setSymbol("");
    } catch (e: any) {
      setError(e.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return <div className="card"><p className="text-gray-400">Loading...</p></div>;
  }

  if (alreadyRegistered) {
    return (
      <div className="card space-y-4">
        <h3 className="text-lg font-semibold text-green-400">Merchant Registered</h3>
        <p className="text-sm text-gray-400">Your loyalty token is deployed at:</p>
        <code className="block bg-gray-800 rounded-lg p-3 text-sm text-brand-light break-all">
          {alreadyRegistered}
        </code>
        <button className="btn-primary" onClick={onRegistered}>
          Go to Mint
        </button>
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      <h3 className="text-lg font-semibold">Register New Token</h3>
      <p className="text-sm text-gray-400">
        Deploy your branded loyalty token on the Stellar Testnet. This will
        create a new SEP-41 token contract you control.
      </p>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Token Name</label>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Coffee Points"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Token Symbol</label>
        <input
          className="input"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="COFFEE"
        />
      </div>
      {error && <p className="text-error text-sm">{error}</p>}
      <button
        className="btn-primary w-full"
        disabled={!name || !symbol || loading}
        onClick={handleRegister}
      >
        {loading ? "Registering..." : "Register Token"}
      </button>
      {txHash && (
        <div className="bg-green-900/30 border border-green-800 rounded-lg p-3 text-sm">
          <p className="text-green-400 font-medium mb-1">Registration successful!</p>
          {tokenAddress && (
            <p className="text-xs text-gray-400 mb-1 break-all">
              Token: {tokenAddress}
            </p>
          )}
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

function MintTab({
  publicKey,
  signTransaction,
}: {
  publicKey: string;
  signTransaction: (xdr: string) => Promise<string>;
}) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [tokenAddress, setTokenAddress] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { sim } = await buildAndSimulate(publicKey, FACTORY, "get_merchant", [
          scvAddress(publicKey),
        ]);
        const result = scValToNative(sim.result!.retval);
        if (result && !cancelled) {
          setTokenAddress(String(result.token_address));
        }
      } catch {
        // not registered
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [publicKey]);

  const handleMint = async () => {
    if (!tokenAddress || !recipient || !amount) return;
    setLoading(true);
    setError(null);
    setTxHash(null);
    try {
      const { tx, sim } = await buildAndSimulate(publicKey, tokenAddress, "mint", [
        scvAddress(recipient),
        scvI128(BigInt(Math.floor(Number(amount)))),
      ]);
      const hash = await submitSigned(tx, sim, signTransaction);
      setTxHash(hash);
      setRecipient("");
      setAmount("");
    } catch (e: any) {
      setError(e.message || "Mint failed");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return <div className="card"><p className="text-gray-400">Loading...</p></div>;
  }

  if (!tokenAddress) {
    return (
      <div className="card text-center space-y-3">
        <p className="text-gray-400">You need to register a token first.</p>
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      <h3 className="text-lg font-semibold">Mint Loyalty Tokens</h3>
      <p className="text-sm text-gray-400">
        Send newly minted tokens to a customer&apos;s wallet address.
      </p>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Recipient Address</label>
        <input
          className="input"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="G..."
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Amount</label>
        <input
          type="number"
          className="input"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="100"
          min="0"
        />
      </div>
      {error && <p className="text-error text-sm">{error}</p>}
      <button
        className="btn-primary w-full"
        disabled={!recipient || !amount || Number(amount) <= 0 || loading}
        onClick={handleMint}
      >
        {loading ? "Minting..." : "Mint Tokens"}
      </button>
      {txHash && (
        <div className="bg-green-900/30 border border-green-800 rounded-lg p-3 text-sm">
          <p className="text-green-400 font-medium mb-1">Mint successful!</p>
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

function CatalogTab({
  publicKey,
  signTransaction,
}: {
  publicKey: string;
  signTransaction: (xdr: string) => Promise<string>;
}) {
  const [tokenAddress, setTokenAddress] = useState<string | null>(null);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [itemId, setItemId] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addTxHash, setAddTxHash] = useState<string | null>(null);

  const [editItemId, setEditItemId] = useState("");
  const [editStock, setEditStock] = useState("");
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateTxHash, setUpdateTxHash] = useState<string | null>(null);

  const fetchCatalog = useCallback(async () => {
    if (!publicKey) return;
    setFetching(true);
    setFetchError(null);
    try {
      const { sim } = await buildAndSimulate(publicKey, REDEMPTION, "get_catalog", [
        scvAddress(publicKey),
      ]);
      const raw = scValToNative(sim.result!.retval) as any[];
      setItems(
        raw.map((item: any) => ({
          item_id: Number(item.item_id),
          price: Number(item.price),
          stock: Number(item.stock),
        }))
      );
    } catch (e: any) {
      setFetchError(e.message || "Failed to load catalog");
    } finally {
      setFetching(false);
    }
  }, [publicKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { sim } = await buildAndSimulate(publicKey, FACTORY, "get_merchant", [
          scvAddress(publicKey),
        ]);
        const result = scValToNative(sim.result!.retval);
        if (result && !cancelled) {
          setTokenAddress(String(result.token_address));
        }
      } catch {
        // not registered
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();
    return () => { cancelled = true; };
  }, [publicKey]);

  useEffect(() => {
    if (publicKey) fetchCatalog();
  }, [publicKey, fetchCatalog]);

  const handleAddItem = async () => {
    if (!itemId || !price || !stock) return;
    setAdding(true);
    setAddError(null);
    setAddTxHash(null);
    try {
      const { tx, sim } = await buildAndSimulate(publicKey, REDEMPTION, "add_item", [
        scvAddress(publicKey),
        scvU32(Number(itemId)),
        scvI128(BigInt(Math.floor(Number(price)))),
        scvU32(Number(stock)),
      ]);
      const hash = await submitSigned(tx, sim, signTransaction);
      setAddTxHash(hash);
      setItemId("");
      setPrice("");
      setStock("");
      await fetchCatalog();
    } catch (e: any) {
      setAddError(e.message || "Failed to add item");
    } finally {
      setAdding(false);
    }
  };

  const handleUpdateStock = async () => {
    if (!editItemId || !editStock) return;
    setUpdating(true);
    setUpdateError(null);
    setUpdateTxHash(null);
    try {
      const { tx, sim } = await buildAndSimulate(publicKey, REDEMPTION, "update_item_stock", [
        scvAddress(publicKey),
        scvU32(Number(editItemId)),
        scvU32(Number(editStock)),
      ]);
      const hash = await submitSigned(tx, sim, signTransaction);
      setUpdateTxHash(hash);
      setEditItemId("");
      setEditStock("");
      await fetchCatalog();
    } catch (e: any) {
      setUpdateError(e.message || "Failed to update stock");
    } finally {
      setUpdating(false);
    }
  };

  if (!tokenAddress) {
    return (
      <div className="card text-center space-y-3">
        <p className="text-gray-400">You need to register a token first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card space-y-4">
        <h3 className="text-lg font-semibold">Add Catalog Item</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Item ID</label>
            <input
              type="number"
              className="input"
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              placeholder="1"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Price (tokens)</label>
            <input
              type="number"
              className="input"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="50"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Stock</label>
            <input
              type="number"
              className="input"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              placeholder="100"
            />
          </div>
        </div>
        {addError && <p className="text-error text-sm">{addError}</p>}
        <button
          className="btn-primary"
          disabled={!itemId || !price || !stock || adding}
          onClick={handleAddItem}
        >
          {adding ? "Adding..." : "Add Item"}
        </button>
        {addTxHash && (
          <div className="bg-green-900/30 border border-green-800 rounded-lg p-3 text-sm">
            <p className="text-green-400 font-medium mb-1">Item added!</p>
            <a
              href={explorerLink(addTxHash)}
              target="_blank"
              rel="noreferrer"
              className="text-brand-light hover:underline break-all text-xs"
            >
              {addTxHash}
            </a>
          </div>
        )}
      </div>

      <div className="card space-y-4">
        <h3 className="text-lg font-semibold">Update Stock</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Item ID</label>
            <input
              type="number"
              className="input"
              value={editItemId}
              onChange={(e) => setEditItemId(e.target.value)}
              placeholder="1"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">New Stock</label>
            <input
              type="number"
              className="input"
              value={editStock}
              onChange={(e) => setEditStock(e.target.value)}
              placeholder="50"
            />
          </div>
        </div>
        {updateError && <p className="text-error text-sm">{updateError}</p>}
        <button
          className="btn-primary"
          disabled={!editItemId || !editStock || updating}
          onClick={handleUpdateStock}
        >
          {updating ? "Updating..." : "Update Stock"}
        </button>
        {updateTxHash && (
          <div className="bg-green-900/30 border border-green-800 rounded-lg p-3 text-sm">
            <p className="text-green-400 font-medium mb-1">Stock updated!</p>
            <a
              href={explorerLink(updateTxHash)}
              target="_blank"
              rel="noreferrer"
              className="text-brand-light hover:underline break-all text-xs"
            >
              {updateTxHash}
            </a>
          </div>
        )}
      </div>

      <div className="card space-y-4">
        <h3 className="text-lg font-semibold">Current Catalog</h3>
        {fetching && <p className="text-gray-400">Loading...</p>}
        {fetchError && (
          <div>
            <p className="text-error text-sm mb-2">{fetchError}</p>
            <button className="btn-secondary" onClick={fetchCatalog}>
              Retry
            </button>
          </div>
        )}
        {!fetching && !fetchError && items.length === 0 && (
          <p className="text-gray-500 text-sm">No items in catalog.</p>
        )}
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.item_id}
              className="flex items-center justify-between bg-gray-800/50 rounded-lg px-4 py-3 border border-gray-700"
            >
              <div>
                <p className="text-sm font-medium">Item #{item.item_id}</p>
                <p className="text-xs text-gray-400">
                  Price: {item.price} | Stock: {item.stock}
                </p>
              </div>
              <button
                className="text-xs text-brand-light hover:underline"
                onClick={() => {
                  setEditItemId(String(item.item_id));
                  setEditStock(String(item.stock));
                }}
              >
                Edit Stock
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
