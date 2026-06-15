import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext, useRouter, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";
import { PWAInstall } from "@/components/PWAInstall";

function NotFoundComponent() {
  return (
    <div className="min-h-screen grid place-items-center p-6 bg-gradient-hero">
      <div className="text-center space-y-3">
        <h1 className="text-7xl font-display font-bold text-gradient">404</h1>
        <p className="text-muted-foreground">This page got lost in the draw.</p>
        <a href="/" className="inline-block mt-2 px-5 py-2.5 bg-gradient-primary text-primary-foreground rounded-full font-semibold">Go home</a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="text-center space-y-3 max-w-sm">
        <h1 className="text-2xl font-display font-bold">Something broke</h1>
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="px-5 py-2.5 bg-gradient-primary text-primary-foreground rounded-full font-semibold">Try again</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#ff6b35" },
      { title: "LUCKDROP - Pakistan's #1 Lucky Draw Platform" },
      { name: "description", content: "Win iPhone, bikes, gold and cash from PKR 5. Pakistan's premium lucky draw and rewards platform." },
      { property: "og:title", content: "LUCKDROP - Pakistan's #1 Lucky Draw Platform" },
      { property: "og:description", content: "Win iPhone, bikes, gold and cash from PKR 5. Pakistan's premium lucky draw and rewards platform." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "LUCKDROP - Pakistan's #1 Lucky Draw Platform" },
      { name: "twitter:description", content: "Win iPhone, bikes, gold and cash from PKR 5. Pakistan's premium lucky draw and rewards platform." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/3e448b12-6741-402a-8806-e5270f9fd527" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/3e448b12-6741-402a-8806-e5270f9fd527" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <PWAInstall />
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}
