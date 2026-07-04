import {
  Keypair,
  SorobanRpc,
  TransactionBuilder,
  Networks,
  Contract,
  nativeToScVal,
  Address,
  xdr,
} from "@stellar/stellar-sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTRACTS_PATH = path.resolve(__dirname, "..", "contracts.json");

const config = JSON.parse(fs.readFileSync(CONTRACTS_PATH, "utf-8"));

const FACTORY = (config.networks?.testnet?.token_factory as string) ?? "";
const POOL = (config.networks?.testnet?.barter_pool as string) ?? "";
const REDEMPTION = (config.networks?.testnet?.redemption_registry as string) ?? "";

if (!FACTORY || !POOL || !REDEMPTION) {
  console.error(
    "ERROR: One or more contract addresses are empty in contracts.json.\n" +
      "Deploy the contracts to Stellar Testnet first and update contracts.json with the deployed addresses:\n\n" +
      "  stellar contract deploy --wasm <path> --network testnet --source <admin>\n\n" +
      "Then update contracts.json:\n" +
      `  token_factory: "<TBD>"\n` +
      `  barter_pool: "<TBD>"\n` +
      `  redemption_registry: "<TBD>"\n`
  );
  process.exit(1);
}

const RPC_URL = "https://soroban-testnet.stellar.org";
const FRIENDBOT_URL = "https://friendbot.stellar.org";
const PASSPHRASE = Networks.TESTNET;
const FEE = "10000"; // stroops

const rpc = new SorobanRpc.Server(RPC_URL, { allowHttp: false });

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fundWithFriendbot(keypair: Keypair): Promise<void> {
  const addr = keypair.publicKey();
  console.log(`  Funding ${addr.slice(0, 8)}... via Friendbot`);
  const res = await fetch(`${FRIENDBOT_URL}?addr=${encodeURIComponent(addr)}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Friendbot failed for ${addr}: ${res.status} ${text}`);
  }
  console.log(`  Friendbot responded OK for ${addr.slice(0, 8)}...`);
}

async function pollAccount(keypair: Keypair, maxRetries = 20): Promise<void> {
  const addr = keypair.publicKey();
  for (let i = 0; i < maxRetries; i++) {
    try {
      const resp = await rpc.getAccount(addr);
      if (resp) {
        console.log(`  Account ${addr.slice(0, 8)}... ready (seq ${resp.sequenceNumber()})`);
        return;
      }
    } catch {
      // account not found yet
    }
    await sleep(2000);
  }
  throw new Error(`Account ${addr} not funded after ${maxRetries} retries`);
}

async function getAccount(keypair: Keypair) {
  const addr = keypair.publicKey();
  return await rpc.getAccount(addr);
}

