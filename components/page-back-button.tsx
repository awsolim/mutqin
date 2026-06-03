import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type PageBackButtonProps = {
  className?: string;
  href: string;
  label: string;
};

export function PageBackButton({ className, href, label }: PageBackButtonProps) {
  return (
    <nav
      aria-label="Back navigation"
      className={cn(
        "sticky top-0 z-20 -mx-4 border-b border-line/70 bg-mist/90 px-4 py-2 backdrop-blur",
        className,
      )}
    >
      <Link
        className="inline-flex min-h-10 items-center gap-2 rounded-2xl px-1.5 pr-3 text-sm font-extrabold text-palm transition hover:bg-palm/10 focus:outline-none focus:ring-2 focus:ring-palm/25"
        href={href}
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-paper text-palm shadow-soft ring-1 ring-line/80">
          <ArrowLeft aria-hidden className="size-4" />
        </span>
        {label}
      </Link>
    </nav>
  );
}
