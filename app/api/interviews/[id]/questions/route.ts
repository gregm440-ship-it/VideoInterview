import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db/client";
import { getCurrentContext } from "@/lib/auth/devUser";
import { assertEditable, getInterviewForOrg } from "@/lib/api/interviewAccess";
import { handleApiError, badRequest } from "@/lib/api/errors";

const addBody = z.object({
  text: z.string().min(10),
  category: z.enum(["behavioral", "technical", "situational", "motivation_fit", "custom"]),
  timeLimitSeconds: z.number().int().min(30).max(180).default(90),
  retryAllowed: z.number().int().min(0).max(3).default(1),
  rationale: z.string().optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { org } = await getCurrentContext();
    const { id } = await ctx.params;
    const { interview, questions } = await getInterviewForOrg(id, org.id);
    assertEditable(interview);

    const body = await req.json().catch(() => badRequest("Invalid JSON body."));
    const data = addBody.parse(body);

    const [row] = await db
      .insert(schema.interviewQuestions)
      .values({
        interviewId: interview.id,
        orderIndex: questions.length,
        text: data.text,
        category: data.category,
        timeLimitSeconds: data.timeLimitSeconds,
        retryAllowed: data.retryAllowed,
        rationale: data.rationale,
      })
      .returning();

    return NextResponse.json({ question: row }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

const reorderBody = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { org } = await getCurrentContext();
    const { id } = await ctx.params;
    const { interview, questions } = await getInterviewForOrg(id, org.id);
    assertEditable(interview);

    const body = await req.json().catch(() => badRequest("Invalid JSON body."));
    const { orderedIds } = reorderBody.parse(body);

    const known = new Set(questions.map((q) => q.id));
    if (orderedIds.length !== questions.length || orderedIds.some((qid) => !known.has(qid))) {
      badRequest("orderedIds must contain exactly the existing question ids.");
    }

    await db.transaction(async (tx) => {
      // Two-phase reorder to avoid colliding with the (interview_id, order_index) unique index.
      await tx
        .update(schema.interviewQuestions)
        .set({ orderIndex: sql`${schema.interviewQuestions.orderIndex} + 1000` })
        .where(eq(schema.interviewQuestions.interviewId, interview.id));

      for (let i = 0; i < orderedIds.length; i++) {
        await tx
          .update(schema.interviewQuestions)
          .set({ orderIndex: i })
          .where(eq(schema.interviewQuestions.id, orderedIds[i]));
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
