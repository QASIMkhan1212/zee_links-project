import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAssets, searchAssets, imageUrl } from "../api/client";

export default function Dashboard() {
  const [assets, setAssets] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAssets = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getAssets();
      setAssets(res.data);
    } catch (err) {
      setError("Could not reach the server. Check the backend is running and VITE_API_BASE_URL is correct.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  const handleSearch = async (e) => {
    const value = e.target.value;
    setQuery(value);
    if (value.trim() === "") {
      loadAssets();
      return;
    }
    setError("");
    try {
      const res = await searchAssets(value);
      setAssets(res.data);
    } catch (err) {
      setError("Could not reach the server. Check the backend is running and VITE_API_BASE_URL is correct.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Asset Dashboard</h1>
        <Link
          to="/new"
          className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium"
        >
          + New Asset
        </Link>
      </div>

      <input
        type="text"
        value={query}
        onChange={handleSearch}
        placeholder="Search by Asset ID..."
        className="w-full border rounded px-3 py-2 mb-4"
      />

      {error && (
        <div className="bg-red-100 text-red-700 text-sm px-3 py-2 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : assets.length === 0 ? (
        <p className="text-gray-500">No asset records found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {assets.map((asset) => (
            <Link
              key={asset.id}
              to={`/assets/${asset.asset_id}`}
              className="border rounded-lg p-3 flex gap-3 items-center hover:shadow-md transition"
            >
              {asset.photo_url ? (
                <img
                  src={imageUrl(asset.photo_url)}
                  alt={asset.asset_id}
                  className="w-16 h-16 object-cover rounded"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">
                  No photo
                </div>
              )}
              <div>
                <p className="font-medium">{asset.asset_id}</p>
                <p className="text-sm text-gray-500">{asset.category}</p>
                <p className="text-xs text-gray-400">{asset.created_at}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
