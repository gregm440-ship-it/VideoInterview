import { db } from "@/db/client";
import type { Organization, User } from "@/db/schema";

export type CurrentContext = {
  org: Organization;
  user: User;
};

export async function getCurrentContext(): Promise<CurrentContext> {
  const slug = process.env.DEV_DEFAULT_ORG_SLUG ?? "outsorcy";
  const email = process.env.DEV_DEFAULT_USER_EMAIL ?? "recruiter@outsorcy.com";

  const org = await db.query.organizations.findFirst({
    where: (o, { eq }) => eq(o.slug, slug),
  });
  if (!org) throw new Error(`Dev org "${slug}" not found — run pnpm db:seed.`);

  const user = await db.query.users.findFirst({
    where: (u, { and, eq }) => and(eq(u.email, email), eq(u.orgId, org.id)),
  });
  if (!user) throw new Error(`Dev user "${email}" not found in org "${slug}" — run pnpm db:seed.`);

  return { org, user };
}
