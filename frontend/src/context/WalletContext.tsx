import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  connectWallet,
  disconnectWallet,
  restoreWalletConnection,
  signWalletTransaction,
} from "../lib/wallet";

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

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    connected: false,
    publicKey: null,
    network: null,
  });

  useEffect(() => {
    restoreWalletConnection().then((connection) => {
      if (connection) {
        setState(connection);
      }
    });
  }, []);

  const connect = useCallback(async () => {
    const { publicKey, network } = await connectWallet();
    setState({ connected: true, publicKey, network });
  }, []);

  const disconnect = useCallback(async () => {
    await disconnectWallet();
    setState({ connected: false, publicKey: null, network: null });
  }, []);

  const signTransaction = useCallback(async (xdr: string): Promise<string> => {
    return signWalletTransaction(xdr);
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
