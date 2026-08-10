import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { BranchProvider } from "./context/BranchContext";
import { router } from "./router";
import { useSocketSync } from "./hooks/useSocketSync";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        if (error?.response?.status === 429 || error?.response?.status === 401 || error?.response?.status === 403) {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});

function SocketSyncWrapper({ children }: { children: React.ReactNode }) {
  useSocketSync();
  return <>{children}</>;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BranchProvider>
          <SocketSyncWrapper>
            <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
            <RouterProvider router={router} future={{ v7_startTransition: true }} />
          </SocketSyncWrapper>
        </BranchProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}


