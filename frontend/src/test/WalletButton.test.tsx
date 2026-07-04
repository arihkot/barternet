import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useWallet } from "../context/WalletContext";
import WalletButton from "../components/WalletButton";

vi.mock("../context/WalletContext", () => ({
  useWallet: vi.fn(),
}));

describe("WalletButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows 'Connect Freighter' when disconnected", () => {
    vi.mocked(useWallet).mockReturnValue({
      connected: false,
      publicKey: null,
      network: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      signTransaction: vi.fn(),
    });

    render(<WalletButton />);
    expect(screen.getByText("Connect Freighter")).toBeInTheDocument();
  });

  it("shows the shortened public key and 'Disconnect' button when connected", () => {
    vi.mocked(useWallet).mockReturnValue({
      connected: true,
      publicKey: "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCD",
      network: "TESTNET",
      connect: vi.fn(),
      disconnect: vi.fn(),
      signTransaction: vi.fn(),
    });

    render(<WalletButton />);
    expect(screen.getByText(/GABCDE.*ABCD/)).toBeInTheDocument();
    expect(screen.getByText("Disconnect")).toBeInTheDocument();
    expect(screen.getByText("Testnet")).toBeInTheDocument();
  });

  it("displays error message when connection fails", async () => {
    const mockConnect = vi
      .fn()
      .mockRejectedValue(new Error("Freighter wallet not installed"));

    vi.mocked(useWallet).mockReturnValue({
      connected: false,
      publicKey: null,
      network: null,
      connect: mockConnect,
      disconnect: vi.fn(),
      signTransaction: vi.fn(),
    });

    render(<WalletButton />);
    fireEvent.click(screen.getByText("Connect Freighter"));

    await waitFor(() => {
      expect(
        screen.getByText("Freighter wallet not installed")
      ).toBeInTheDocument();
    });
  });
});
