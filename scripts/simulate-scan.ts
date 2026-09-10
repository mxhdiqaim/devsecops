const WEBHOOK_URL = "http://localhost:3000/api/webhooks/scans";

const payload = {
  vulnerabilities: [
    {
      severity: "CRITICAL",
      tool: "OWASP ZAP",
      description:
        "SQL Injection on /users. The email query parameter is concatenated into a raw SQL string, allowing attackers to extract user credentials."
    },
    {
      severity: "HIGH",
      tool: "OWASP ZAP",
      description:
        "Cross-Site Scripting on /echo. Untrusted html query input is returned with Content-Type text/html without sanitization."
    },
    {
      severity: "HIGH",
      tool: "Semgrep",
      description:
        "Hardcoded AWS Secret Key in apps/target-api/src/index.ts. Static AWS_SECRET_ACCESS_KEY and AWS_ACCESS_KEY_ID values are committed in source."
    }
  ]
};

(async () => {
  const response = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  
  const body = await response.json().catch(() => ({}));
  
  console.log(`Status: ${response.status} ${response.statusText}`);
  console.log(`Scan ID: ${body.scanId ?? "n/a"}`);
  console.log(JSON.stringify(body, null, 2));
})()
