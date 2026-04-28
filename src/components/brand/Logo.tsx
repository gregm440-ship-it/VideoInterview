import Link from "next/link";
import type { Route } from "next";

type LogoProps = {
  variant?: "dark" | "light";
  href?: Route | null;
  className?: string;
};

export function Logo({ variant = "dark", href = "/", className }: LogoProps) {
  const fg = variant === "dark" ? "text-navy" : "text-white";
  const dot = variant === "dark" ? "bg-accent" : "bg-accent";

  const content = (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight ${fg} ${className ?? ""}`}>
      <span className={`inline-block h-2.5 w-2.5 rounded-sm ${dot}`} aria-hidden />
      <span className="text-lg">Outsorcy</span>
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} aria-label="Outsorcy home" className="inline-flex">
      {content}
    </Link>
  );
}
