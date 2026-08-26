import { QueryClient } from "@tanstack/react-query";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Single-machine local app, no real cache benefit — always refetch on mount
        // rather than trusting a 30s-stale snapshot (was the main cause of needing an
        // F5 after edits: data invalidation only refreshed the exact resource edited,
        // not everywhere it was also shown).
        staleTime: 0,
        refetchOnWindowFocus: false,
      },
    },
  });
}
