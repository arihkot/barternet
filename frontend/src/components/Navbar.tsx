import { Link, useLocation } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import WalletButton from "./WalletButton";

export default function Navbar() {
  const { connected } = useWallet();
  const location = useLocation();

  const links = [
    { to: "/", label: "Home" },
    { to: "/marketplace", label: "Marketplace" },
  ];

  if (connected) {
    links.push(
      { to: "/merchant", label: "Merchant" },
      { to: "/consumer", label: "Dashboard" },
      { to: "/history", label: "History" }
    );
  }

  return (
    <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur sticky top-0 z-50">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-lg font-bold text-brand">
              BarterNet
            </Link>
            <div className="hidden sm:flex items-center gap-4">
              {links.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className={
                    "text-sm transition-colors " +
                    (location.pathname === l.to
                      ? "text-brand font-medium"
                      : "text-gray-400 hover:text-gray-200")
                  }
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
          <WalletButton />
        </div>
        {/* Mobile nav */}
        <div className="flex sm:hidden items-center gap-3 pb-2 overflow-x-auto">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={
                "text-xs whitespace-nowrap px-2 py-1 rounded " +
                (location.pathname === l.to
                  ? "bg-brand/20 text-brand"
                  : "text-gray-400")
              }
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
