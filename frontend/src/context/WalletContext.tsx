import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  isConnected,
  getAddress,
  getNetwork,
  requestAccess,
  signTransaction as freighterSignTx,
} from "@stellar/freighter-api";

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

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    connected: false,
    publicKey: null,
    network: null,
  });

  useEffect(() => {
    isConnected().then(({ isConnected: connected, error }) => {
      if (connected && !error) {
        Promise.all([getAddress(), getNetwork()]).then(
          ([addr, net]) => {
            if (!addr.error && !net.error) {
              setState({
                connected: true,
                publicKey: addr.address,
                network: net.network,
              });
            }
          }
        );
      }
    });
  }, []);

  const connect = useCallback(async () => {
    const { error: accessError } = await requestAccess();
    if (accessError) throw new Error(accessError);

    const addr = await getAddress();
    if (addr.error) throw new Error(addr.error);
    const net = await getNetwork();
    if (net.error) throw new Error(net.error);

    if (net.network !== "TESTNET" && net.networkPassphrase !== TESTNET_PASSPHRASE) {
      throw new Error("Please switch Freighter to Testnet");
    }
    setState({ connected: true, publicKey: addr.address, network: net.network });
  }, []);

  const disconnect = useCallback(async () => {
    setState({ connected: false, publicKey: null, network: null });
  }, []);

  const signTransaction = useCallback(async (xdr: string): Promise<string> => {
    const result = await freighterSignTx(xdr, {
      networkPassphrase: TESTNET_PASSPHRASE,
    });
    if (result.error) throw new Error(result.error);
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
