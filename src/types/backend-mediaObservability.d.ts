declare module '*mediaObservability.js' {
  export function normalizeClientMediaTelemetryPayload(
    body: unknown,
  ): Array<Record<string, unknown>>;

  export function summarizeMediaHealth(params: {
    generatedAt: string;
    windowHours: number;
    assetSummary: Record<string, number>;
    events: Array<Record<string, unknown>>;
  }): {
    generatedAt: string;
    windowHours: number;
    assetSummary: Record<string, number>;
    pipelineCoverage: {
      pipelineEvents: number;
      clientEvents: number;
      structuredLoggingEnabled: boolean;
    };
    stageMetrics: Array<{
      stage: string;
      totalEvents: number;
      failureEvents: number;
      latestEventAt: string | null;
    }>;
    surfaceMetrics: Array<{
      surface: string;
      totalEvents: number;
      failureEvents: number;
    }>;
    failureMetrics: {
      uploadFailures: number;
      previewFailures: number;
      conversionFailures: number;
      renderFailures: number;
      gifFailures: number;
    };
    recentFailures: Array<Record<string, unknown>>;
  };
}
