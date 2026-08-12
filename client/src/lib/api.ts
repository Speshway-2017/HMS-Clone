import axios from "axios";
import { tokenStorage } from "./tokenStorage";

export const api = axios.create({
  baseURL: "/api/v1",
});

api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const activeBranchId = localStorage.getItem("hms_active_branch_id");
  if (activeBranchId) {
    config.headers["X-Branch-ID"] = activeBranchId;
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
  (response) => response,
  async (error) => {
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

export interface ApiErrorResponse {
  status: "error" | "fail";
  message: string;
}

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.message ?? "Something went wrong. Please try again.";
  }
  return "Something went wrong. Please try again.";
}
