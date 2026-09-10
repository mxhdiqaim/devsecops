import { db, scans, vulnerabilities, desc, eq, count } from "@repo/db";

function severityClass(sev: string): string {
  switch (sev) {
    case "CRITICAL":
      return "bg-red-900/40 text-red-300 border-red-700";
    case "HIGH":
      return "bg-orange-900/40 text-orange-300 border-orange-700";
    case "MEDIUM":
      return "bg-yellow-900/40 text-yellow-300 border-yellow-700";
    case "LOW":
      return "bg-blue-900/40 text-blue-300 border-blue-700";
    default:
      return "bg-slate-800 text-slate-300 border-slate-700";
  }
}

function statusClass(status: string): string {
  if (status === "PASSED")
    return "inline-flex items-center rounded-md bg-emerald-900/40 px-2 py-1 text-xs font-medium text-emerald-300 ring-1 ring-inset ring-emerald-700";
  return "inline-flex items-center rounded-md bg-red-900/40 px-2 py-1 text-xs font-medium text-red-300 ring-1 ring-inset ring-red-700";
}

function fmtDate(v: any): string {
  if (!v) return "—";
  try {
    const d = v instanceof Date ? v : new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString();
  } catch {
    return String(v);
  }
}

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let latestScan: any = null;
  let totalCritical = 0;
  let vulnRows: any[] = [];

  try {
    const latestScans = await db
      .select()
      .from(scans)
      .orderBy(desc(scans.timestamp))
      .limit(1);
    latestScan = latestScans[0] || null;

    const critRes = await db
      .select({ value: count() })
      .from(vulnerabilities)
      .where(eq(vulnerabilities.severity, "CRITICAL"));
    totalCritical = Number(critRes?.[0]?.value ?? 0);

    vulnRows = await db
      .select({
        id: vulnerabilities.id,
        scanTimestamp: scans.timestamp,
        severity: vulnerabilities.severity,
        tool: vulnerabilities.tool,
        description: vulnerabilities.description
      })
      .from(vulnerabilities)
      .leftJoin(scans, eq(vulnerabilities.scanId, scans.id))
      .orderBy(desc(vulnerabilities.id))
      .limit(100);
  } catch (err) {
    console.warn("DB not ready:", err);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Security Dashboard
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            DevSecOps Pipeline — scan results &amp; vulnerability overview
          </p>
        </header>

        <section className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">
                Latest Scan Status
              </h2>
              <span className={statusClass(latestScan?.status ?? "PASSED")}>
                {latestScan?.status ?? "NO DATA"}
              </span>
            </div>
            <p className="mt-4 text-4xl font-semibold text-white">
              {latestScan ? latestScan.status : "—"}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-slate-400">Timestamp</dt>
                <dd className="mt-1 font-mono text-slate-200">
                  {fmtDate(latestScan?.timestamp)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Critical / High</dt>
                <dd className="mt-1 font-mono text-slate-200">
                  {latestScan?.criticalCount ?? 0} / {latestScan?.highCount ?? 0}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">
                Total Critical Flaws
              </h2>
              <span
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ring-1 ring-inset ${totalCritical > 0
                    ? "bg-red-900/60 text-red-200 ring-red-700"
                    : "bg-emerald-900/60 text-emerald-200 ring-emerald-700"
                  }`}
              >
                !
              </span>
            </div>
            <p
              className={`mt-4 text-4xl font-semibold ${totalCritical > 0 ? "text-red-400" : "text-emerald-400"
                }`}
            >
              {totalCritical}
            </p>
            <p className="mt-4 text-sm text-slate-400">
              {totalCritical > 0
                ? "Action required: address critical findings before merge."
                : "No critical findings detected so far."}
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Recent Vulnerabilities
            </h2>
            <span className="text-xs text-slate-400">
              Showing {vulnRows.length} most recent
            </span>
          </div>

          {vulnRows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/50 px-6 py-12 text-center text-sm text-slate-400">
              No scans yet. Trigger a pipeline run to populate results.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-full divide-y divide-slate-800 text-left text-sm">
                <thead className="bg-slate-900/70 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">
                      ID
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Scan Time
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Severity
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Tool
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {vulnRows.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-900/80">
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">
                        #{v.id}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-300">
                        {fmtDate(v.scanTimestamp)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${severityClass(
                            v.severity
                          )}`}
                        >
                          {v.severity || "INFO"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {v.tool || "—"}
                      </td>
                      <td className="max-w-lg px-4 py-3 text-slate-300">
                        <p className="truncate" title={v.description}>
                          {v.description || "—"}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
