import { Link } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import WalletButton from "../components/WalletButton";

export default function Landing() {
  const { connected } = useWallet();

  return (
    <div className="space-y-16 py-8">
      <section className="text-center space-y-6">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
          <span className="text-brand">Cross-Merchant</span>{" "}
          <span className="text-gray-100">Loyalty Liquidity Engine</span>
        </h1>
        <p className="max-w-2xl mx-auto text-gray-400 text-lg leading-relaxed">
          Earn points at your favorite coffee shop and spend them at the
          bookstore next door. BarterNet makes every loyalty token instantly
          exchangeable through an on-chain liquidity layer.
        </p>
        {!connected && (
          <div className="flex justify-center">
            <WalletButton />
          </div>
        )}
        {connected && (
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/marketplace" className="btn-primary">
              Explore Marketplace
            </Link>
            <Link to="/consumer" className="btn-secondary">
              My Dashboard
            </Link>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card space-y-3 text-center">
          <div className="text-brand text-3xl font-bold">1</div>
          <h3 className="text-xl font-semibold">Issuance</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Mint your own branded loyalty tokens in seconds. No smart contract
            code required — register your business and start rewarding customers
            immediately.
          </p>
        </div>
        <div className="card space-y-3 text-center">
          <div className="text-brand text-3xl font-bold">2</div>
          <h3 className="text-xl font-semibold">Liquidity</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Swap any merchant token to any other in a single transaction. Our
            hub-and-spoke AMM routes every exchange through shared liquidity so
            no pair is left behind.
          </p>
        </div>
        <div className="card space-y-3 text-center">
          <div className="text-brand text-3xl font-bold">3</div>
          <h3 className="text-xl font-semibold">Redemption</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Spend your points anywhere. Browse merchant catalogs, pick your
            rewards, and redeem on-chain with one tap. Tokens are burned
            atomically — no trust required.
          </p>
        </div>
      </section>

      <section className="card text-center space-y-4">
        <h2 className="text-2xl font-bold">How It Works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="space-y-2">
            <p className="text-brand font-semibold">1. Merchants Register</p>
            <p className="text-gray-400">
              A coffee shop creates &quot;Coffee Points.&quot; A barber creates
              &quot;Clip Coins.&quot; Each token is a Stellar SEP-41 asset
              deployed by the factory.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-brand font-semibold">2. Consumers Earn</p>
            <p className="text-gray-400">
              After a purchase, the merchant mints loyalty tokens directly to
              the customer&apos;s Freighter wallet. One tap, instant settlement.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-brand font-semibold">3. Anyone Can Spend</p>
            <p className="text-gray-400">
              Swap Coffee Points into Clip Coins through the BarterNet AMM
              pools, then redeem for a discount at the barber. All in one
              transaction.
            </p>
          </div>
        </div>
      </section>

      <section className="text-center space-y-4">
        <h2 className="text-2xl font-bold">Built on Stellar</h2>
        <p className="text-gray-400 max-w-xl mx-auto text-sm leading-relaxed">
          Sub-5-second finality, sub-cent transaction fees, and a wallet
          ecosystem designed for mainstream users. BarterNet runs on the Stellar
          Testnet with Soroban smart contracts powering every swap and
          redemption.
        </p>
        <a
          href="https://stellar.org"
          target="_blank"
          rel="noreferrer"
          className="text-brand-light text-sm hover:underline inline-block"
        >
          Learn more about Stellar &rarr;
        </a>
      </section>
    </div>
  );
}
