import { cleanNullableText, cleanText, cleanUrl } from './mediaSanitizers.js';

export const LEGACY_MEDIA_SURFACE_AUDIT = [
  {
    surface: 'feed',
    assetTypes: ['post image_urls', 'body GIF URLs', 'link_preview payloads'],
    storageBuckets: ['feed-post-images'],
    legacyFields: [
      'feed_items.payload.image_urls',
      'feed_items.payload.link_preview',
    ],
    renderPaths: [
      'src/pages/feed/feedCard.tsx',
      'src/pages/feed/feedCardPostContent.tsx',
      'src/components/media/LinkPreviewCard.tsx',
    ],
    notes:
      'Feed still mixes inline GIF URLs, payload link previews, and bucket-hosted image attachments.',
  },
  {
    surface: 'chat',
    assetTypes: [
      'message attachments',
      'signed document/image previews',
      'chat GIF uploads',
    ],
    storageBuckets: ['chat-attachments'],
    legacyFields: [
      'chat_message_attachments.storage_path',
      'chat_messages.content',
    ],
    renderPaths: [
      'src/components/chat/message/AttachmentPreview.tsx',
      'src/components/chat/message/MessageList.tsx',
    ],
    notes:
      'Chat derives signed URLs at render time and still treats attachment rows as storage-path-first records.',
  },
  {
    surface: 'profile',
    assetTypes: [
      'resume original files',
      'resume preview thumbnails',
      'avatar uploads',
    ],
    storageBuckets: ['resumes', 'avatars'],
    legacyFields: [
      'profiles.resume_url',
      'profiles.nerd_creds.resume_*',
      'profiles.avatar',
    ],
    renderPaths: [
      'src/hooks/profile/useProfileAssets.ts',
      'src/components/portfolio/cards/ResumeCard.tsx',
    ],
    notes:
      'Resume metadata is split across profile columns and nerd_creds JSON while previews are backfilled separately.',
  },
  {
    surface: 'portfolio',
    assetTypes: [
      'project source uploads',
      'manual project images',
      'generated thumbnails',
    ],
    storageBuckets: [
      'project-sources',
      'project-images',
      'portfolio-thumbnails',
    ],
    legacyFields: [
      'portfolio_items.project_url',
      'portfolio_items.image_url',
      'portfolio_items.thumbnail_url',
      'portfolio_items.thumbnail_status',
    ],
    renderPaths: [
      'src/pages/profile/ProjectPage.tsx',
      'src/components/portfolio/cards/ProjectCard.tsx',
      'src/lib/portfolio/projectMedia.ts',
    ],
    notes:
      'Portfolio rows still depend on three separate URL fields plus thumbnail_status to resolve preview behavior.',
  },
  {
    surface: 'groups',
    assetTypes: ['group avatars'],
    storageBuckets: ['group image URLs on chat_rooms.image_url'],
    legacyFields: ['chat_rooms.image_url'],
    renderPaths: [
      'src/components/chat/room/ChatRoomHeader.tsx',
      'src/components/chat/room/ChatRoomRow.tsx',
      'src/pages/community/GroupsPage.tsx',
    ],
    notes:
      'Group images still render straight from chat_rooms.image_url and need compatibility mapping before cutover.',
  },
];