async function buildAndSubmit(
  source: Keypair,
  contractAddress: string,
  method: string,
  args: xdr.ScVal[],
  description: string
): Promise<string> {
  const sourceAccount = await getAccount(source);
  const contract = new Contract(contractAddress);
  const tx = new TransactionBuilder(sourceAccount, {
    fee: FEE,
    networkPassphrase: PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const simulated = await rpc.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(simulated)) {
    throw new Error(
      `Simulation failed for ${description}: ${simulated.error}`
    );
  }

  const prepared = rpc.prepareTransaction(tx);
  prepared.sign(source);

  const sendResp = await rpc.sendTransaction(prepared);
  if (sendResp.status === "ERROR") {
    throw new Error(`Send failed for ${description}: ${sendResp.errorResult}`);
  }

  let hash: string;
  if ("hash" in sendResp && typeof sendResp.hash === "string") {
    hash = sendResp.hash;
  } else {
    throw new Error(`Unexpected send response for ${description}`);
  }

  let pollCount = 0;
  while (pollCount < 30) {
    const status = await rpc.getTransaction(hash);
    if (status.status === "SUCCESS") {
      console.log(`  ✓ ${description}`);
      console.log(`    tx: ${hash}`);
      console.log(
        `    explorer: https://stellar.expert/explorer/testnet/tx/${hash}`
      );
      return hash;
    } else if (status.status === "FAILED") {
      throw new Error(
        `Transaction failed for ${description}: ${JSON.stringify(status)}`
      );
    }
    await sleep(1500);
    pollCount++;
  }
  throw new Error(`Timeout waiting for ${description} (hash: ${hash})`);
}

function merchantNames(): string[] {
  return [
    "Bean & Brew Coffee",
    "Page & Quill Books",
    "Shear Genius Barber",
    "Petal & Stem Florist",
    "Hearth & Table Bakery",
  ];
}

function merchantSymbols(): string[] {
  return ["BEAN", "QUILL", "SHEAR", "PETAL", "HRTH"];
}

interface CatalogEntry {
  item_id: number;
  name: string;
  price: number;
  stock: number;
}

function merchantCatalogs(): CatalogEntry[][] {
  return [
    [
      { item_id: 1, name: "Free Latte", price: 50, stock: 30 },
      { item_id: 2, name: "Free Pastry", price: 30, stock: 40 },
      { item_id: 3, name: "Bag of Beans", price: 200, stock: 10 },
    ],
    [
      { item_id: 1, name: "Free Bookmark", price: 20, stock: 50 },
      { item_id: 2, name: "10% Off Any Book", price: 75, stock: 25 },
      { item_id: 3, name: "Free Paperback", price: 150, stock: 15 },
    ],
    [
      { item_id: 1, name: "Free Beard Trim", price: 60, stock: 20 },
      { item_id: 2, name: "Free Haircut", price: 120, stock: 15 },
      { item_id: 3, name: "Hot Towel Shave", price: 180, stock: 10 },
    ],
    [
      { item_id: 1, name: "Single Rose", price: 25, stock: 50 },
      { item_id: 2, name: "Small Bouquet", price: 80, stock: 20 },
      { item_id: 3, name: "Premium Arrangement", price: 200, stock: 8 },
    ],
    [
      { item_id: 1, name: "Free Cookie", price: 15, stock: 60 },
      { item_id: 2, name: "Free Loaf", price: 70, stock: 20 },
      { item_id: 3, name: "Custom Cake (small)", price: 250, stock: 5 },
    ],
  ];
}

async function main() {
  console.log("=== BarterNet Testnet Seed Script ===\n");
  console.log(`Token Factory:     ${FACTORY}`);
  console.log(`Barter Pool:       ${POOL}`);
  console.log(`Redemption Reg:    ${REDEMPTION}`);
  console.log();

  // ── Step 1: Generate keypairs ──────────────────────────────────────
  console.log("Generating 55 keypairs (5 merchants + 50 consumers)...");
  const total = 55;
  const merchantCount = 5;
  const consumerCount = 50;

  const allKeypairs: Keypair[] = [];
  for (let i = 0; i < total; i++) {
    allKeypairs.push(Keypair.random());
  }
  const merchants = allKeypairs.slice(0, merchantCount);
  const consumers = allKeypairs.slice(merchantCount, merchantCount + consumerCount);

  console.log(`  Merchants: ${merchants.length}`);
  console.log(`  Consumers: ${consumers.length}\n`);

  // ── Step 2: Fund via Friendbot ─────────────────────────────────────
  console.log("Funding all 55 accounts via Friendbot...");
  for (let i = 0; i < allKeypairs.length; i++) {
    try {
      await fundWithFriendbot(allKeypairs[i]);
    } catch (e) {
      console.error(`  Friendbot error for key ${i}: ${e}`);
    }
    // Stagger Friendbot requests to avoid rate limiting
    if ((i + 1) % 5 === 0) {
      await sleep(3000);
    }
  }
  console.log();

  // ── Step 3: Wait for funding ───────────────────────────────────────
  console.log("Waiting for all accounts to appear on-chain...");
  for (const kp of allKeypairs) {
    await pollAccount(kp);
  }
  console.log("All accounts funded.\n");

  // ── Step 4: Register merchants with factory ────────────────────────
  console.log("Registering merchants via token_factory...");
  const names = merchantNames();
  const symbols = merchantSymbols();
  const catalogs = merchantCatalogs();
  const tokenAddresses: string[] = [];

  for (let i = 0; i < merchants.length; i++) {
    const merchant = merchants[i];
    const name = names[i];
    const symbol = symbols[i];

    const addr = Address.fromString(merchant.publicKey());
    const nameSV = nativeToScVal(name, { type: "string" });
    const symbolSV = nativeToScVal(symbol, { type: "string" });

    console.log(`  Registering ${name} (${symbol})...`);
    await buildAndSubmit(
      merchant,
      FACTORY,
      "register_merchant",
      [addr.toScVal(), nameSV, symbolSV],
      `register_merchant: ${name}`
    );

    // The token address is returned from register_merchant, but since we
    // can't easily extract it from the raw tx result in this flow, we use
    // the factory's get_merchant_fn to look it up.
    await sleep(2000);
  }

  console.log();

  // ── Step 5: Look up deployed token addresses ───────────────────────
  console.log("Looking up token addresses from factory...");
  for (let i = 0; i < merchants.length; i++) {
    const merchant = merchants[i];
    const addr = Address.fromString(merchant.publicKey());
    const sourceAccount = await getAccount(merchant);
    const factoryContract = new Contract(FACTORY);

    const tx = new TransactionBuilder(sourceAccount, {
      fee: FEE,
      networkPassphrase: PASSPHRASE,
    })
      .addOperation(
        factoryContract.call("get_merchant_fn", addr.toScVal())
      )
      .setTimeout(30)
      .build();

    const simulated = await rpc.simulateTransaction(tx);
    if (SorobanRpc.Api.isSimulationError(simulated)) {
      console.error(`  Failed to simulate get_merchant for merchant ${i}: ${simulated.error}`);
      continue;
    }

    // The result contains the MerchantInfo struct with token_address
    const result = simulated.result;
    if (result?.retval) {
      // For a Vec<ScVal> or similar, we extract the address
      try {
        const tokenAddr = Address.fromScVal(result.retval).toString();
        tokenAddresses.push(tokenAddr);
        console.log(`  ${names[i]} -> token: ${tokenAddr}`);
      } catch {
        console.log(
          `  ${names[i]} -> token address embedded in result, see tx logs`
        );
        tokenAddresses.push("UNKNOWN");
      }
    } else {
      tokenAddresses.push("UNKNOWN");
    }
    await sleep(1000);
  }
  console.log();

  // ── Step 6: Populate catalogs via redemption_registry ──────────────
  console.log("Populating redemption catalogs...");
  for (let i = 0; i < merchants.length; i++) {
    const merchant = merchants[i];
    const cat = catalogs[i];
    for (const item of cat) {
      console.log(
        `  ${names[i]} adding item ${item.item_id} (${item.name}): ${item.price} pts, ${item.stock} stock`
      );
      const addr = Address.fromString(merchant.publicKey());
      await buildAndSubmit(
        merchant,
        REDEMPTION,
        "add_item",
        [
          addr.toScVal(),
          nativeToScVal(item.item_id, { type: "u32" }),
          nativeToScVal(item.price, { type: "i128" }),
          nativeToScVal(item.stock, { type: "u32" }),
        ],
        `add_item ${item.name} for ${names[i]}`
      );
      await sleep(1000);
    }
  }
  console.log();

  // ── Step 7: Mint tokens to consumers ───────────────────────────────
  console.log("Minting tokens to consumers...");
  for (let ci = 0; ci < consumers.length; ci++) {
    const consumer = consumers[ci];
    const consumerAddr = Address.fromString(consumer.publicKey());

    // Distribute consumers across merchants (10 consumers per merchant)
    const merchantIdx = ci % merchants.length;
    const merchant = merchants[merchantIdx];
    const tokenAddr = tokenAddresses[merchantIdx];

    if (!tokenAddr || tokenAddr === "UNKNOWN") {
      console.log(`  Skipping consumer ${ci}: no token address for merchant ${merchantIdx}`);
      continue;
    }

    const amount = 50 + Math.floor(Math.random() * 150); // 50-199 varied
    console.log(
      `  Minting ${amount} ${symbols[merchantIdx]} to consumer ${consumer.publicKey().slice(0, 8)}...`
    );

    try {
      await buildAndSubmit(
        merchant,
        tokenAddr,
        "mint",
        [consumerAddr.toScVal(), nativeToScVal(amount, { type: "i128" })],
        `mint ${amount} to consumer ${consumer.publicKey().slice(0, 8)}...`
      );
    } catch (e) {
      console.error(`  Mint failed for consumer ${ci}: ${e}`);
    }

    if ((ci + 1) % 5 === 0) {
      await sleep(2000);
    }
  }
  console.log();

  // ── Step 8: Swap between token pairs ───────────────────────────────
  console.log("Executing cross-merchant swaps...");
  const numSwaps = Math.min(consumers.length, 20); // sample of consumers do swaps
  for (let i = 0; i < numSwaps; i++) {
    const consumer = consumers[i];
    const consumerAddr = Address.fromString(consumer.publicKey());

    const fromIdx = i % merchants.length;
    const toIdx = (i + 1 + Math.floor(Math.random() * 2)) % merchants.length;

    const tokenIn = tokenAddresses[fromIdx];
    const tokenOut = tokenAddresses[toIdx];

    if (
      !tokenIn || tokenIn === "UNKNOWN" ||
      !tokenOut || tokenOut === "UNKNOWN" ||
      fromIdx === toIdx
    ) {
      continue;
    }

    const amountIn = 10 + Math.floor(Math.random() * 30); // 10-39
    const minOut = 1;

    console.log(
      `  Swap: ${symbols[fromIdx]} -> ${symbols[toIdx]}, amount_in=${amountIn}, consumer=${consumer.publicKey().slice(0, 8)}...`
    );

    try {
      await buildAndSubmit(
        consumer,
        POOL,
        "swap_exact_in",
        [
          consumerAddr.toScVal(),
          Address.fromString(tokenIn).toScVal(),
          Address.fromString(tokenOut).toScVal(),
          nativeToScVal(amountIn, { type: "i128" }),
          nativeToScVal(minOut, { type: "i128" }),
        ],
        `swap ${symbols[fromIdx]}->${symbols[toIdx]}`
      );
    } catch (e) {
      console.error(`  Swap failed for consumer ${i}: ${e}`);
    }

    await sleep(1500 + Math.random() * 1500);
  }
  console.log();

  // ── Step 9: Redemptions ────────────────────────────────────────────
  console.log("Executing redemptions...");
  for (let i = 0; i < consumers.length; i++) {
    const consumer = consumers[i];
    const consumerAddr = Address.fromString(consumer.publicKey());

    const merchantIdx = (i + 1) % merchants.length; // offset: spend at different merchant
    const merchant = merchants[merchantIdx];
    const merchAddr = Address.fromString(merchant.publicKey());
    const tokenAddr = tokenAddresses[merchantIdx];
    const cat = catalogs[merchantIdx];

    if (!tokenAddr || tokenAddr === "UNKNOWN" || !cat.length) continue;

    const item = cat[Math.floor(Math.random() * cat.length)];
    console.log(
      `  Redeem: consumer ${consumer.publicKey().slice(0, 8)}... -> ${item.name} (${item.price} pts) at ${names[merchantIdx]}`
    );

    try {
      await buildAndSubmit(
        consumer,
        REDEMPTION,
        "redeem",
        [
          consumerAddr.toScVal(),
          merchAddr.toScVal(),
          nativeToScVal(item.item_id, { type: "u32" }),
          Address.fromString(tokenAddr).toScVal(),
        ],
        `redeem ${item.name}`
      );
    } catch (e) {
      console.error(`  Redemption failed for consumer ${i}: ${e}`);
    }

    if ((i + 1) % 4 === 0) {
      await sleep(2000);
    }
  }

  console.log("\n=== Seeding Complete ===");
  console.log(`Merchants registered: ${merchants.length}`);
  console.log(`Consumers seeded:     ${consumers.length}`);
  console.log(`Token addresses:`);
  for (let i = 0; i < merchants.length; i++) {
    console.log(`  ${names[i]} (${symbols[i]}): ${tokenAddresses[i]}`);
  }
}

main().catch((err) => {
  console.error("Seed script failed:", err);
  process.exit(1);
});
