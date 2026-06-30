"use client";

import { useState } from "react";
import { validateContactForm, type ContactFormData } from "@/lib/contact/validation";

type FormState = "idle" | "submitting" | "success";

export default function ContactPage() {
  const [form, setForm] = useState<ContactFormData & { honeypot: string }>({
    name: "",
    email: "",
    company: "",
    message: "",
    honeypot: "",
  });
  const [state, setState] = useState<FormState>("idle");
  const [error, setError] = useState<string | null>(null);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const clientErrors = validateContactForm(form);
    if (clientErrors.length > 0) {
      setError(clientErrors[0]);
      return;
    }

    setState("submitting");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setState("idle");
        return;
      }

      setState("success");
      setForm({ name: "", email: "", company: "", message: "", honeypot: "" });
    } catch {
      setError("Something went wrong. Please try again.");
      setState("idle");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-gray-100 text-gray-900 dark:from-black dark:via-gray-900 dark:to-gray-800 dark:text-white px-6 py-16">
      {/* Hero */}
      <section className="text-center max-w-3xl mx-auto">
        <h1 className="text-4xl font-extrabold sm:text-5xl mb-4">
          Contact <span className="text-blue-600">Reliatools</span>
        </h1>
        <p className="text-lg text-gray-700 dark:text-gray-300">
          Have a question, a feature request, or a project you&apos;d like to
          discuss? The Reliatools team would love to hear from you.
        </p>
      </section>

      {/* Form */}
      <section className="mt-12 max-w-xl mx-auto">
        {state === "success" ? (
          <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 p-6 text-center">
            <p className="text-green-800 dark:text-green-300 font-medium text-lg">
              Thanks — the Reliatools team will get back to you shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Honeypot — hidden from real users */}
            <div className="sr-only" aria-hidden="true">
              <label htmlFor="contact-honeypot">Leave this empty</label>
              <input
                id="contact-honeypot"
                name="honeypot"
                type="text"
                value={form.honeypot}
                onChange={handleChange}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <div>
              <label
                htmlFor="contact-name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id="contact-name"
                name="name"
                type="text"
                required
                value={form.name}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Your name"
              />
            </div>

            <div>
              <label
                htmlFor="contact-email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="contact-email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="contact-company"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Company{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="contact-company"
                name="company"
                type="text"
                value={form.company}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Your company"
              />
            </div>

            <div>
              <label
                htmlFor="contact-message"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                id="contact-message"
                name="message"
                required
                rows={6}
                value={form.message}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                placeholder="How can we help?"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={state === "submitting"}
              className="inline-block w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-md shadow hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {state === "submitting" ? "Sending…" : "Send Message"}
            </button>

            <p className="text-xs text-center text-gray-400 dark:text-gray-500">
              — The Reliatools Team
            </p>
          </form>
        )}
      </section>
    </div>
  );
}
