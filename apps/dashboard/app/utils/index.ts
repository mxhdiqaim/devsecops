import { BodyPayload, VulnerabilityInput } from "../types";

export const severityClass = (severity: string): string => {
    switch (severity) {
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

export const statusClass = (status: string): string => {
    if (status === "PASSED") {
        return "inline-flex items-center rounded-md bg-emerald-900/40 px-2 py-1 text-xs font-medium text-emerald-300 ring-1 ring-inset ring-emerald-700";
    }

    return "inline-flex items-center rounded-md bg-red-900/40 px-2 py-1 text-xs font-medium text-red-300 ring-1 ring-inset ring-red-700";
}
  
export const formatDate = (date: Date | string): string => {
    if (!date) return "—";
    
    try {
        const d = date instanceof Date ? date : new Date(date);
        if (Number.isNaN(d.getTime())) return String(date);

        return d.toLocaleString();
    } catch {
        return String(date);
    }
}

export const normalizeSeverity = (rawSeverity: string): string => {
    const severity = (rawSeverity || "").toUpperCase().trim();
    if (severity === "CRITICAL" || severity === "ERROR" || severity === "FATAL" || severity === "BLOCKER")
        return "CRITICAL";
    if (severity === "HIGH" || severity === "MAJOR") return "HIGH";
    if (severity === "MEDIUM" || severity === "MODERATE") return "MEDIUM";
    if (severity === "LOW" || severity === "MINOR") return "LOW";
    if (severity === "INFO" || severity === "INFORMATIONAL" || severity === "NOTE" || severity === "TRACE")
        return "INFO";
    return severity || "INFO";
}

export const collectVulnerabilities = (body: BodyPayload): VulnerabilityInput[] => {
    if (Array.isArray(body)) return body;

    return [
        ...(Array.isArray(body.vulnerabilities) ? body.vulnerabilities : []),
        ...(Array.isArray(body.findings) ? body.findings : []),
        ...(Array.isArray(body.results) ? body.results : [])
    ];
}