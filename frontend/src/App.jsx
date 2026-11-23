import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import NewAsset from "./pages/NewAsset.jsx";
import AssetDetail from "./pages/AssetDetail.jsx";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/new" element={<NewAsset />} />
        <Route path="/assets/:assetId" element={<AssetDetail />} />
      </Routes>
    </div>
  );
}
