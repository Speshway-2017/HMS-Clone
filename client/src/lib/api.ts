import axios from "axios";
import { tokenStorage } from "./tokenStorage";

export const getBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    const customUrl = localStorage.getItem("hms_custom_api_url");
    if (customUrl && typeof customUrl === "string" && customUrl.trim()) {
      const trimmed = customUrl.trim();
      return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed.replace(/\/$/, "")}/api/v1`;
    }
    const hmsConfigUrl = (window as any).HMS_CONFIG?.apiUrl;
    if (hmsConfigUrl && typeof hmsConfigUrl === "string" && hmsConfigUrl.trim()) {
      const trimmed = hmsConfigUrl.trim();
      return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed.replace(/\/$/, "")}/api/v1`;
    }
  }

  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim() !== "") {
    const trimmed = envUrl.trim();
    return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed.replace(/\/$/, "")}/api/v1`;
  }

  return "http://127.0.0.1:5000/api/v1";
};

export const API_BASE_URL = getBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

export function setCustomApiUrl(rawUrl: string): string {
  let cleanUrl = rawUrl.trim();
  if (cleanUrl) {
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = `http://${cleanUrl}`;
    }
    const fullApiUrl = cleanUrl.endsWith("/api/v1") ? cleanUrl : `${cleanUrl.replace(/\/$/, "")}/api/v1`;
    localStorage.setItem("hms_custom_api_url", fullApiUrl);
    api.defaults.baseURL = fullApiUrl;
    return fullApiUrl;
  } else {
    localStorage.removeItem("hms_custom_api_url");
    const defaultUrl = getBaseUrl();
    api.defaults.baseURL = defaultUrl;
    return defaultUrl;
  }
}

api.interceptors.request.use((config) => {
  if (config.url?.includes("/auth/login")) {
    console.log(`[HMS API] Sending login request to ${config.baseURL || ""}${config.url}`);
  }
  const token = tokenStorage.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const activeBranchId = localStorage.getItem("hms_active_branch_id");
  // Only forward X-Branch-ID when it is a real MongoDB ObjectId (not "all" or "main")
  if (activeBranchId && activeBranchId !== "all" && activeBranchId !== "main") {
    config.headers["X-Branch-ID"] = activeBranchId;
  } else if (activeBranchId === "main") {
    config.headers["X-Branch-ID"] = "main";
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    if (response.config.url?.includes("/auth/login")) {
      console.log(`[HMS API] Login response received: HTTP ${response.status}`);
    }
    return response;
  },
  async (error) => {
    if (error.config?.url?.includes("/auth/login")) {
      console.warn(`[HMS API] Login request failed: HTTP ${error.response?.status || "Network/Timeout Error"} - ${error.message}`);
    }
    const originalRequest = error.config;

    // Auto refresh token on 401 Unauthorized (unless request is login or refresh itself)
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = tokenStorage.getRefreshToken();
      if (!refreshToken) {
        isRefreshing = false;
        tokenStorage.clear();
        tokenStorage.broadcastSessionEvent("SESSION_INVALIDATED");
        return Promise.reject(error);
      }

      try {
        const refreshRes = await axios.post<{ data: { token: string; refreshToken: string } }>(
          "/api/v1/auth/refresh",
          { refreshToken }
        );

        const newAccessToken = refreshRes.data.data.token;
        const newRefreshToken = refreshRes.data.data.refreshToken;

        tokenStorage.set(newAccessToken, newRefreshToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        tokenStorage.clear();
        tokenStorage.broadcastSessionEvent("SESSION_INVALIDATED");
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.data) {
    const data: any = error.response.data;
    if (typeof data.message === "string" && data.message.trim()) {
      return data.message;
    }
    if (typeof data.error === "string" && data.error.trim()) {
      return data.error;
    }
    if (typeof data.detail === "string" && data.detail.trim()) {
      return data.detail;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}
