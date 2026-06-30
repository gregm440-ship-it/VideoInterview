import { QueryClient } from "@tanstack/react-query";

// Optimistic, fast-feeling defaults (Section 2: fast loads, optimistic UI).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
