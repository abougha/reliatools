import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { softwareAppJsonLd } from "@/lib/seo/jsonld";

// Head term ("Reliability Sample Size Calculator") is held steady on purpose; only
// the "(Binomial)" qualifier is dropped now that the tool covers five test types.
// The new long-tail lives in the description rather than the title.
const title = "Reliability Sample Size Calculator | Reliatools";
const description =
  "Free reliability sample size calculator covering five test types: success run and binomial demonstration, extended bogey, MTBF demonstration, tolerance intervals, comparative tests, HALT unit budgets and HASS screen sizing. No signup required.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    url: "https://www.reliatools.com/tools/Samplesize",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/tools/Samplesize" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        data={softwareAppJsonLd({
          name: "Reliability Sample Size Calculator",
          description:
            "Size a reliability test by what it must prove: demonstration sample size, extended bogey, MTBF test time, tolerance intervals, HALT unit budgets and HASS screen sampling.",
          path: "/tools/Samplesize",
        })}
      />
      {children}
    </>
  );
}
