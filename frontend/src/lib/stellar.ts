import {
  Contract,
  rpc,
  TransactionBuilder,
  Transaction,
  Networks,
  nativeToScVal,
  Address,
  xdr,
} from "@stellar/stellar-sdk";

const RPC_URL = "https://soroban-testnet.stellar.org";
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  label: string
): Promise<T> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(`[RPC] ${label} attempt ${attempt + 1} failed, retrying in ${delay}ms: ${e.message}`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw e;
    }
  }
  throw new Error("unreachable");
}

export function getRpc(): rpc.Server {
  return new rpc.Server(RPC_URL, { allowHttp: true });
}

export function scvAddress(addr: string) {
  return new Address(addr).toScVal();
}

export function scvI128(n: number | bigint) {
  return nativeToScVal(n, { type: "i128" });
}

export function scvU32(n: number) {
  return nativeToScVal(n, { type: "u32" });
}

export function scvString(s: string) {
  return nativeToScVal(s, { type: "string" });
}

export function scvSymbol(s: string) {
  return nativeToScVal(s, { type: "symbol" });
}

export type SimResult = rpc.Api.SimulateTransactionSuccessResponse | rpc.Api.SimulateTransactionRestoreResponse;

export function getFactoryAddress() {
  return (import.meta as any).env?.VITE_TOKEN_FACTORY_ADDRESS || "";
}
export function getPoolAddress() {
  return (import.meta as any).env?.VITE_BARTER_POOL_ADDRESS || "";
}
export function getRedemptionAddress() {
  return (import.meta as any).env?.VITE_REDEMPTION_REGISTRY_ADDRESS || "";
}
export function areContractsConfigured() {
  return !!(getFactoryAddress() && getPoolAddress() && getRedemptionAddress());
}

export async function buildAndSimulate(
  sourcePublicKey: string,
  contractId: string,
  method: string,
  args: xdr.ScVal[] = []
): Promise<{ tx: Transaction; sim: SimResult }> {
  if (!contractId) {
    throw new Error("Contract not configured — deploy contracts and update contracts.json");
  }
  const server = getRpc();
  const source = await retryWithBackoff(
    () => server.getAccount(sourcePublicKey),
    "getAccount"
  ).catch(() => {
    throw new Error("Account not found. Fund it via Friendbot first.");
  });

  const contract = new Contract(contractId);
  const tx = new TransactionBuilder(source, {
    fee: "100000",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const sim = await retryWithBackoff(
    () => server.simulateTransaction(tx),
    "simulateTransaction"
  );
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation failed: ${sim.error}`);
  }
  return { tx, sim };
}

export async function submitSigned(
  tx: Transaction,
  sim: SimResult,
  signFn: (xdr: string) => Promise<string>
): Promise<string> {
  const server = getRpc();
  const assembleTx = rpc.assembleTransaction(tx, sim);
  const signedXdr = assembleTx.build().toXDR();
  const signed = await signFn(signedXdr);
  const txToSubmit = TransactionBuilder.fromXDR(signed, Networks.TESTNET);
  const result = await retryWithBackoff(
    () => server.sendTransaction(txToSubmit),
    "sendTransaction"
  );

  if (result.status === "ERROR") {
    throw new Error(`Transaction failed: ${JSON.stringify(result)}`);
  }

  let hash = result.hash;
  for (let i = 0; i < 30; i++) {
    const txResult = await retryWithBackoff(
      () => server.getTransaction(hash),
      "getTransaction"
    );
    if (txResult.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return hash;
    }
    if (txResult.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(`Transaction failed: ${txResult.resultXdr}`);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("Transaction timed out");
}

export function explorerLink(txHash: string) {
  return `https://stellar.expert/explorer/testnet/tx/${txHash}`;
}
