import { describe, expect, it } from 'vitest';

async function loadMediaMigrationModule(): Promise<{
  buildLegacyMediaAssetCreateInput: (record: unknown) => {
    sourceType: string;
    mediaType: string;
    processingState?: string;
    derivatives: {
      display?: { url?: string | null } | null;
      thumbnail?: { url?: string | null } | null;
    };
  };
  buildLegacyMediaBackfillPlan: (record: unknown) => {
    needsAssetBackfill: boolean;
    needsGifReprocessing: boolean;
    reprocessReason: string | null;
  };
  getLegacyMediaMigrationAudit: () => {
    surfaces: Array<{ renderPaths: string[] }>;
    rolloutChecklist: unknown[];
    deprecatedHandlers: string[];
  };
}> {
  const moduleUrl = new URL(
    '../../../backend/lib/mediaMigration.js',
    import.meta.url,
  );
  return import(/* @vite-ignore */ moduleUrl.href);
}

describe('mediaMigration backend helpers', () => {
  it('builds create input for structured portfolio document uploads', async () => {
    const { buildLegacyMediaAssetCreateInput } =
      await loadMediaMigrationModule();
    const createInput = buildLegacyMediaAssetCreateInput({
      kind: 'portfolio_project',
      project: {
        id: 'project-1',
        owner_id: 'user-1',
        title: 'Project deck',
        description: null,
        image_url: null,
        project_url:
          'https://example.supabase.co/storage/v1/object/public/project-sources/user-1/project-source/asset-1/original.pptx',
        tech_stack: [],
        created_at: '2026-04-01T00:00:00.000Z',
        resolved_type: 'presentation',
        thumbnail_url: null,
        thumbnail_status: 'pending',
      },
    });

    expect(createInput.sourceType).toBe('upload');
    expect(createInput.mediaType).toBe('doc');
    expect(createInput.processingState).toBe('processing');
    expect(createInput.derivatives.display?.url).toContain('/display.svg');
    expect(createInput.derivatives.thumbnail?.url).toContain('/thumbnail.svg');
  });

  it('flags GIFs without posters for reprocessing', async () => {
    const { buildLegacyMediaBackfillPlan } = await loadMediaMigrationModule();
    const backfillPlan = buildLegacyMediaBackfillPlan({
      kind: 'gif',
      gifUrl: 'https://cdn.example.com/legacy/reaction.gif',
      surface: 'feed',
    });

    expect(backfillPlan.needsAssetBackfill).toBe(true);
    expect(backfillPlan.needsGifReprocessing).toBe(true);
    expect(backfillPlan.reprocessReason).toContain('Legacy GIF');
  });

  it('returns audit inventory and cutover checklist for ops tooling', async () => {
    const { getLegacyMediaMigrationAudit } = await loadMediaMigrationModule();
    const audit = getLegacyMediaMigrationAudit();

    expect(audit.surfaces).toHaveLength(5);
    expect(audit.rolloutChecklist).toHaveLength(5);
    expect(audit.deprecatedHandlers).toContain(
      'AttachmentPreview signed URL resolver',
    );
    expect(audit.surfaces[0]?.renderPaths).toContain(
      'src/pages/feed/feedCard.tsx',
    );
  });
});
