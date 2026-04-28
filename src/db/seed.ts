import "dotenv/config";
import { db, schema } from "./client";

async function main() {
  console.log("Seeding database…");

  const [org] = await db
    .insert(schema.organizations)
    .values({
      name: "Outsorcy",
      slug: "outsorcy",
      monthlyTokenBudget: 2_000_000,
    })
    .onConflictDoNothing({ target: schema.organizations.slug })
    .returning();

  const orgRow =
    org ??
    (await db.query.organizations.findFirst({
      where: (o, { eq }) => eq(o.slug, "outsorcy"),
    }));

  if (!orgRow) throw new Error("Failed to create or fetch seed organization");

  const [recruiter] = await db
    .insert(schema.users)
    .values({
      orgId: orgRow.id,
      email: "recruiter@outsorcy.com",
      name: "Outsorcy Recruiter",
      role: "recruiter",
    })
    .onConflictDoNothing({ target: schema.users.email })
    .returning();

  const recruiterRow =
    recruiter ??
    (await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, "recruiter@outsorcy.com"),
    }));

  console.log("Seed complete.");
  console.log({
    organization: { id: orgRow.id, slug: orgRow.slug },
    recruiter: { id: recruiterRow?.id, email: recruiterRow?.email },
  });

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
