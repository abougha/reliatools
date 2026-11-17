// app/privacy/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ogTitle, PAGE_NAMES } from "@/lib/seo/titles";

export const metadata: Metadata = {
  title: PAGE_NAMES["/privacy/"],
  description:
    "How Reliatools handles data: calculator inputs stay in your browser, and Google Analytics and Google AdSense use cookies only with your consent where required.",
  openGraph: {
    title: ogTitle("/privacy/"),
    description:
      "What data Reliatools collects, which third parties are involved, and the choices you have.",
    url: "https://www.reliatools.com/privacy/",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/privacy/" },
};

const LINK = "font-medium text-blue-700 underline underline-offset-2 hover:text-blue-800";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-slate-900">
      <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: November 16, 2026</p>

      <div className="mt-8 space-y-10 text-base leading-7 text-slate-600">
        <section>
          <h2 className="text-xl font-semibold text-slate-900">Summary</h2>
          <p className="mt-3">
            Reliatools is a free set of reliability engineering calculators. There are no
            accounts and nothing to sign up for. The numbers you enter into a calculator are
            processed in your browser and are not sent to us. We use Google Analytics to
            understand how the site is used and Google AdSense to show ads, and both can set
            cookies.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">Calculator data</h2>
          <p className="mt-3">
            All calculations run in your browser. Some tools save your work in your
            browser&rsquo;s local storage so it is still there when you come back, for
            example NUDD assessments, test plan drafts, and mission profile duty cycles. That
            data stays on your device. Clearing your browser&rsquo;s site data removes it.
            Files you export (PDF, Excel, CSV) are generated on your device.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">Contact form</h2>
          <p className="mt-3">
            If you use the <Link href="/contact" className={LINK}>contact form</Link>, the
            name, email address, optional company name, and message you enter are sent to us
            by email through Resend, our email delivery provider. We use them only to reply
            to you. Your IP address is used briefly to limit how many messages can be sent
            per minute, and the form runs Cloudflare Turnstile, a privacy-focused check
            that confirms a person rather than a bot is submitting it.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">Analytics</h2>
          <p className="mt-3">
            We use Google Analytics 4 to count visits and see which tools and articles are
            used. It records pages viewed, approximate location, device and browser type, and
            events such as running a calculator or exporting a result. We do not send
            calculator inputs, names, email addresses, or message contents to Google
            Analytics.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">Advertising</h2>
          <p className="mt-3">
            Ads on this site are served by Google AdSense. Google and its partners may use
            cookies to show ads based on your visits to this and other websites. You can turn
            off personalized advertising in{" "}
            <a href="https://adssettings.google.com" className={LINK} rel="noopener noreferrer">
              Google Ads Settings
            </a>
            , and you can read{" "}
            <a
              href="https://policies.google.com/technologies/partner-sites"
              className={LINK}
              rel="noopener noreferrer"
            >
              how Google uses data from sites that use its services
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">Cookies and your choices</h2>
          <p className="mt-3">
            On your first visit a banner asks whether you accept analytics and advertising
            cookies. If you are in the European Economic Area, the United Kingdom, or
            Switzerland, these cookies stay off until you accept. Your choice is stored in
            your browser, and you can change it at any time with the &ldquo;Cookie
            settings&rdquo; link in the footer. Declining does not limit any calculator.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">Hosting</h2>
          <p className="mt-3">
            The site is hosted on Cloudflare, which processes technical request data such as
            IP addresses to deliver pages and protect the site from abuse.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">Changes and contact</h2>
          <p className="mt-3">
            If this policy changes, the date at the top of this page will change with it.
            Questions about privacy can be sent through the{" "}
            <Link href="/contact" className={LINK}>contact form</Link>.
          </p>
        </section>
      </div>
    </main>
  );
}
