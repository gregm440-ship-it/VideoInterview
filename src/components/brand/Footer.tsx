import { Logo } from "./Logo";

type FooterProps = {
  variant?: "dark" | "light";
};

export function Footer({ variant = "light" }: FooterProps) {
  const isDark = variant === "dark";
  return (
    <footer
      className={
        isDark
          ? "border-t border-white/10 bg-navy py-8 text-sm text-white/70"
          : "border-t border-navy/10 bg-paper py-8 text-sm text-navy/70"
      }
    >
      <div className="container-prose flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Logo variant={isDark ? "light" : "dark"} href={null} />
          <span>Powered by Outsorcy</span>
        </div>
        <div className="flex items-center gap-6">
          <span>AI-augmented hiring delivery</span>
        </div>
      </div>
    </footer>
  );
}
