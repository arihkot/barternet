import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useWallet } from "../context/WalletContext";
import { buildAndSimulate, submitSigned, explorerLink, getPoolAddress } from "../lib/stellar";
import SwapWidget from "../components/SwapWidget";

vi.mock("../context/WalletContext", () => ({
  useWallet: vi.fn(),
}));

vi.mock("../lib/stellar", () => ({
  buildAndSimulate: vi.fn(),
  submitSigned: vi.fn(),
  explorerLink: vi.fn(),
  scvAddress: vi.fn(),
  scvI128: vi.fn(),
  getPoolAddress: vi.fn(() => "GBPOOL1234567890ABCDEFGHIJKLMNOPQRSTUV"),
}));

vi.mock("@stellar/stellar-sdk", () => ({
  scValToNative: vi.fn().mockReturnValue("100"),
}));

const mockBalances = [
  { tokenAddress: "tokenA", symbol: "USDC", balance: 100, name: "USD Coin" },
  { tokenAddress: "tokenB", symbol: "EURC", balance: 50, name: "Euro Coin" },
];

describe("SwapWidget", () => {
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
    vi.mocked(buildAndSimulate).mockResolvedValue({
      tx: {} as any,
      sim: { result: { retval: {} } } as any,
    });
    vi.mocked(submitSigned).mockResolvedValue("fake-tx-hash");
    vi.mocked(explorerLink).mockReturnValue("https://example.com/tx/fake");
  });

  it("renders the token selector and amount input", () => {
    render(<SwapWidget balances={mockBalances} />);

    expect(screen.getByText("Swap Tokens")).toBeInTheDocument();

    // Two <select> elements: "From" (index 0), "To" (index 1)
    const selects = screen.getAllByRole("combobox");
    expect(selects).toHaveLength(2);

    expect(screen.getByPlaceholderText("0.00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Swap" })).toBeInTheDocument();
  });

  it("shows 'Insufficient balance' error when amount_in exceeds balance", () => {
    render(<SwapWidget balances={mockBalances} />);

    const selects = screen.getAllByRole("combobox");
    const fromSelect = selects[0];
    fireEvent.change(fromSelect, { target: { value: "tokenA" } });

    const amountInput = screen.getByPlaceholderText("0.00");
    fireEvent.change(amountInput, { target: { value: "200" } });

    expect(screen.getByText("Insufficient balance")).toBeInTheDocument();
  });

  it("disables the swap button when amount_in is 0", () => {
    render(<SwapWidget balances={mockBalances} />);

    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "tokenA" } });
    fireEvent.change(selects[1], { target: { value: "tokenB" } });

    const amountInput = screen.getByPlaceholderText("0.00");
    fireEvent.change(amountInput, { target: { value: "0" } });

    const swapButton = screen.getByRole("button", { name: "Swap" });
    expect(swapButton).toBeDisabled();
  });

  it("disables the swap button when amount_in exceeds balance", () => {
    render(<SwapWidget balances={mockBalances} />);

    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "tokenA" } });
    fireEvent.change(selects[1], { target: { value: "tokenB" } });

    const amountInput = screen.getByPlaceholderText("0.00");
    fireEvent.change(amountInput, { target: { value: "999" } });

    const swapButton = screen.getByRole("button", { name: "Swap" });
    expect(swapButton).toBeDisabled();
  });

  it("shows error message when swap fails", async () => {
    vi.mocked(buildAndSimulate).mockRejectedValue(
      new Error("Simulation failed: error")
    );

    render(<SwapWidget balances={mockBalances} />);

    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "tokenA" } });
    fireEvent.change(selects[1], { target: { value: "tokenB" } });

    const amountInput = screen.getByPlaceholderText("0.00");
    fireEvent.change(amountInput, { target: { value: "50" } });

    await waitFor(() => {
      expect(
        screen.getByText("Simulation failed: error")
      ).toBeInTheDocument();
    });
  });
});
