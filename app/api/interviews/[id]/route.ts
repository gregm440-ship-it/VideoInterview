import { NextResponse } from "next/server";
import { getCurrentContext } from "@/lib/auth/devUser";
import { getInterviewForOrg } from "@/lib/api/interviewAccess";
import { handleApiError } from "@/lib/api/errors";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { org } = await getCurrentContext();
    const { id } = await ctx.params;
    const data = await getInterviewForOrg(id, org.id);
    return NextResponse.json(data);
  } catch (err) {
    return handleApiError(err);
  }
}
