import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DiscoProvider } from "@/contexts/DiscoContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import SmoothScroll from "@/components/SmoothScroll";
import ScrollToTop from "@/components/ScrollToTop";
import "@/index.css";
import "@/pages/ccd.css";
import React from "react";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 30_000,
        // Prevent refetching on window focus during initial load — reduces
        // network waterfall and prevents "stuck" feeling from parallel fetches.
        refetchOnWindowFocus: false,
      },
    },
  });
}

// Browser: reuse a single client across navigations (created lazily).
// Server: always create a new client per request to avoid data leaks.
let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always create a fresh client
    return makeQueryClient();
  }
  // Browser: create once, reuse across navigations
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

/**
 * Page transition loading bar — shows when Next.js is navigating between pages.
 * Appears as a thin progress bar at the top of the viewport.
 */
function PageTransition() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const start = () => setLoading(true);
    const end = () => setLoading(false);

    router.events.on("routeChangeStart", start);
    router.events.on("routeChangeComplete", end);
    router.events.on("routeChangeError", end);

    return () => {
      router.events.off("routeChangeStart", start);
      router.events.off("routeChangeComplete", end);
      router.events.off("routeChangeError", end);
    };
  }, [router]);

  if (!loading) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[9999] h-1 bg-ink/20">
      <div className="h-full bg-magenta animate-[progress_1.5s_ease-in-out_infinite]" />
    </div>
  );
}

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PageTransition />
        <ThemeProvider>
          <DiscoProvider>
            <SmoothScroll>
              <ScrollToTop />
              <Component {...pageProps} />
              <ThemeSwitcher />
            </SmoothScroll>
          </DiscoProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
