import type { ReactNode } from "react";
import { Logo } from "./Logo";
import { Footer } from "./Footer";

type ShellProps = {
  children: ReactNode;
  variant?: "candidate" | "app" | "report";
  rightSlot?: ReactNode;
};

export function Shell({ children, variant = "app", rightSlot }: ShellProps) {
  const headerTone =
    variant === "candidate"
      ? "bg-navy text-white border-b border-white/10"
      : "bg-white text-navy border-b border-navy/10";
  const logoVariant = variant === "candidate" ? "light" : "dark";
  const footerVariant = variant === "candidate" ? "dark" : "light";

  return (
    <div className="flex min-h-screen flex-col">
      <header className={headerTone}>
        <div className="container-prose flex h-14 items-center justify-between">
          <Logo variant={logoVariant} />
          <div className="flex items-center gap-4 text-sm">{rightSlot}</div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <Footer variant={footerVariant} />
    </div>
  );
}
