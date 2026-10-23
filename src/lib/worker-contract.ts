export const WORKER_CONTRACT_VERSION = 1;

export type WorkerHealthResponse = {
  status?: string;
  contractVersion?: number;
  commit?: string;
  service?: string;
  mode?: string;
  timestamp?: string;
};

export async function getWorkerHealth(workerUrl: string): Promise<{
  ok: boolean;
  outOfDate: boolean;
  contractVersion?: number;
  commit?: string;
  status?: string;
  raw?: WorkerHealthResponse | null;
  error?: string;
}> {
  if (!workerUrl) {
    return {
      ok: false,
      outOfDate: false,
      error: "Worker URL is not configured.",
    };
  }

  try {
    const url = `${workerUrl.replace(/\/+$/, "")}/health`;
    const healthRes = await fetch(url, {
      method: "GET",
      headers: { "Bypass-Tunnel-Reminder": "true" },
      signal: AbortSignal.timeout(2500),
    });

    const raw = (await healthRes.json().catch(() => null)) as WorkerHealthResponse | null;
    const contractVersion = typeof raw?.contractVersion === "number" ? raw.contractVersion : undefined;
    const outOfDate =
      Boolean(raw) &&
      typeof contractVersion === "number" &&
      contractVersion !== WORKER_CONTRACT_VERSION;

    return {
      ok: healthRes.ok && Boolean(raw),
      outOfDate,
      contractVersion,
      commit: typeof raw?.commit === "string" ? raw.commit : undefined,
      status: typeof raw?.status === "string" ? raw.status : undefined,
      raw,
      error: healthRes.ok ? undefined : `Worker health check failed: HTTP ${healthRes.status}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Worker health check failed";
    return {
      ok: false,
      outOfDate: false,
      error: message,
    };
  }
}
