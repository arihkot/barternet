import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import MerchantDashboard from "./pages/MerchantDashboard";
import ConsumerDashboard from "./pages/ConsumerDashboard";
import Marketplace from "./pages/Marketplace";
import History from "./pages/History";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/merchant" element={<MerchantDashboard />} />
        <Route path="/consumer" element={<ConsumerDashboard />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </Layout>
  );
}
