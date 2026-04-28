import type { ReactNode } from "react";
import { Shell } from "@/components/brand/Shell";

export default function CandidateLayout({ children }: { children: ReactNode }) {
  return <Shell variant="candidate">{children}</Shell>;
}
