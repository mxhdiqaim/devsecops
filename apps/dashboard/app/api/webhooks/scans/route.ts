import { NextResponse } from "next/server";
import { db, scans, vulnerabilities } from "@repo/db";
import { collectVulns, normalizeSeverity } from "@/app/utils";
import { BodyPayload } from "@/app/types";


export async function POST(req: Request) {
  try {
    const body = (await req.json()) as BodyPayload;
    const rawVulns = collectVulns(body);

    const normalized = rawVulns.map((v) => ({
      severity: normalizeSeverity(v.severity),
      tool: String(v.tool || "unknown"),
      description: String(v.description || JSON.stringify(v))
    }));

    const criticalCount = normalized.filter((v) => v.severity === "CRITICAL")
      .length;
    const highCount = normalized.filter((v) => v.severity === "HIGH").length;
    const hasBlocker = criticalCount > 0 || highCount > 0;
    const scanStatus = hasBlocker ? "BLOCKED" : "PASSED";

    const [scan] = await db
      .insert(scans)
      .values({
        status: scanStatus as any,
        criticalCount,
        highCount,
        timestamp: new Date()
      })
      .returning();

    if (normalized.length > 0) {
      await db.insert(vulnerabilities).values(
        normalized.map((v) => ({
          scanId: scan.id,
          severity: v.severity,
          tool: v.tool,
          description: v.description
        }))
      );
    }

    if (hasBlocker) {
      return NextResponse.json(
        {
          status: "BLOCKED",
          scanId: scan.id,
          criticalCount,
          highCount,
          total: normalized.length,
          message: "Pipeline blocked due to CRITICAL or HIGH severity findings"
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        status: "PASSED",
        scanId: scan.id,
        criticalCount,
        highCount,
        total: normalized.length
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Invalid Body or DB error",
        details: err?.message || String(err)
      },
      { status: 400 }
    );
  }
}
