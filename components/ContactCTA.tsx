"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics";

const TOOL_COPY = [
  "Need help applying this to a real validation program? Contact Reliatools.",
  "Working through this for an actual product decision? We can help review it. Contact Reliatools.",
  "Have a more complex case than this calculator covers? Get in touch.",
];

const ARTICLE_COPY = [
  "Want help applying this to your validation plan? Contact Reliatools.",
  "Questions about how this applies to your program? Reach out.",
];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export default function ContactCTA({
  variant,
}: {
  variant: "tool" | "article";
}) {
  const pathname = usePathname() || "";
  const copyList = variant === "tool" ? TOOL_COPY : ARTICLE_COPY;
  const copyIndex = hashString(pathname) % copyList.length;
  const copy = copyList[copyIndex];

  return (
    <div className="mt-8 border-t border-gray-200 pt-4 text-sm text-gray-500">
      <Link
        href="/contact"
        className="hover:text-gray-700 hover:underline"
        onClick={() =>
          // Fire-and-forget: never preventDefault, never delay navigation.
          trackEvent("cta_click", {
            cta_variant: `${variant}-${copyIndex}`,
            source_page: pathname,
          })
        }
      >
        {copy}
      </Link>
    </div>
  );
}
