import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/AuthForm";

type AuthSearch = {
  redirect?: string;
  mode?: "login" | "signup";
  ref?: string;
};

export const Route = createFileRoute("/sign-in")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    mode: search.mode === "signup" ? "signup" : search.mode === "login" ? "login" : undefined,
    ref: typeof search.ref === "string" ? search.ref : undefined,
  }),
  component: SignInPage,
  head: () => ({
    meta: [
      { title: "Sign in — LUCKDROP" },
      { name: "description", content: "Sign in to your LUCKDROP account to start winning prizes from PKR 5." },
      { property: "og:title", content: "Sign in — LUCKDROP" },
      { property: "og:url", content: "https://luck5.lovable.app/sign-in" },
    ],
    links: [{ rel: "canonical", href: "https://luck5.lovable.app/sign-in" }],
  }),
});

function SignInPage() {
  return <AuthForm defaultMode="login" />;
}
