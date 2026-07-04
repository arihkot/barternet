import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useWallet } from "../context/WalletContext";
import { buildAndSimulate, submitSigned, explorerLink, getRedemptionAddress } from "../lib/stellar";
import RedemptionCatalog from "../components/RedemptionCatalog";

vi.mock("../context/WalletContext", () => ({
  useWallet: vi.fn(),
}));

vi.mock("../lib/stellar", () => ({
  buildAndSimulate: vi.fn(),
  submitSigned: vi.fn(),
  explorerLink: vi.fn(),
  scvAddress: vi.fn(),
  scvI128: vi.fn(),
  scvU32: vi.fn(),
  getRedemptionAddress: vi.fn(() => "GBRED1234567890ABCDEFGHIJKLMNOPQRSTUV"),
}));

vi.mock("@stellar/stellar-sdk", () => ({
  scValToNative: vi.fn(),
}));

const mockItems = [
  { item_id: 1, price: 100, stock: 5 },
  { item_id: 2, price: 200, stock: 0 },
  { item_id: 3, price: 50, stock: 10 },
];

describe("RedemptionCatalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useWallet).mockReturnValue({
      connected: true,
      publicKey: "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCD",
      network: "TESTNET",
      connect: vi.fn(),
      disconnect: vi.fn(),
      signTransaction: vi.fn(),
    });
    vi.mocked(submitSigned).mockResolvedValue("fake-tx-hash");
    vi.mocked(explorerLink).mockReturnValue("https://example.com/tx/fake");
  });

  it("displays loading state initially", () => {
    vi.mocked(buildAndSimulate).mockImplementation(
      () => new Promise(() => {})
    );

    render(
      <RedemptionCatalog
        merchantAddress="GBMERCHANT1234"
        tokenAddress="GBTOKEN5678"
        onRedeem={vi.fn()}
      />
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows catalog items with correct prices and stock", async () => {
    const { scValToNative } = await import("@stellar/stellar-sdk");
    vi.mocked(scValToNative).mockReturnValue(mockItems);
    vi.mocked(buildAndSimulate).mockResolvedValue({
      tx: {} as any,
      sim: { result: { retval: {} } } as any,
    });

    render(
      <RedemptionCatalog
        merchantAddress="GBMERCHANT1234"
        tokenAddress="GBTOKEN5678"
        onRedeem={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Redemption Catalog")).toBeInTheDocument();
    });

    expect(screen.getByText("Item #1")).toBeInTheDocument();
    expect(screen.getByText("Price: 100 tokens")).toBeInTheDocument();
    expect(screen.getByText("Stock: 5")).toBeInTheDocument();

    expect(screen.getByText("Item #2")).toBeInTheDocument();
    expect(screen.getByText("Price: 200 tokens")).toBeInTheDocument();
    expect(screen.getByText("Stock: Out of stock")).toBeInTheDocument();

    expect(screen.getByText("Item #3")).toBeInTheDocument();
    expect(screen.getByText("Price: 50 tokens")).toBeInTheDocument();
    expect(screen.getByText("Stock: 10")).toBeInTheDocument();
  });

  it("disables the Redeem button when stock is 0", async () => {
    const { scValToNative } = await import("@stellar/stellar-sdk");
    vi.mocked(scValToNative).mockReturnValue(mockItems);
    vi.mocked(buildAndSimulate).mockResolvedValue({
      tx: {} as any,
      sim: { result: { retval: {} } } as any,
    });

    render(
      <RedemptionCatalog
        merchantAddress="GBMERCHANT1234"
        tokenAddress="GBTOKEN5678"
        onRedeem={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Redemption Catalog")).toBeInTheDocument();
    });

    const redeemButtons = screen.getAllByText("Redeem");
    expect(redeemButtons).toHaveLength(3);

    expect(redeemButtons[0]).not.toBeDisabled();
    expect(redeemButtons[1]).toBeDisabled();
    expect(redeemButtons[2]).not.toBeDisabled();
  });

  it("shows error message and retry button on fetch failure", async () => {
    vi.mocked(buildAndSimulate).mockRejectedValue(
      new Error("Failed to load catalog")
    );

    render(
      <RedemptionCatalog
        merchantAddress="GBMERCHANT1234"
        tokenAddress="GBTOKEN5678"
        onRedeem={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Failed to load catalog")).toBeInTheDocument();
    });

    expect(screen.getByText("Retry")).toBeInTheDocument();
  });
});
