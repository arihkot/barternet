import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isWalletInstalled,
  requestWalletAccess,
  getWalletAddress,
  getWalletNetwork,
  signWalletTransaction,
  connectWallet,
  restoreWalletConnection,
  TESTNET_PASSPHRASE,
} from "../lib/wallet";

const mockIsConnected = vi.fn();
const mockRequestAccess = vi.fn();
const mockGetAddress = vi.fn();
const mockGetNetwork = vi.fn();
const mockSignTransaction = vi.fn();

vi.mock("@stellar/freighter-api", () => ({
  isConnected: (...args: any[]) => mockIsConnected(...args),
  requestAccess: (...args: any[]) => mockRequestAccess(...args),
  getAddress: (...args: any[]) => mockGetAddress(...args),
  getNetwork: (...args: any[]) => mockGetNetwork(...args),
  signTransaction: (...args: any[]) => mockSignTransaction(...args),
}));

describe("wallet service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isWalletInstalled", () => {
    it("returns true when Freighter reports connected", async () => {
      mockIsConnected.mockResolvedValue({ isConnected: true });
      await expect(isWalletInstalled()).resolves.toBe(true);
    });

    it("returns false when Freighter reports disconnected", async () => {
      mockIsConnected.mockResolvedValue({ isConnected: false });
      await expect(isWalletInstalled()).resolves.toBe(false);
    });

    it("returns false when Freighter returns an error", async () => {
      mockIsConnected.mockResolvedValue({ isConnected: true, error: "denied" });
      await expect(isWalletInstalled()).resolves.toBe(false);
    });
  });

  describe("requestWalletAccess", () => {
    it("resolves when the user authorizes the dApp", async () => {
      mockRequestAccess.mockResolvedValue({});
      await expect(requestWalletAccess()).resolves.toBeUndefined();
    });

    it("throws when authorization fails", async () => {
      mockRequestAccess.mockResolvedValue({ error: "User rejected" });
      await expect(requestWalletAccess()).rejects.toThrow("User rejected");
    });
  });

  describe("getWalletAddress", () => {
    it("returns the active public key", async () => {
      mockGetAddress.mockResolvedValue({ address: "GABC..." });
      await expect(getWalletAddress()).resolves.toBe("GABC...");
    });

    it("throws when address retrieval fails", async () => {
      mockGetAddress.mockResolvedValue({ error: "Not authorized" });
      await expect(getWalletAddress()).rejects.toThrow("Not authorized");
    });
  });

  describe("getWalletNetwork", () => {
    it("returns the selected network", async () => {
      mockGetNetwork.mockResolvedValue({
        network: "TESTNET",
        networkPassphrase: TESTNET_PASSPHRASE,
      });
      await expect(getWalletNetwork()).resolves.toEqual({
        network: "TESTNET",
        networkPassphrase: TESTNET_PASSPHRASE,
      });
    });

    it("throws when network retrieval fails", async () => {
      mockGetNetwork.mockResolvedValue({ error: "Wallet locked" });
      await expect(getWalletNetwork()).rejects.toThrow("Wallet locked");
    });
  });

  describe("signWalletTransaction", () => {
    it("returns the signed transaction XDR", async () => {
      mockSignTransaction.mockResolvedValue({ signedTxXdr: "signed-xdr" });
      await expect(signWalletTransaction("raw-xdr")).resolves.toBe("signed-xdr");
    });

    it("throws when signing fails", async () => {
      mockSignTransaction.mockResolvedValue({ error: "Cancelled" });
      await expect(signWalletTransaction("raw-xdr")).rejects.toThrow("Cancelled");
    });
  });

  describe("connectWallet", () => {
    it("returns wallet info on Testnet", async () => {
      mockRequestAccess.mockResolvedValue({});
      mockGetAddress.mockResolvedValue({ address: "GABC..." });
      mockGetNetwork.mockResolvedValue({
        network: "TESTNET",
        networkPassphrase: TESTNET_PASSPHRASE,
      });

      await expect(connectWallet()).resolves.toEqual({
        publicKey: "GABC...",
        network: "TESTNET",
        networkPassphrase: TESTNET_PASSPHRASE,
      });
    });

    it("throws when the wallet is not on Testnet", async () => {
      mockRequestAccess.mockResolvedValue({});
      mockGetAddress.mockResolvedValue({ address: "GABC..." });
      mockGetNetwork.mockResolvedValue({
        network: "PUBLIC",
        networkPassphrase: "Public Global Stellar Network ; September 2015",
      });

      await expect(connectWallet()).rejects.toThrow(
        "Please switch Freighter to Testnet"
      );
    });
  });

  describe("restoreWalletConnection", () => {
    it("returns connected state when a session exists", async () => {
      mockIsConnected.mockResolvedValue({ isConnected: true });
      mockGetAddress.mockResolvedValue({ address: "GABC..." });
      mockGetNetwork.mockResolvedValue({
        network: "TESTNET",
        networkPassphrase: TESTNET_PASSPHRASE,
      });

      await expect(restoreWalletConnection()).resolves.toEqual({
        connected: true,
        publicKey: "GABC...",
        network: "TESTNET",
      });
    });

    it("returns null when Freighter is not installed", async () => {
      mockIsConnected.mockResolvedValue({ isConnected: false });
      await expect(restoreWalletConnection()).resolves.toBeNull();
    });

    it("returns null when reading the wallet fails", async () => {
      mockIsConnected.mockResolvedValue({ isConnected: true });
      mockGetAddress.mockResolvedValue({ error: "Not authorized" });
      await expect(restoreWalletConnection()).resolves.toBeNull();
    });
  });
});
