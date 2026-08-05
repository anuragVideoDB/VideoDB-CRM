import { NextResponse } from "next/server";
import { tick } from "@/lib/automation";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * The scheduled worker endpoint.
 *
 * Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`. It can
 * also be triggered manually with `?key=<INGEST_SECRET>` from the app's
 * automation settings page.
 */
function authorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;

  // Vercel Cron sets this header on its own requests.
  if (request.headers.get("x-vercel-cron")) return true;

  const key = new URL(request.url).searchParams.get("key");
  if (key && process.env.INGEST_SECRET && key === process.env.INGEST_SECRET) {
    return true;
  }
  return false;
}

async function run(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const force = new URL(request.url).searchParams.get("force") === "1";

  try {
    const result = await tick({ force });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "tick failed" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
