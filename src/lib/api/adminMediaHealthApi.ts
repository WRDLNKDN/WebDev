import { API_BASE, parseJson, throwApiError } from './contentApiCore';

export type AdminMediaHealthStageMetric = {
  stage: string;
  totalEvents: number;
  failureEvents: number;
  latestEventAt: string | null;
};

export type AdminMediaHealthSurfaceMetric = {
  surface: string;
  totalEvents: number;
  failureEvents: number;
};

export type AdminMediaHealthFailureMetric = {
  uploadFailures: number;
  previewFailures: number;
  conversionFailures: number;
  renderFailures: number;
  gifFailures: number;
};

export type AdminMediaHealthFailureRow = {
  source: string;
  createdAt: string | null;
  eventName: string;
  stage: string;
  surface: string;
  assetId: string | null;
  requestId: string | null;
  failureCode: string | null;
  failureReason: string | null;
};

export type AdminMediaHealthSnapshot = {
  generatedAt: string;
  windowHours: number;
  assetSummary: {
    totalActive: number;
    pending: number;
    uploading: number;
    processing: number;
    staleProcessing: number;
    ready: number;
    failed: number;
  };
  pipelineCoverage: {
    pipelineEvents: number;
    clientEvents: number;
    structuredLoggingEnabled: boolean;
  };
  stageMetrics: AdminMediaHealthStageMetric[];
  surfaceMetrics: AdminMediaHealthSurfaceMetric[];
  failureMetrics: AdminMediaHealthFailureMetric;
  recentFailures: AdminMediaHealthFailureRow[];
};

export async function fetchAdminMediaHealth(
  token: string,
  windowHours = 72,
): Promise<AdminMediaHealthSnapshot> {
  const params = new URLSearchParams();
  params.set('windowHours', String(windowHours));
  const qs = `?${params.toString()}`;
  const res = await fetch(`${API_BASE}/api/admin/media-health${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: API_BASE ? 'omit' : 'include',
  });
  const data = await parseJson<{
    ok: boolean;
    data?: AdminMediaHealthSnapshot;
    error?: string;
    message?: string;
  }>(res, '/api/admin/media-health');
  if (!res.ok) throwApiError(res.status, data);
  if (!data.data) {
    throw new Error('Admin media health response was empty.');
  }
  return data.data;
}
