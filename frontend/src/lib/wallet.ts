import {
  isConnected,
  requestAccess,
  getAddress,
  getNetwork,
  signTransaction as freighterSignTransaction,
} from "@stellar/freighter-api";

export const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";

export interface WalletInfo {
  publicKey: string;
  network: string;
  networkPassphrase: string;
}

export interface WalletConnection {
  connected: boolean;
  publicKey: string | null;
  network: string | null;
}

/**
 * Check whether the Freighter browser extension is installed and reachable.
 * In Freighter API v4.0+ this is the modern replacement for detecting the
 * `window.freighter` global directly.
 */
export async function isWalletInstalled(): Promise<boolean> {
  const { isConnected: connected, error } = await isConnected();
  return connected && !error;
}

/**
 * Prompt the user to authorize the dApp. This is the modern Freighter API
 * replacement for the deprecated `setAllowed` flow.
 */
export async function requestWalletAccess(): Promise<void> {
  const { error } = await requestAccess();
  if (error) throw new Error(error);
}

/**
 * Retrieve the active public key from Freighter. This maps to the wallet
 * permission/address retrieval requirement.
 */
export async function getWalletAddress(): Promise<string> {
  const { address, error } = await getAddress();
  if (error) throw new Error(error);
  return address;
}

/**
 * Retrieve the currently selected network from Freighter.
 */
export async function getWalletNetwork(): Promise<{
  network: string;
  networkPassphrase: string;
}> {
  const { network, networkPassphrase, error } = await getNetwork();
  if (error) throw new Error(error);
  if (!network || !networkPassphrase) {
    throw new Error("Unable to read Freighter network");
  }
  return { network, networkPassphrase };
}

/**
 * Request that the user sign a Stellar transaction with Freighter. The signed
 * XDR is returned and can be submitted to the Soroban RPC.
 */
export async function signWalletTransaction(xdr: string): Promise<string> {
  const { signedTxXdr, error } = await freighterSignTransaction(xdr, {
    networkPassphrase: TESTNET_PASSPHRASE,
  });
  if (error) throw new Error(error);
  return signedTxXdr;
}

/**
 * Connect to Freighter, verify the user is on Testnet, and return the wallet
 * info. This is the primary connect-wallet flow used by the UI.
 */
export async function connectWallet(): Promise<WalletInfo> {
  await requestWalletAccess();

  const publicKey = await getWalletAddress();
  const { network, networkPassphrase } = await getWalletNetwork();

  if (network !== "TESTNET" && networkPassphrase !== TESTNET_PASSPHRASE) {
    throw new Error("Please switch Freighter to Testnet");
  }

  return { publicKey, network, networkPassphrase };
}

/**
 * Restore an existing Freighter session without prompting the user.
 */
export async function restoreWalletConnection(): Promise<WalletConnection | null> {
  const installed = await isWalletInstalled();
  if (!installed) return null;

  try {
    const publicKey = await getWalletAddress();
    const { network } = await getWalletNetwork();
    return { connected: true, publicKey, network };
  } catch {
    return null;
  }
}

/**
 * Disconnect the in-memory wallet state. The browser extension itself remains
 * authorized; this only clears the dApp session.
 */
export async function disconnectWallet(): Promise<void> {
  // Freighter does not expose a disconnect RPC; the dApp simply forgets the
  // cached public key. Re-authorization can be managed in the extension UI.
  return Promise.resolve();
}
