// worker.ts — static assets + contact form handler
import { validateContactForm, type ContactFormData } from "./lib/contact/validation";
import { trailingSlashRedirect } from "./lib/routing/trailingSlash";

const RECIPIENT = "reliatools2025@gmail.com";

interface Env {
  ASSETS: Fetcher;
  RESEND_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/contact" && request.method === "POST") {
      return handleContact(request, env);
    }

    // The site is built with `trailingSlash: true`, so /tools is not canonical
    // — /tools/ is. The assets binding's own auto-trailing-slash handling
    // answers with a 307, which Google treats as temporary and so keeps
    // reporting both URL forms in Search Console. Send a 301 first.
    if (request.method === "GET" || request.method === "HEAD") {
      const slashed = trailingSlashRedirect(url);
      if (slashed) return Response.redirect(slashed, 301);
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleContact(request: Request, env: Env): Promise<Response> {
  let body: ContactFormData & { honeypot?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  if (body.honeypot) return json({ ok: true });

  const errors = validateContactForm(body);
  if (errors.length > 0) return json({ error: errors.join(" ") }, 400);

  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set.");
    return json({ error: "Email service is not configured." }, 500);
  }

  const { name, email, company, message } = body;

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
          .filter(Boolean)
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