export const LEGACY_MEDIA_ROLLOUT_CHECKLIST = [
  {
    surface: 'feed',
    compatibilityAdapter:
      'legacy feed attachments, GIF URLs, and link previews',
    backfillFocus: [
      'promote payload image_urls into asset rows',
      'refresh missing link preview metadata',
      'queue GIF thumbnails where body URLs lack posters',
    ],
    cutoverTask:
      'Switch Feed cards to consume media_assets references from payloads instead of legacy image_urls/link_preview fields.',
    deprecatedHandlers: [
      'feed_items.payload.image_urls rendering',
      'inline GIPHY URL parsing in post bodies',
      'surface-owned link preview fallback fetches',
    ],
  },
  {
    surface: 'chat',
    compatibilityAdapter: 'legacy chat attachment storage descriptors',
    backfillFocus: [
      'materialize asset rows for chat_message_attachments',
      'backfill thumbnails for old docs and GIFs',
      'queue derivative regeneration for GIF uploads without posters',
    ],
    cutoverTask:
      'Store media asset ids on chat attachments/messages and stop resolving signed URLs ad hoc in the component tree.',
    deprecatedHandlers: [
      'AttachmentPreview signed URL resolver',
      'storage_path-first attachment rendering',
    ],
  },
  {
    surface: 'profile',
    compatibilityAdapter:
      'resume compatibility mapping from resume_url + nerd_creds',
    backfillFocus: [
      'generate missing resume thumbnails',
      'backfill original/display/thumbnail refs for Word resumes',
      'promote resume metadata into media asset rows',
    ],
    cutoverTask:
      'Persist a canonical resume asset reference on profile records and retire split resume thumbnail fields in nerd_creds.',
    deprecatedHandlers: [
      'profiles.resume_url direct rendering',
      'nerd_creds resume thumbnail sidecar fields',
    ],
  },
  {
    surface: 'portfolio',
    compatibilityAdapter: 'portfolio project compatibility mapper',
    backfillFocus: [
      'create assets for project_url/image_url/thumbnail_url triplets',
      'reprocess legacy document previews',
      'backfill metadata for external links and embedded assets',
    ],
    cutoverTask:
      'Move portfolio rows to a single media asset reference for previewable uploads while keeping external links as linked assets.',
    deprecatedHandlers: [
      'portfolio_items image_url/project_url/thumbnail_url triad',
      'thumbnail_status-driven preview branching',
    ],
  },
  {
    surface: 'groups',
    compatibilityAdapter: 'group image compatibility mapper',
    backfillFocus: [
      'materialize group image assets from chat_rooms.image_url',
      'backfill thumbnails for older uploaded group images',
    ],
    cutoverTask:
      'Store group image asset ids on chat rooms and remove direct image_url rendering after migration.',
    deprecatedHandlers: ['chat_rooms.image_url direct avatar rendering'],
  },
];

function isGiphyUrl(url) {
  const candidate = cleanText(url, 2048).toLowerCase();
  return (
    candidate.includes('giphy.com') ||
    candidate.includes('media.giphy.com') ||
    candidate.includes('gph.is')
  );
}

function parseStorageLocation(url) {
  const candidate = cleanUrl(url);
  if (!candidate) {
    return { bucket: null, path: null, mode: null };
  }
  try {
    const parsed = new URL(candidate);
    const marker = '/storage/v1/object/';
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex < 0) {
      return { bucket: null, path: null, mode: null };
    }
    const segments = parsed.pathname
      .slice(markerIndex + marker.length)
      .split('/')
      .filter(Boolean);
    if (segments.length < 3) {
      return { bucket: null, path: null, mode: null };
    }
    const [mode, bucket, ...pathParts] = segments;
    return {
      bucket,
      path: pathParts.join('/'),
      mode: mode === 'public' || mode === 'sign' ? mode : null,
    };
  } catch {
    return { bucket: null, path: null, mode: null };
  }
}

function replaceTerminalFileName(pathOrUrl, fileName) {
  const clean = cleanText(pathOrUrl, 2048);
  if (!clean) return clean;
  const queryIndex = clean.indexOf('?');
  const hashIndex = clean.indexOf('#');
  const suffixStart = [queryIndex, hashIndex]
    .filter((index) => index >= 0)
    .reduce((earliest, index) => Math.min(earliest, index), clean.length);
  const base = clean.slice(0, suffixStart);
  const suffix = clean.slice(suffixStart);
  const lastSlashIndex = base.lastIndexOf('/');
  if (lastSlashIndex < 0) return `${fileName}${suffix}`;
  return `${base.slice(0, lastSlashIndex + 1)}${fileName}${suffix}`;
}

function deriveSibling(value, nextStem, nextExtension) {
  return replaceTerminalFileName(
    value,
    `${nextStem}.${String(nextExtension).replace(/^\./, '')}`,
  );
}

