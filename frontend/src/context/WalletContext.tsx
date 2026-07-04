import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface WalletState {
  connected: boolean;
  publicKey: string | null;
  network: string | null;
}

interface WalletContextType extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signTransaction: (xdr: string) => Promise<string>;
}

const WalletContext = createContext<WalletContextType | null>(null);

const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";

interface FreighterAPI {
  isConnected: () => Promise<boolean>;
  getAddress: () => Promise<{ address: string }>;
  getNetwork: () => Promise<string>;
  signTransaction: (
    xdr: string,
    opts?: { networkPassphrase?: string }
  ) => Promise<{ signedTxXdr: string }>;
}

function getFreighter(): FreighterAPI | null {
  if (typeof window !== "undefined" && (window as any).freighterApi) {
    return (window as any).freighterApi as FreighterAPI;
  }
  return null;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    connected: false,
    publicKey: null,
    network: null,
  });

  useEffect(() => {
    const api = getFreighter();
    if (!api) return;
    api.isConnected().then((connected) => {
      if (connected) {
        Promise.all([api.getAddress(), api.getNetwork()]).then(
          ([addr, net]) => {
            setState({ connected: true, publicKey: addr.address, network: net });
          }
        );
      }
    });
  }, []);

  const connect = useCallback(async () => {
    const api = getFreighter();
    if (!api) throw new Error("Freighter wallet not installed");
    const addr = await api.getAddress();
    const net = await api.getNetwork();
    if (net !== "TESTNET" && net !== TESTNET_PASSPHRASE) {
      throw new Error("Please switch Freighter to Testnet");
    }
    setState({ connected: true, publicKey: addr.address, network: net });
  }, []);

  const disconnect = useCallback(async () => {
    setState({ connected: false, publicKey: null, network: null });
  }, []);

  const signTransaction = useCallback(async (xdr: string): Promise<string> => {
    const api = getFreighter();
    if (!api) throw new Error("Freighter wallet not installed");
    const result = await api.signTransaction(xdr, {
      networkPassphrase: TESTNET_PASSPHRASE,
    });
    return result.signedTxXdr;
  }, []);

  return (
    <WalletContext.Provider
      value={{ ...state, connect, disconnect, signTransaction }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
