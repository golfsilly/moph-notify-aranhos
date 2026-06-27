"use client";

import { ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

interface ProvidersProps {
  children: ReactNode;
}
export function ProvidersReactQuery({ children }: ProvidersProps) {
  const [queryClient] = useState(() => {
    return new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30 * 1000,
          refetchOnWindowFocus: false,
          retry: 1,
        },
      },
    });
  });
  return (
    <QueryClientProvider client={queryClient}> {children} </QueryClientProvider>
  );
}
