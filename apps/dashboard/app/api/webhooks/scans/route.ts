import { NextResponse } from "next/server";
import { db, scans, vulnerabilities } from "@repo/db";
import { collectVulnerabilities, normalizeSeverity } from "@/app/utils";
import { BodyPayload } from "@/app/types";


export async function POST(req: Request) {
  try {
    const body = (await req.json()) as BodyPayload;
    const rawVulnerabilities = collectVulnerabilities(body);

    const normalized = rawVulnerabilities.map((vulnerability) => ({
      severity: normalizeSeverity(vulnerability.severity),
      tool: String(vulnerability.tool || "unknown"),
      description: String(vulnerability.description || JSON.stringify(vulnerability))
    }));

    const criticalCount = normalized.filter((vulnerability) => vulnerability.severity === "CRITICAL")
      .length;
    const highCount = normalized.filter((vulnerability) => vulnerability.severity === "HIGH").length;
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
        normalized.map((vulnerability) => ({
          scanId: scan.id,
          severity: vulnerability.severity,
          tool: vulnerability.tool,
          description: vulnerability.description
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
