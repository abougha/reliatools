"use client";

import Image from "next/image";

const nodes = [
  "left-[16%] top-[27%]",
  "right-[18%] top-[22%]",
  "left-[20%] bottom-[24%]",
  "right-[22%] bottom-[28%]",
];

export default function AnimatedReliabilityLogo() {
  return (
    <div
      className="relative mx-auto flex aspect-square w-full max-w-[340px] items-center justify-center rounded-2xl border border-blue-100 bg-white p-7 shadow-xl shadow-blue-100/60"
      aria-label="Reliatools diagnostic logo visual"
    >
      <div className="absolute inset-6 rounded-full border border-blue-100 bg-blue-50/40" />
      <div className="diagnostic-ring absolute inset-10 rounded-full border border-dashed border-blue-300/80 motion-reduce:animate-none" />
      <div className="diagnostic-ring-slow absolute inset-16 rounded-full border border-blue-200/80 motion-reduce:animate-none" />
      <div className="scan-sweep absolute left-10 right-10 top-1/2 h-px bg-gradient-to-r from-transparent via-blue-400/70 to-transparent motion-reduce:hidden" />

      <div className="absolute inset-0">
        {nodes.map((position) => (
          <span
            key={position}
            className={`circuit-node absolute h-3 w-3 rounded-full border border-blue-200 bg-blue-500 shadow-[0_0_18px_rgba(37,99,235,0.45)] ${position} motion-reduce:animate-none`}
          />
        ))}
      </div>

      <div className="signal-orbit relative flex h-36 w-36 items-center justify-center rounded-full bg-white shadow-[0_0_45px_rgba(37,99,235,0.20)] sm:h-40 sm:w-40 motion-reduce:before:animate-none">
        <Image
          src="/logo.png"
          alt="Reliatools logo"
          width={220}
          height={220}
          priority
          className="h-auto w-28 sm:w-32"
        />
      </div>

      <style jsx>{`
        .diagnostic-ring {
          animation: reliability-spin 28s linear infinite;
        }

        .diagnostic-ring-slow {
          animation: reliability-spin 42s linear infinite reverse;
        }

        .scan-sweep {
          animation: reliability-scan 4.8s ease-in-out infinite;
        }

        .circuit-node {
          animation: reliability-pulse 2.8s ease-in-out infinite;
        }

        .circuit-node:nth-child(2) {
          animation-delay: 0.5s;
        }

        .circuit-node:nth-child(3) {
          animation-delay: 1s;
        }

        .circuit-node:nth-child(4) {
          animation-delay: 1.5s;
        }

        .signal-orbit::before {
          content: "";
          position: absolute;
          inset: -7px;
          border-radius: 9999px;
          border: 2px solid rgba(37, 99, 235, 0.42);
          box-shadow:
            0 0 18px rgba(37, 99, 235, 0.16),
            inset 0 0 14px rgba(37, 99, 235, 0.08);
          animation: signal-breathe 3.8s ease-in-out infinite;
        }

        .signal-orbit::after {
          content: "";
          position: absolute;
          inset: -13px;
          border-radius: 9999px;
          border: 1px solid rgba(37, 99, 235, 0.16);
        }

        @keyframes reliability-spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes reliability-scan {
          0%,
          100% {
            transform: translateY(-88px);
            opacity: 0;
          }

          20%,
          80% {
            opacity: 1;
          }

          50% {
            transform: translateY(88px);
            opacity: 0.75;
          }
        }

        @keyframes reliability-pulse {
          0%,
          100% {
            opacity: 0.55;
            transform: scale(0.92);
          }

          50% {
            opacity: 1;
            transform: scale(1.18);
          }
        }

        @keyframes signal-breathe {
          0%,
          100% {
            opacity: 0.72;
            transform: scale(0.99);
          }

          50% {
            opacity: 1;
            transform: scale(1.015);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .diagnostic-ring,
          .diagnostic-ring-slow,
          .scan-sweep,
          .circuit-node,
          .signal-orbit::before {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
