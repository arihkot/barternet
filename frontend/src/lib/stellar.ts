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

export async function buildAndSimulate(
  sourcePublicKey: string,
  contractId: string,
  method: string,
  args: xdr.ScVal[] = []
): Promise<{ tx: Transaction; sim: SimResult }> {
  const server = getRpc();
  const source = await server.getAccount(sourcePublicKey).catch(() => {
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

  const sim = await server.simulateTransaction(tx);
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
  const result = await server.sendTransaction(txToSubmit);

  if (result.status === "ERROR") {
    throw new Error(`Transaction failed: ${JSON.stringify(result)}`);
  }

  let hash = result.hash;
  for (let i = 0; i < 30; i++) {
    const txResult = await server.getTransaction(hash);
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
