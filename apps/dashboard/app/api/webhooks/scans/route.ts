import { NextResponse } from "next/server";
import { db, scans, vulnerabilities } from "@repo/db";

type VulnInput = {
  severity: string;
  tool: string;
  description: string;
  [k: string]: any;
};

type Payload = {
  vulnerabilities?: VulnInput[];
  findings?: VulnInput[];
  results?: VulnInput[];
};

function normalizeSeverity(raw: string): string {
  const s = (raw || "").toUpperCase().trim();
  if (s === "CRITICAL" || s === "ERROR" || s === "FATAL" || s === "BLOCKER")
    return "CRITICAL";
  if (s === "HIGH" || s === "MAJOR") return "HIGH";
  if (s === "MEDIUM" || s === "MODERATE") return "MEDIUM";
  if (s === "LOW" || s === "MINOR") return "LOW";
  if (s === "INFO" || s === "INFORMATIONAL" || s === "NOTE" || s === "TRACE")
    return "INFO";
  return s || "INFO";
}

function collectVulns(body: Payload): VulnInput[] {
  if (Array.isArray(body)) return body;
  return [
    ...(Array.isArray(body.vulnerabilities) ? body.vulnerabilities : []),
    ...(Array.isArray(body.findings) ? body.findings : []),
    ...(Array.isArray(body.results) ? body.results : [])
  ];
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Payload;
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
        error: "Invalid payload or DB error",
        details: err?.message || String(err)
      },
      { status: 400 }
    );
  }
}