function inferLegacyMediaType(params) {
  const mimeType = cleanText(params.mimeType, 120).toLowerCase();
  const resolvedType = cleanText(params.resolvedType, 80).toLowerCase();
  const url = cleanText(params.url, 2048).toLowerCase();
  if (mimeType === 'image/gif' || resolvedType === 'gif' || isGiphyUrl(url)) {
    return 'gif';
  }
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (
    mimeType === 'application/pdf' ||
    mimeType === 'application/msword' ||
    mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/vnd.ms-powerpoint' ||
    mimeType ===
      'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    mimeType === 'application/vnd.ms-excel' ||
    mimeType ===
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'text/plain' ||
    mimeType === 'text/markdown'
  ) {
    return 'doc';
  }
  if (
    [
      'pdf',
      'document',
      'presentation',
      'spreadsheet',
      'text',
      'google_doc',
      'google_sheet',
      'google_slides',
    ].includes(resolvedType)
  ) {
    return 'doc';
  }
  if (/\.gif(?:$|\?)/i.test(url)) return 'gif';
  if (/\.(png|jpe?g|webp|avif|bmp|svg)(?:$|\?)/i.test(url)) return 'image';
  if (/\.(mp4|webm|mov)(?:$|\?)/i.test(url)) return 'video';
  if (/\.(pdf|doc|docx|ppt|pptx|xls|xlsx|txt|md)(?:$|\?)/i.test(url)) {
    return 'doc';
  }
  return 'link';
}

function getExtensions(mediaType, mimeType) {
  const normalizedMime = cleanText(mimeType, 120).toLowerCase();
  if (mediaType === 'gif') {
    return {
      displayExtension: normalizedMime === 'video/mp4' ? 'mp4' : 'gif',
      thumbnailExtension: 'jpg',
    };
  }
  if (mediaType === 'image') {
    return {
      displayExtension: normalizedMime === 'image/png' ? 'png' : 'webp',
      thumbnailExtension: 'jpg',
    };
  }
  if (mediaType === 'video') {
    return {
      displayExtension: 'mp4',
      thumbnailExtension: 'jpg',
    };
  }
  return {
    displayExtension: 'svg',
    thumbnailExtension: 'svg',
  };
}

function mapProcessingState(params) {
  if (params.failed) return 'failed';
  if (params.pending) return 'processing';
  return 'ready';
}

function buildFailure(
  record,
  mediaType,
  processingState,
  needsThumbnailBackfill,
) {
  if (processingState !== 'failed') return null;
  if (mediaType === 'doc') {
    return {
      code: 'LEGACY_DOC_DERIVATIVES_MISSING',
      reason:
        'Legacy document preview is missing derivatives and should be reprocessed.',
      stage: 'migration',
      retryable: true,
      failedAt: new Date().toISOString(),
    };
  }
  if (mediaType === 'gif') {
    return {
      code: 'LEGACY_GIF_DERIVATIVES_MISSING',
      reason:
        'Legacy GIF is missing preview derivatives and should be reprocessed.',
      stage: 'migration',
      retryable: true,
      failedAt: new Date().toISOString(),
    };
  }
  if (needsThumbnailBackfill) {
    return {
      code: 'LEGACY_THUMBNAIL_MISSING',
      reason: 'Legacy asset is missing a preview derivative.',
      stage: 'migration',
      retryable: true,
      failedAt: new Date().toISOString(),
    };
  }
  return null;
}

function deprecatedHandlersForSurface(surface) {
  return (
    LEGACY_MEDIA_ROLLOUT_CHECKLIST.find((entry) => entry.surface === surface)
      ?.deprecatedHandlers ?? []
  );
}

function buildFeedAttachmentInput(record) {
  const url = cleanUrl(record.imageUrl);
  const storage = parseStorageLocation(url);
  const mediaType = inferLegacyMediaType({ url });
  const extensions = getExtensions(mediaType, null);
  return {
    sourceType: 'upload',
    mediaType,
    source: {
      externalUrl: url,
      storageBucket: storage.bucket,
      storagePath: storage.path,
    },
    derivatives: {
      display: url
        ? {
            kind: 'display',
            url,
            storageBucket: storage.bucket,
            storagePath: storage.path,
          }
        : null,
      thumbnail: url
        ? {
            kind: 'thumbnail',
            url: deriveSibling(url, 'thumbnail', extensions.thumbnailExtension),
            storageBucket: storage.bucket,
            storagePath: storage.path
              ? deriveSibling(
                  storage.path,
                  'thumbnail',
                  extensions.thumbnailExtension,
                )
              : null,
          }
        : null,
    },
    metadata: {
      title: 'Feed attachment',
      surface: 'feed',
      parentType: 'feed_item',
    },
    telemetry: {
      pipeline: 'legacy_migration',
      surface: 'feed',
      stage: 'compatibility_adapter',
    },
  };
}

