import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getAsset, imageUrl } from "../api/client";

export default function AssetDetail() {
  const { assetId } = useParams();
  const [asset, setAsset] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getAsset(assetId)
      .then((res) => setAsset(res.data))
      .catch(() => setNotFound(true));
  }, [assetId]);

  if (notFound) {
    return (
      <div className="max-w-md mx-auto p-4">
        <p className="text-red-600">Asset not found.</p>
        <Link to="/" className="text-blue-600 text-sm">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  if (!asset) {
    return <div className="max-w-md mx-auto p-4 text-gray-500">Loading...</div>;
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <Link to="/" className="text-blue-600 text-sm mb-4 inline-block">
        &larr; Back to Dashboard
      </Link>

      <h1 className="text-xl font-semibold mb-4">{asset.asset_id}</h1>

      {asset.photo_url ? (
        <img
          src={imageUrl(asset.photo_url)}
          alt={asset.asset_id}
          className="w-full rounded-lg mb-4 object-cover"
        />
      ) : (
        <div className="w-full h-48 bg-gray-100 rounded-lg mb-4 flex items-center justify-center text-gray-400">
          No photo available
        </div>
      )}

      <dl className="space-y-2">
        <div>
          <dt className="text-sm text-gray-500">Category</dt>
          <dd className="font-medium">{asset.category}</dd>
        </div>
        <div>
          <dt className="text-sm text-gray-500">Recorded At</dt>
          <dd className="font-medium">{asset.created_at}</dd>
        </div>
      </dl>
    </div>
  );
}
