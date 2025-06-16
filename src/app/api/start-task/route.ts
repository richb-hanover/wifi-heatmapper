/**
 * start-task API - /api/start-task?action=...
 * - GET  of "action=status" returns the current status
 * - POST of "action=start" begins the measurement process
 * - POST of "action=stop" sets the cancel flag to halt the process
 */
import { NextRequest, NextResponse } from "next/server";
import { setCancelFlag } from "@/lib/server-globals";
import { startSurvey } from "@/lib/iperfRunner";

// handle a "status" request
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  if (action === "status") {
    return NextResponse.json({ message: "OK" });
  }
}

export async function POST(req: NextRequest) {
  // Get the `action` parameter - /api/start-task?action=start`
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  if (action === "start") {
    try {
      const { settings } = await req.json();
      const result = await startSurvey(settings);
      // console.log(`startSurvey results: ${JSON.stringify(result)}`);
      const safe = JSON.parse(JSON.stringify(result));
      return NextResponse.json(safe);
    } catch (err) {
      // console.error("Error in startSurvey:", err);
      return NextResponse.json({ error: "Task failed" }, { status: 500 });
    }
  } else if (action === "stop") {
    setCancelFlag(true); // in sseGlobal.ts
    return NextResponse.json({ message: "Task stopped" });
  }
  // console.log(`Unexpected action received: ${action}`);
  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
