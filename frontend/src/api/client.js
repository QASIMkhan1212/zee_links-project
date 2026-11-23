import axios from "axios";

// Set VITE_API_BASE_URL in a .env file to the backend server's LAN IP,
// e.g. http://192.168.1.50:8000, so phones/other devices on the same
// warehouse network can reach the backend. Defaults to localhost for
// development on the same machine as the backend.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const client = axios.create({
  baseURL: API_BASE_URL,
});

export const getAssets = () => client.get("/api/assets");

export const searchAssets = (query) =>
  client.get("/api/assets/search", { params: { q: query } });

export const getAsset = (assetId) => client.get(`/api/assets/${assetId}`);

export const createAsset = (formData) =>
  client.post("/api/assets", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const imageUrl = (path) => `${API_BASE_URL}${path}`;

export default client;
