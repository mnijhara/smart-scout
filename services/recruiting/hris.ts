export interface HRISAdapter {
  provider: string;
  createEmployee(payload: Record<string, unknown>): Promise<{ externalId: string; status: string }>;
  validateEmployeePayload(payload: Record<string, unknown>): { valid: boolean; missing: string[] };
}

export function createGenericHRISAdapter(config: { provider: string; endpoint: string; token: string; requiredFields?: string[] }): HRISAdapter {
  const required = config.requiredFields || ['name', 'jobTitle', 'startDate'];
  return {
    provider: config.provider,
    validateEmployeePayload(payload) {
      const missing = required.filter(key => payload[key] === undefined || payload[key] === null || payload[key] === '');
      return { valid: missing.length === 0, missing };
    },
    async createEmployee(payload) {
      const validation = this.validateEmployeePayload(payload);
      if (!validation.valid) throw new Error(`Missing HRIS fields: ${validation.missing.join(', ')}`);
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.token}` },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || `HRIS request failed (${response.status})`);
      return { externalId: String(data?.id || data?.employeeId || data?.externalId || ''), status: String(data?.status || 'created') };
    },
  };
}
