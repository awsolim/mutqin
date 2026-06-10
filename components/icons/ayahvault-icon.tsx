import type { SVGProps } from "react";

export function AyahVaultIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M6.5 4.5h10a2.5 2.5 0 0 1 2.5 2.5v11.5H7a3 3 0 0 0-3 3V7a2.5 2.5 0 0 1 2.5-2.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M7 4.5v14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        d="M7 18.5h12v3H7a3 3 0 0 1 0-6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M19 8h1.5M19 12h1.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        d="M9.25 10.25h.01M14.75 10.25h.01"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.75"
      />
      <path
        d="M9.5 13.5c1.5 1.5 3.5 1.5 5 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}
