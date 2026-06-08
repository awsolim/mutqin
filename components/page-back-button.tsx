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
        "sticky top-0 z-20 -mx-2 bg-mist/90 px-2 py-1 backdrop-blur",
        className,
      )}
    >
      <Link
        className="inline-flex min-h-8 items-center gap-1.5 rounded-2xl px-1 pr-2 text-sm font-extrabold text-palm transition hover:bg-palm/10 focus:outline-none focus:ring-2 focus:ring-palm/25"
        href={href}
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-paper text-palm shadow-soft ring-1 ring-line/80">
          <ArrowLeft aria-hidden className="size-3.5" />
        </span>
        {label}
      </Link>
    </nav>
  );
}
