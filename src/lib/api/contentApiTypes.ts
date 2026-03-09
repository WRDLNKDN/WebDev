export type SubmitContentBody = {
  title: string;
  description?: string;
  type: 'youtube' | 'upload';
  youtubeUrl?: string;
  storagePath?: string;
  tags?: string[];
  notesForModerators?: string;
};

export type PublicPlaylist = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  itemCount: number;
  updatedAt: string;
};

export type PlaylistItem = {
  id: string;
  title: string;
  submittedBy: { handle: string | null; displayName: string | null };
  type: 'youtube' | 'upload';
  youtubeUrl: string | null;
  storagePath: string | null;
  publishedAt: string;
};

export type ContentSubmissionRow = {
  id: string;
  title: string;
  submittedBy: {
    id: string;
    handle: string | null;
    displayName: string | null;
  };
  type: string;
  status: string;
  submittedAt: string;
};

export type AdminPlaylist = {
  id: string;
  slug: string;
  title: string;
  isPublic: boolean;
};

export type AdminAuthCallbackLog = {
  id: string;
  action: 'AUTH_CALLBACK_ERROR' | 'AUTH_CALLBACK_TIMEOUT_ALERT';
  actorEmail: string | null;
  createdAt: string;
  meta: Record<string, unknown>;
};

export type AdminResumeThumbnailSummary = {
  pending: number;
  complete: number;
  failed: number;
  totalWithResume: number;
  recentFailures: Array<{
    profileId: string;
    handle: string | null;
    error: string | null;
    updatedAt: string | null;
  }>;
  backfillLock: {
    runId: string;
    acquiredAt: string;
    adminEmail: string | null;
  } | null;
  latestBackfillRuns: Array<{
    id: string;
    action: string;
    runId: string | null;
    attempted: number | null;
    completed: number | null;
    failed: number | null;
    durationMs: number | null;
    createdAt: string;
  }>;
};

export type AdminResumeThumbnailFailure = {
  profileId: string;
  handle: string | null;
  resumeUrl: string | null;
  error: string | null;
  status: string;
  updatedAt: string | null;
};

export type AdminResumeThumbnailRun = {
  id: string;
  actorEmail: string | null;
  action: string;
  runId: string | null;
  attempted: number | null;
  completed: number | null;
  failed: number | null;
  durationMs: number | null;
  createdAt: string;
};

export type AdminResumeThumbnailRunDetails = {
  runId: string;
  events: Array<{
    id: string;
    actorEmail: string | null;
    action: string;
    createdAt: string;
    meta: Record<string, unknown>;
  }>;
};