function buildGifInput(record) {
  const url = cleanUrl(record.gifUrl);
  const storage = parseStorageLocation(url);
  const sourceType = isGiphyUrl(url) ? 'gif_provider' : 'upload';
  const thumbnailUrl =
    storage.path && url ? deriveSibling(url, 'thumbnail', 'jpg') : null;
  const needsThumbnailBackfill = !thumbnailUrl && sourceType === 'upload';
  const processingState = mapProcessingState({
    failed: needsThumbnailBackfill,
  });
  return {
    sourceType,
    mediaType: 'gif',
    processingState,
    source: {
      externalUrl: url,
      storageBucket: storage.bucket,
      storagePath: storage.path,
      mimeType: /\.mp4(?:$|\?)/i.test(url ?? '') ? 'video/mp4' : 'image/gif',
      provider: isGiphyUrl(url) ? 'GIPHY' : null,
    },
    derivatives: {
      original: url
        ? {
            kind: 'original',
            url,
            storageBucket: storage.bucket,
            storagePath: storage.path,
          }
        : null,
      display: url
        ? {
            kind: 'display',
            url,
            storageBucket: storage.bucket,
            storagePath: storage.path,
          }
        : null,
      thumbnail: thumbnailUrl
        ? {
            kind: 'thumbnail',
            url: thumbnailUrl,
            storageBucket: storage.bucket,
            storagePath: storage.path
              ? deriveSibling(storage.path, 'thumbnail', 'jpg')
              : null,
          }
        : null,
    },
    metadata: {
      title: 'Legacy GIF',
      provider: isGiphyUrl(url) ? 'GIPHY' : null,
      surface: cleanNullableText(record.surface, 80) ?? 'feed',
      parentType:
        cleanNullableText(record.surface, 80) === 'chat'
          ? 'chat_message'
          : 'feed_item',
    },
    failure: buildFailure(
      record,
      'gif',
      processingState,
      needsThumbnailBackfill,
    ),
    telemetry: {
      pipeline: 'legacy_migration',
      surface: cleanNullableText(record.surface, 80) ?? 'feed',
      stage: 'compatibility_adapter',
    },
  };
}

function buildLinkPreviewInput(record) {
  const preview =
    record.preview && typeof record.preview === 'object' ? record.preview : {};
  const url = cleanUrl(record.url);
  const image = cleanUrl(preview.image);
  const surface = cleanNullableText(record.surface, 80) ?? 'feed';
  return {
    sourceType: 'link',
    mediaType: 'link',
    source: {
      externalUrl: url,
      provider: cleanNullableText(preview.siteName, 120),
    },
    derivatives: {
      original: url
        ? {
            kind: 'original',
            url,
          }
        : null,
      display: image
        ? {
            kind: 'display',
            url: image,
          }
        : null,
      thumbnail: image
        ? {
            kind: 'thumbnail',
            url: image,
          }
        : null,
    },
    metadata: {
      title:
        cleanNullableText(record.title, 300) ??
        cleanNullableText(preview.title, 300) ??
        url,
      description:
        cleanNullableText(record.description, 500) ??
        cleanNullableText(preview.description, 500),
      ogImageUrl: image,
      provider: cleanNullableText(preview.siteName, 120),
      surface,
      parentType: surface === 'chat' ? 'chat_message' : 'feed_item',
    },
    telemetry: {
      pipeline: 'legacy_migration',
      surface,
      stage: 'compatibility_adapter',
    },
  };
}

