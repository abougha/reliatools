// worker.ts — static assets + contact form handler
import { validateContactForm, type ContactFormData } from "./lib/contact/validation";
import { trailingSlashRedirect } from "./lib/routing/trailingSlash";

const RECIPIENT = "reliatools2025@gmail.com";

// A valid submission is well under 6 KB (5,000-char message + short fields).
const MAX_CONTACT_BODY_BYTES = 16 * 1024;

interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

interface Env {
  ASSETS: Fetcher;
  RESEND_API_KEY: string;
  CONTACT_RATE_LIMITER?: RateLimiter;
}

const SECURITY_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=31536000",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return withSecurityHeaders(await route(request, env));
  },
};

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === "/api/contact" && request.method === "POST") {
    return handleContact(request, env, url);
  }

  // The site is built with `trailingSlash: true`, so /tools is not canonical
  // — /tools/ is. The assets binding's own auto-trailing-slash handling
  // answers with a 307, which Google treats as temporary and so keeps
  // reporting both URL forms in Search Console. Send a 301 first.
  if (request.method === "GET" || request.method === "HEAD") {
    const slashed = trailingSlashRedirect(url);
    if (slashed) {
      return new Response(null, { status: 301, headers: { Location: slashed } });
    }
  }

  return env.ASSETS.fetch(request);
}

function withSecurityHeaders(response: Response): Response {
  // Responses from the assets binding have immutable headers; copy first.
  const out = new Response(response.body, response);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    out.headers.set(name, value);
  }
  return out;
}

async function handleContact(request: Request, env: Env, url: URL): Promise<Response> {
  // Browsers always send Origin on a cross-origin POST; reject other sites
  // submitting the form on a visitor's behalf.
  const origin = request.headers.get("Origin");
  if (origin && origin !== url.origin) {
    return json({ error: "Forbidden." }, 403);
  }

  if (env.CONTACT_RATE_LIMITER) {
    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    const { success } = await env.CONTACT_RATE_LIMITER.limit({ key: ip });
    if (!success) {
      return json({ error: "Too many messages. Please try again in a minute." }, 429);
    }
  }

  const declaredLength = Number(request.headers.get("Content-Length") ?? "0");
  if (declaredLength > MAX_CONTACT_BODY_BYTES) {
    return json({ error: "Request body too large." }, 413);
  }

  let body: ContactFormData & { honeypot?: unknown };
  try {
    const raw = await request.text();
    if (raw.length > MAX_CONTACT_BODY_BYTES) {
      return json({ error: "Request body too large." }, 413);
    }
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const errors = validateContactForm(body);
  if (errors.length > 0) return json({ error: errors.join(" ") }, 400);

  if (body.honeypot) return json({ ok: true });

  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set.");
    return json({ error: "Email service is not configured." }, 500);
  }

  const { email, company, message } = body;
  // The name goes into the subject line; keep it to a single line.
  const name = body.name.replace(/[\r\n]+/g, " ").trim();

  try {
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Reliatools <contact@reliatools.com>",
        to: [RECIPIENT],
        reply_to: email,
        subject: `New contact form submission from ${name}`,
        text: [
          `Name: ${name}`,
          `Email: ${email}`,
          company ? `Company: ${company}` : null,
          "",
          message,
        ]
          .filter((line) => line !== null)
          .join("\n"),
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error("Resend API error:", resendRes.status, errText);
      return json({ error: "Failed to send message. Please try again." }, 502);
    }

    return json({ ok: true });
  } catch (err) {
    console.error("Contact form send failed:", err);
    return json({ error: "Failed to send message. Please try again." }, 500);
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
