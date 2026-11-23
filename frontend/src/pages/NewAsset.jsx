import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createAsset } from "../api/client";

export default function NewAsset() {
  const navigate = useNavigate();
  const [assetId, setAssetId] = useState("");
  const [category, setCategory] = useState("");
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const formData = new FormData();
    formData.append("asset_id", assetId);
    formData.append("category", category);
    if (photo) formData.append("photo", photo);

    try {
      await createAsset(formData);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create asset record");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-xl font-semibold mb-4">New Asset Entry</h1>

      {error && (
        <div className="bg-red-100 text-red-700 text-sm px-3 py-2 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Asset ID / Identification Number
          </label>
          <input
            type="text"
            value={assetId}
            onChange={(e) => setAssetId(e.target.value)}
            required
            className="w-full border rounded px-3 py-2"
            placeholder="e.g. WH-00123"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Asset Category</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className="w-full border rounded px-3 py-2"
            placeholder="e.g. Forklift, Pallet, Electronics"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Asset Photograph</label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setPhoto(e.target.files[0])}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white rounded px-4 py-2 font-medium disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save Asset"}
        </button>
      </form>
    </div>
  );
}