function buildPortfolioInput(record) {
  const project = record.project ?? {};
  const projectUrl = cleanUrl(project.project_url);
  const imageUrl = cleanUrl(project.image_url);
  const thumbnailUrl = cleanUrl(project.thumbnail_url);
  const mediaType = inferLegacyMediaType({
    url: projectUrl,
    resolvedType: project.resolved_type,
  });
  const extensions = getExtensions(mediaType, null);
  const structuredOriginalUrl =
    projectUrl && /\/original\./.test(projectUrl) ? projectUrl : null;
  const sourceStorage = parseStorageLocation(projectUrl);
  const imageStorage = parseStorageLocation(imageUrl);
  const displayUrl =
    imageUrl ??
    (structuredOriginalUrl
      ? deriveSibling(
          structuredOriginalUrl,
          'display',
          extensions.displayExtension,
        )
      : mediaType === 'image'
        ? projectUrl
        : thumbnailUrl);
  const resolvedThumbnailUrl =
    imageUrl ??
    thumbnailUrl ??
    (structuredOriginalUrl
      ? deriveSibling(
          structuredOriginalUrl,
          'thumbnail',
          extensions.thumbnailExtension,
        )
      : mediaType === 'image'
        ? projectUrl
        : null);
  const processingState = mapProcessingState({
    pending: project.thumbnail_status === 'pending',
    failed: project.thumbnail_status === 'failed',
  });
  return {
    assetId: cleanNullableText(project.id, 80) ?? null,
    sourceType: sourceStorage.bucket || imageStorage.bucket ? 'upload' : 'link',
    mediaType,
    processingState,
    source: {
      externalUrl: projectUrl ?? imageUrl,
      storageBucket: sourceStorage.bucket ?? imageStorage.bucket,
      storagePath: sourceStorage.path ?? imageStorage.path,
    },
    derivatives: {
      original: projectUrl
        ? {
            kind: 'original',
            url: projectUrl,
            storageBucket: sourceStorage.bucket,
            storagePath: sourceStorage.path,
          }
        : null,
      display: displayUrl
        ? {
            kind: 'display',
            url: displayUrl,
            storageBucket: imageStorage.bucket ?? sourceStorage.bucket,
            storagePath:
              imageStorage.path ??
              (sourceStorage.path && structuredOriginalUrl
                ? deriveSibling(
                    sourceStorage.path,
                    'display',
                    extensions.displayExtension,
                  )
                : sourceStorage.path),
          }
        : null,
      thumbnail: resolvedThumbnailUrl
        ? {
            kind: 'thumbnail',
            url: resolvedThumbnailUrl,
            storageBucket: imageStorage.bucket ?? sourceStorage.bucket,
            storagePath:
              parseStorageLocation(resolvedThumbnailUrl).path ??
              (sourceStorage.path && structuredOriginalUrl
                ? deriveSibling(
                    sourceStorage.path,
                    'thumbnail',
                    extensions.thumbnailExtension,
                  )
                : imageStorage.path),
          }
        : null,
    },
    metadata: {
      title: cleanNullableText(project.title, 300),
      description: cleanNullableText(project.description, 500),
      surface: 'portfolio',
      parentType: 'portfolio_item',
      parentId: cleanNullableText(project.id, 80),
    },
    failure: buildFailure(
      record,
      mediaType,
      processingState,
      !resolvedThumbnailUrl && mediaType !== 'link',
    ),
    telemetry: {
      pipeline: 'legacy_migration',
      surface: 'portfolio',
      stage: 'compatibility_adapter',
    },
  };
}

function deriveResumeThumbnailUrl(url) {
  const resumeUrl = cleanUrl(url);
  if (!resumeUrl) return null;
  if (resumeUrl.includes('/resume-thumbnail.')) return resumeUrl;
  if (resumeUrl.includes('/resume-original.')) {
    return replaceTerminalFileName(resumeUrl, 'resume-thumbnail.jpg');
  }
  if (/\/resume\.[a-z0-9]+$/i.test(resumeUrl)) {
    return replaceTerminalFileName(resumeUrl, 'resume-thumbnail.jpg');
  }
  return null;
}

