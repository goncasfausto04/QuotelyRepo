import { apiFetch } from "../../api.js";

export const fetchOverview = () => apiFetch("/api/admin/overview");

export const updateSettings = (settings) => apiFetch("/api/admin/settings", { method: "PUT", json: settings });
