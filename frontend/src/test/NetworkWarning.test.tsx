import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useWallet } from "../context/WalletContext";

vi.mock("../context/WalletContext", () => ({
  useWallet: vi.fn(),
}));

const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";

function NetworkWarning() {
  const { network, connected } = useWallet();
  if (!connected || !network) return null;
  if (network !== "TESTNET" && network !== TESTNET_PASSPHRASE) {
    return <div>Warning: Please switch to Testnet</div>;
  }
  return <div>Connected to Testnet</div>;
}

describe("NetworkWarning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows warning when connected to a non-testnet network", () => {
    vi.mocked(useWallet).mockReturnValue({
      connected: true,
      network: "PUBLIC",
      publicKey: "GABC1234567890DEF",
      connect: vi.fn(),
      disconnect: vi.fn(),
      signTransaction: vi.fn(),
    });

    render(<NetworkWarning />);
    expect(
      screen.getByText("Warning: Please switch to Testnet")
    ).toBeInTheDocument();
  });

  it("shows no warning when connected to TESTNET", () => {
    vi.mocked(useWallet).mockReturnValue({
      connected: true,
      network: "TESTNET",
      publicKey: "GABC1234567890DEF",
      connect: vi.fn(),
      disconnect: vi.fn(),
      signTransaction: vi.fn(),
    });

    render(<NetworkWarning />);
    expect(screen.getByText("Connected to Testnet")).toBeInTheDocument();
    expect(
      screen.queryByText("Warning: Please switch to Testnet")
    ).not.toBeInTheDocument();
  });

  it("shows no warning when connected with the testnet passphrase", () => {
    vi.mocked(useWallet).mockReturnValue({
      connected: true,
      network: "Test SDF Network ; September 2015",
      publicKey: "GABC1234567890DEF",
      connect: vi.fn(),
      disconnect: vi.fn(),
      signTransaction: vi.fn(),
    });

    render(<NetworkWarning />);
    expect(screen.getByText("Connected to Testnet")).toBeInTheDocument();
  });

  it("renders nothing when disconnected", () => {
    vi.mocked(useWallet).mockReturnValue({
      connected: false,
      network: null,
      publicKey: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      signTransaction: vi.fn(),
    });

    const { container } = render(<NetworkWarning />);
    expect(container.firstChild).toBeNull();
  });
});
