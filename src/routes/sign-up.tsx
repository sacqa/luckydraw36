import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/AuthForm";

type AuthSearch = {
  redirect?: string;
  mode?: "login" | "signup";
  ref?: string;
};

export const Route = createFileRoute("/sign-up")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    mode: search.mode === "signup" ? "signup" : search.mode === "login" ? "login" : undefined,
    ref: typeof search.ref === "string" ? search.ref : undefined,
  }),
  component: SignUpPage,
  head: () => ({
    meta: [
      { title: "Create your account — LUCKDROP" },
      { name: "description", content: "Create your LUCKDROP account and start winning iPhones, bikes, gold and cash from PKR 5." },
      { property: "og:title", content: "Create your account — LUCKDROP" },
      { property: "og:url", content: "https://luck5.lovable.app/sign-up" },
    ],
    links: [{ rel: "canonical", href: "https://luck5.lovable.app/sign-up" }],
  }),
});

function SignUpPage() {
  return <AuthForm defaultMode="signup" />;
}
