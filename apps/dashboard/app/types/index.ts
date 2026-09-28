export type VulnerabilityInput = {
    [k: string]: any;
    severity: string;
    tool: string;
    description: string;
  };

export type BodyPayload = {
    vulnerabilities?: VulnerabilityInput[];
    findings?: VulnerabilityInput[];
    results?: VulnerabilityInput[];
};