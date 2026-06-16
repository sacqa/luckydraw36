import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  prompt: z.string().min(3).max(2000),
  size: z.enum(["1024x1024", "1536x1024", "1024x1536"]).default("1024x1024"),
  model: z.enum(["openai/gpt-image-1-mini", "openai/gpt-image-2", "google/gemini-2.5-flash-image"]).default("openai/gpt-image-1-mini"),
});

export const generateAiImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }) => {
    // Admin gate
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admin only");

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Lovable AI not configured");

    const body =
      data.model.startsWith("google/")
        ? {
            model: data.model,
            messages: [{ role: "user", content: data.prompt }],
            modalities: ["image", "text"],
          }
        : {
            model: data.model,
            prompt: data.prompt,
            quality: "low",
            size: data.size,
            n: 1,
          };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("AI rate limit hit. Try again in a minute.");
      if (res.status === 402) throw new Error("AI credits exhausted on this workspace.");
      throw new Error(`AI gateway error ${res.status}: ${text.slice(0, 240)}`);
    }

    const json = (await res.json()) as { data?: Array<{ b64_json?: string }> };
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) throw new Error("No image returned");
    return { dataUrl: `data:image/png;base64,${b64}` };
  });

const SaveInput = z.object({
  dataUrl: z.string().startsWith("data:image/"),
  bucket: z.enum(["banners", "game-images"]),
  filename: z.string().min(1).max(120),
});

export const saveAiImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admin only");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const base64 = data.dataUrl.split(",")[1] ?? "";
    const buf = Buffer.from(base64, "base64");
    const safe = data.filename.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const path = `ai/${Date.now()}_${safe}.png`;
    const { error } = await supabaseAdmin.storage.from(data.bucket).upload(path, buf, {
      contentType: "image/png",
      upsert: false,
    });
    if (error) throw new Error(error.message);
    const { data: pub } = supabaseAdmin.storage.from(data.bucket).getPublicUrl(path);
    return { url: pub.publicUrl, path };
  });