function buildResumeInput(record) {
  const url = cleanUrl(record.url);
  const thumbnailUrl =
    cleanUrl(record.thumbnailUrl) ?? deriveResumeThumbnailUrl(url);
  const processingState = mapProcessingState({
    pending: record.thumbnailStatus === 'pending',
    failed: record.thumbnailStatus === 'failed',
  });
  const storage = parseStorageLocation(url);
  return {
    sourceType: storage.bucket ? 'upload' : 'link',
    mediaType: 'doc',
    processingState,
    source: {
      externalUrl: url,
      storageBucket: storage.bucket,
      storagePath: storage.path,
    },
    derivatives: {
      original: url
        ? {
            kind: 'original',
            url,
            storageBucket: storage.bucket,
            storagePath: storage.path,
          }
        : null,
      display: thumbnailUrl
        ? {
            kind: 'display',
            url: thumbnailUrl,
            storageBucket: parseStorageLocation(thumbnailUrl).bucket,
            storagePath: parseStorageLocation(thumbnailUrl).path,
          }
        : null,
      thumbnail: thumbnailUrl
        ? {
            kind: 'thumbnail',
            url: thumbnailUrl,
            storageBucket: parseStorageLocation(thumbnailUrl).bucket,
            storagePath: parseStorageLocation(thumbnailUrl).path,
          }
        : null,
    },
    metadata: {
      title: cleanNullableText(record.fileName, 300) ?? 'Resume',
      originalFilename: cleanNullableText(record.fileName, 300),
      surface: 'profile',
      parentType: 'profile_resume',
    },
    failure: buildFailure(record, 'doc', processingState, !thumbnailUrl),
    telemetry: {
      pipeline: 'legacy_migration',
      surface: 'profile',
      stage: 'compatibility_adapter',
    },
  };
}

function buildGroupImageInput(record) {
  const room = record.room ?? {};
  const url = cleanUrl(room.image_url);
  const storage = parseStorageLocation(url);
  return {
    assetId: cleanNullableText(room.id, 80) ?? null,
    sourceType: storage.bucket ? 'upload' : 'link',
    mediaType: 'image',
    source: {
      externalUrl: url,
      storageBucket: storage.bucket,
      storagePath: storage.path,
    },
    derivatives: {
      display: url
        ? {
            kind: 'display',
            url,
            storageBucket: storage.bucket,
            storagePath: storage.path,
          }
        : null,
      thumbnail: url
        ? {
            kind: 'thumbnail',
            url: storage.path ? deriveSibling(url, 'thumbnail', 'jpg') : url,
            storageBucket: storage.bucket,
            storagePath: storage.path
              ? deriveSibling(storage.path, 'thumbnail', 'jpg')
              : null,
          }
        : null,
    },
    metadata: {
      title: cleanNullableText(room.name, 300) ?? 'Group image',
      surface: 'groups',
      parentType: 'chat_room',
      parentId: cleanNullableText(room.id, 80),
    },
    telemetry: {
      pipeline: 'legacy_migration',
      surface: 'groups',
      stage: 'compatibility_adapter',
    },
  };
}

function buildChatAttachmentInput(record) {
  const attachment = record.attachment ?? {};
  const mediaType = inferLegacyMediaType({
    mimeType: attachment.mime_type,
    url: attachment.storage_path,
  });
  const extensions = getExtensions(mediaType, attachment.mime_type);
  const storagePath = cleanNullableText(attachment.storage_path, 2048);
  const structuredOriginal = /\/original\./.test(storagePath ?? '');
  const displayPath = structuredOriginal
    ? deriveSibling(storagePath, 'display', extensions.displayExtension)
    : storagePath;
  const thumbnailPath =
    structuredOriginal || mediaType !== 'image'
      ? deriveSibling(storagePath, 'thumbnail', extensions.thumbnailExtension)
      : null;
  const resolvedUrls =
    record.resolvedUrls && typeof record.resolvedUrls === 'object'
      ? record.resolvedUrls
      : {};
  const thumbnailUrl = cleanUrl(resolvedUrls.thumbnailUrl);
  const needsThumbnailBackfill = mediaType !== 'image' && !thumbnailUrl;
  const processingState = mapProcessingState({
    failed: needsThumbnailBackfill && mediaType !== 'image',
  });
  return {
    assetId: cleanNullableText(attachment.id, 80) ?? null,
    sourceType: 'upload',
    mediaType,
    processingState,
    source: {
      storageBucket: 'chat-attachments',
      storagePath,
      mimeType: cleanNullableText(attachment.mime_type, 120),
    },
    derivatives: {
      original: storagePath
        ? {
            kind: 'original',
            url: cleanUrl(resolvedUrls.originalUrl),
            storageBucket: 'chat-attachments',
            storagePath,
            mimeType: cleanNullableText(attachment.mime_type, 120),
            sizeBytes:
              typeof attachment.file_size === 'number'
                ? attachment.file_size
                : null,
          }
        : null,
      display: displayPath
        ? {
            kind: 'display',
            url:
              cleanUrl(resolvedUrls.displayUrl) ??
              cleanUrl(resolvedUrls.originalUrl),
            storageBucket: 'chat-attachments',
            storagePath: displayPath,
            mimeType: cleanNullableText(attachment.mime_type, 120),
          }
        : null,
      thumbnail:
        thumbnailPath || thumbnailUrl
          ? {
              kind: 'thumbnail',
              url: thumbnailUrl,
              storageBucket: 'chat-attachments',
              storagePath: thumbnailPath,
            }
          : null,
    },
    metadata: {
      surface: 'chat',
      parentType: 'chat_message_attachment',
      parentId: cleanNullableText(attachment.message_id, 80),
      mimeType: cleanNullableText(attachment.mime_type, 120),
      sizeOriginal:
        typeof attachment.file_size === 'number' ? attachment.file_size : null,
    },
    failure: buildFailure(
      record,
      mediaType,
      processingState,
      needsThumbnailBackfill,
    ),
    telemetry: {
      pipeline: 'legacy_migration',
      surface: 'chat',
      stage: 'compatibility_adapter',
    },
  };
}

export function buildLegacyMediaAssetCreateInput(record) {
  const kind = cleanNullableText(record?.kind, 80);
  switch (kind) {
    case 'feed_attachment':
      return buildFeedAttachmentInput(record);
    case 'gif':
      return buildGifInput(record);
    case 'link_preview':
      return buildLinkPreviewInput(record);
    case 'portfolio_project':
      return buildPortfolioInput(record);
    case 'profile_resume':
      return buildResumeInput(record);
    case 'group_image':
      return buildGroupImageInput(record);
    case 'chat_attachment':
      return buildChatAttachmentInput(record);
    default:
      throw new Error('Unsupported legacy media record kind');
  }
}

export function buildLegacyMediaBackfillPlan(record) {
  const input = buildLegacyMediaAssetCreateInput(record);
  const hasDisplay = Boolean(
    input.derivatives?.display?.url || input.derivatives?.display?.storagePath,
  );
  const hasThumbnail = Boolean(
    input.derivatives?.thumbnail?.url ||
    input.derivatives?.thumbnail?.storagePath,
  );
  const needsLinkPreviewBackfill =
    record?.kind === 'link_preview' &&
    !cleanNullableText(input.metadata?.provider, 120) &&
    !cleanNullableText(input.metadata?.description, 500);
  const needsMetadataBackfill =
    !cleanNullableText(input.metadata?.title, 300) ||
    (input.mediaType === 'doc' &&
      !cleanNullableText(input.metadata?.originalFilename, 300));
  const needsThumbnailBackfill =
    !hasThumbnail && ['doc', 'gif', 'video'].includes(input.mediaType);
  const needsDisplayBackfill =
    !hasDisplay && ['doc', 'video'].includes(input.mediaType);
  const needsGifReprocessing =
    input.mediaType === 'gif' && needsThumbnailBackfill;
  const surface = cleanNullableText(input.metadata?.surface, 80) ?? 'feed';
  return {
    needsAssetBackfill: true,
    needsDisplayBackfill,
    needsThumbnailBackfill,
    needsMetadataBackfill,
    needsLinkPreviewBackfill,
    needsGifReprocessing,
    reprocessReason: needsGifReprocessing
      ? 'Legacy GIF is missing preview derivatives and should be reprocessed.'
      : needsThumbnailBackfill && input.mediaType === 'doc'
        ? 'Legacy document preview is missing derivatives and should be reprocessed.'
        : needsDisplayBackfill
          ? 'Legacy asset is missing display derivatives.'
          : null,
    compatibilityMode:
      needsDisplayBackfill ||
      needsThumbnailBackfill ||
      needsMetadataBackfill ||
      needsLinkPreviewBackfill
        ? 'legacy_adapter'
        : 'ready_for_cutover',
    deprecatedHandlers: deprecatedHandlersForSurface(surface),
  };
}

export function getLegacyMediaMigrationAudit() {
  return {
    surfaces: LEGACY_MEDIA_SURFACE_AUDIT,
    rolloutChecklist: LEGACY_MEDIA_ROLLOUT_CHECKLIST,
    deprecatedHandlers: [
      ...new Set(
        LEGACY_MEDIA_ROLLOUT_CHECKLIST.flatMap(
          (entry) => entry.deprecatedHandlers,
        ),
      ),
    ],
  };
}
