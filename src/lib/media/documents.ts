export const SUPPORTED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/markdown',
] as const;

export const SUPPORTED_DOCUMENT_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.xls',
  '.xlsx',
  '.txt',
  '.md',
] as const;

export type DocumentKind =
  | 'pdf'
  | 'word'
  | 'presentation'
  | 'spreadsheet'
  | 'text'
  | 'markdown'
  | 'document';

export type DocumentPreviewStrategy =
  | 'rendered_first_page'
  | 'generated_card'
  | 'fallback_icon';

export type DocumentActionMode = 'inline_preview' | 'open_new_tab' | 'download';

export type DocumentPreviewModel = {
  kind: DocumentKind;
  label: string;
  badge: string;
  title: string;
  subtitle: string;
  accent: string;
  iconAccent: string;
  excerpt: string | null;
  extension: string | null;
  actionLabel: string;
};

export type DocumentInteractionPolicy = {
  kind: DocumentKind | null;
  typeLabel: string;
  previewable: boolean;
  previewUrl: string;
  openUrl: string;
  downloadUrl: string;
  preferDownload: boolean;
  actionMode: DocumentActionMode;
  fallbackMessage: string | null;
};

type DetectDocumentKindInput = {
  mimeType?: string | null;
  fileName?: string | null;
  url?: string | null;
  resolvedType?: string | null;
};

type BuildDocumentPreviewInput = DetectDocumentKindInput & {
  title?: string | null;
  sizeBytes?: number | null;
  excerpt?: string | null;
  actionMode?: DocumentActionMode | null;
};

const DOCUMENT_MIME_BY_EXTENSION: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx':
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
};

const DOCUMENT_KIND_META: Record<
  DocumentKind,
  {
    label: string;
    badge: string;
    accent: string;
    iconAccent: string;
    defaultAction: DocumentActionMode;
  }
> = {
  pdf: {
    label: 'PDF',
    badge: 'PDF',
    accent: '#fb7185',
    iconAccent: '#fecdd3',
    defaultAction: 'inline_preview',
  },
  word: {
    label: 'Document',
    badge: 'DOC',
    accent: '#60a5fa',
    iconAccent: '#dbeafe',
    defaultAction: 'download',
  },
  presentation: {
    label: 'Slides',
    badge: 'PPT',
    accent: '#f59e0b',
    iconAccent: '#fef3c7',
    defaultAction: 'download',
  },
  spreadsheet: {
    label: 'Spreadsheet',
    badge: 'XLS',
    accent: '#22c55e',
    iconAccent: '#dcfce7',
    defaultAction: 'download',
  },
  text: {
    label: 'Text',
    badge: 'TXT',
    accent: '#a78bfa',
    iconAccent: '#ede9fe',
    defaultAction: 'open_new_tab',
  },
  markdown: {
    label: 'Markdown',
    badge: 'MD',
    accent: '#14b8a6',
    iconAccent: '#ccfbf1',
    defaultAction: 'open_new_tab',
  },
  document: {
    label: 'Document',
    badge: 'FILE',
    accent: '#94a3b8',
    iconAccent: '#e2e8f0',
    defaultAction: 'download',
  },
};

function escapeSvgText(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getFileExtension(value: string | null | undefined): string | null {
  const input = value?.trim() ?? '';
  if (!input) return null;
  try {
    const pathname = input.includes('://') ? new URL(input).pathname : input;
    const segment = pathname.split('/').filter(Boolean).pop() ?? '';
    const lastDot = segment.lastIndexOf('.');
    if (lastDot < 0) return null;
    const extension = segment.slice(lastDot).toLowerCase();
    return extension || null;
  } catch {
    const lastDot = input.lastIndexOf('.');
    return lastDot >= 0 ? input.slice(lastDot).toLowerCase() : null;
  }
}

function cleanHttpUrl(value: string | null | undefined): string {
  const input = value?.trim() ?? '';
  if (!input) return '';
  try {
    const parsed = new URL(input);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

function normalizeTitle(value: string | null | undefined): string {
  return value?.trim() || '';
}

function formatFileSize(sizeBytes: number | null | undefined): string | null {
  if (
    typeof sizeBytes !== 'number' ||
    !Number.isFinite(sizeBytes) ||
    sizeBytes <= 0
  ) {
    return null;
  }
  if (sizeBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  }
  const mb = sizeBytes / (1024 * 1024);
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
}

function buildSubtitle(params: {
  label: string;
  extension: string | null;
  sizeBytes?: number | null;
}): string {
  const bits = [
    params.label,
    params.extension?.replace(/^\./, '').toUpperCase() ?? null,
    formatFileSize(params.sizeBytes),
  ].filter(Boolean);
  return bits.join(' · ');
}

function summarizePreviewText(value: string): string {
  return value
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function wrapText(
  value: string,
  maxCharsPerLine: number,
  maxLines: number,
): string[] {
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let current = '';
  let truncated = false;

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxCharsPerLine) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
      if (lines.length >= maxLines) {
        truncated = true;
        break;
      }
    }
    current = word;
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  } else if (current) {
    truncated = true;
  }

  if (truncated && lines.length === maxLines) {
    const last = lines[maxLines - 1] ?? '';
    lines[maxLines - 1] =
      last.length >= maxCharsPerLine
        ? `${last.slice(0, maxCharsPerLine - 1)}…`
        : `${last}…`;
  }

  return lines;
}

function getExcerptOrFallback(
  kind: DocumentKind,
  excerpt: string | null | undefined,
): string | null {
  const normalized = summarizePreviewText(excerpt ?? '');
  if (normalized) return normalized.slice(0, 420);

  switch (kind) {
    case 'pdf':
      return 'First-page preview is unavailable. Open the document to read the full file.';
    case 'presentation':
      return 'Slides use a shared preview card so presentations render consistently across the app.';
    case 'spreadsheet':
      return 'Open or download the spreadsheet to inspect formulas, tabs, and full table detail.';
    case 'word':
      return 'The first page is represented as a normalized document card when a rendered preview is unavailable.';
    case 'text':
    case 'markdown':
      return 'Open in a new tab to read the full text document.';
    default:
      return 'Open or download the document to view the original file.';
  }
}

function getActionLabel(actionMode: DocumentActionMode): string {
  switch (actionMode) {
    case 'inline_preview':
      return 'Preview opens inline when supported';
    case 'open_new_tab':
      return 'Open in a new tab to read';
    default:
      return 'Download the original file';
  }
}

function supportsOfficeEmbed(url: string): boolean {
  const sourceUrl = cleanHttpUrl(url);
  if (!sourceUrl) return false;

  try {
    const parsed = new URL(sourceUrl);
    if (
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname.endsWith('.local')
    ) {
      return false;
    }

    if (parsed.pathname.includes('/storage/v1/object/sign/')) {
      return false;
    }

    if (parsed.pathname.includes('/storage/v1/object/public/resumes/')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function isSupportedDocumentMimeType(
  mimeType: string | null | undefined,
): boolean {
  const normalized = mimeType?.toLowerCase().trim() ?? '';
  return SUPPORTED_DOCUMENT_MIME_TYPES.includes(
    normalized as (typeof SUPPORTED_DOCUMENT_MIME_TYPES)[number],
  );
}

export function getDocumentMimeTypeForName(
  fileName: string | null | undefined,
): string | null {
  const extension = getFileExtension(fileName);
  return extension ? (DOCUMENT_MIME_BY_EXTENSION[extension] ?? null) : null;
}

export function getDocumentDefaultActionMode(
  kind: DocumentKind,
): DocumentActionMode {
  return DOCUMENT_KIND_META[kind].defaultAction;
}

export function getDocumentTypeLabel(kind: DocumentKind): string {
  return DOCUMENT_KIND_META[kind].label;
}

export function detectDocumentKind(
  params: DetectDocumentKindInput,
): DocumentKind | null {
  const resolvedType = params.resolvedType?.toLowerCase().trim() ?? '';
  if (resolvedType === 'pdf') return 'pdf';
  if (resolvedType === 'document' || resolvedType === 'google_doc') {
    return 'word';
  }
  if (resolvedType === 'presentation' || resolvedType === 'google_slides') {
    return 'presentation';
  }
  if (resolvedType === 'spreadsheet' || resolvedType === 'google_sheet') {
    return 'spreadsheet';
  }
  if (resolvedType === 'text') return 'text';

  const mimeType = params.mimeType?.toLowerCase().trim() ?? '';
  if (mimeType === 'application/pdf') return 'pdf';
  if (
    mimeType === 'application/msword' ||
    mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'word';
  }
  if (
    mimeType === 'application/vnd.ms-powerpoint' ||
    mimeType ===
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ) {
    return 'presentation';
  }
  if (
    mimeType === 'application/vnd.ms-excel' ||
    mimeType ===
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    return 'spreadsheet';
  }
  if (mimeType === 'text/plain') return 'text';
  if (mimeType === 'text/markdown') return 'markdown';

  const extension =
    getFileExtension(params.fileName) ?? getFileExtension(params.url) ?? null;

  switch (extension) {
    case '.pdf':
      return 'pdf';
    case '.doc':
    case '.docx':
      return 'word';
    case '.ppt':
    case '.pptx':
      return 'presentation';
    case '.xls':
    case '.xlsx':
      return 'spreadsheet';
    case '.txt':
      return 'text';
    case '.md':
      return 'markdown';
    default:
      return null;
  }
}

export function buildDocumentPreviewModel(
  params: BuildDocumentPreviewInput,
): DocumentPreviewModel {
  const kind = detectDocumentKind(params) ?? 'document';
  const meta = DOCUMENT_KIND_META[kind];
  const extension =
    getFileExtension(params.fileName) ?? getFileExtension(params.url) ?? null;
  const title =
    normalizeTitle(params.title) ||
    normalizeTitle(params.fileName) ||
    'Document preview';
  const actionMode = params.actionMode ?? getDocumentDefaultActionMode(kind);

  return {
    kind,
    label: meta.label,
    badge: meta.badge,
    title,
    subtitle: buildSubtitle({
      label: meta.label,
      extension,
      sizeBytes: params.sizeBytes ?? null,
    }),
    accent: meta.accent,
    iconAccent: meta.iconAccent,
    excerpt: getExcerptOrFallback(kind, params.excerpt),
    extension,
    actionLabel: getActionLabel(actionMode),
  };
}

export function buildDocumentPreviewSvg(
  params: BuildDocumentPreviewInput,
): string {
  const model = buildDocumentPreviewModel(params);
  const textLines = wrapText(model.excerpt ?? '', 44, 4);
  const titleLines = wrapText(model.title, 26, 2);
  const titleMarkup = titleLines
    .map(
      (line, index) =>
        `<text x="112" y="${212 + index * 54}" font-family="Arial, sans-serif" font-size="${
          index === 0 ? 54 : 42
        }" font-weight="700" fill="#f8fafc">${escapeSvgText(line)}</text>`,
    )
    .join('');
  const excerptMarkup = textLines
    .map(
      (line, index) =>
        `<text x="112" y="${388 + index * 40}" font-family="Arial, sans-serif" font-size="28" fill="#dbe5f2">${escapeSvgText(line)}</text>`,
    )
    .join('');
  const extensionBadge = model.extension
    ? `<text x="992" y="549" text-anchor="end" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="${model.iconAccent}">${escapeSvgText(model.extension.replace(/^\./, '').toUpperCase())}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675" role="img" aria-label="${escapeSvgText(model.title)}">
    <defs>
      <linearGradient id="document-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0f172a" />
        <stop offset="100%" stop-color="#111827" />
      </linearGradient>
      <radialGradient id="document-glow" cx="85%" cy="18%" r="70%">
        <stop offset="0%" stop-color="${model.accent}" stop-opacity="0.28" />
        <stop offset="100%" stop-color="${model.accent}" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect width="1200" height="675" rx="38" fill="url(#document-bg)" />
    <rect width="1200" height="675" rx="38" fill="url(#document-glow)" />
    <rect x="54" y="52" width="1092" height="571" rx="32" fill="#122033" stroke="rgba(148,163,184,0.28)" stroke-width="4" />
    <rect x="84" y="86" width="194" height="50" rx="25" fill="${model.accent}" fill-opacity="0.18" stroke="${model.accent}" stroke-opacity="0.38" />
    <text x="113" y="120" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="${model.iconAccent}">${escapeSvgText(model.badge)}</text>
    <rect x="928" y="102" width="170" height="220" rx="24" fill="rgba(15,23,42,0.38)" stroke="rgba(226,232,240,0.16)" stroke-width="3" />
    <path d="M972 138h72l40 40v98c0 8.8-7.2 16-16 16h-96c-8.8 0-16-7.2-16-16V154c0-8.8 7.2-16 16-16Z" fill="none" stroke="${model.iconAccent}" stroke-width="12" stroke-linejoin="round" />
    <path d="M1044 138v44h40" fill="none" stroke="${model.iconAccent}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" />
    <text x="1020" y="248" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="${model.iconAccent}">${escapeSvgText(model.badge)}</text>
    ${titleMarkup}
    <text x="112" y="300" font-family="Arial, sans-serif" font-size="26" fill="#93c5fd">${escapeSvgText(model.subtitle)}</text>
    <rect x="92" y="334" width="1016" height="182" rx="26" fill="rgba(15,23,42,0.48)" stroke="rgba(148,163,184,0.18)" stroke-width="3" />
    ${excerptMarkup}
    <line x1="92" y1="542" x2="1108" y2="542" stroke="rgba(148,163,184,0.18)" stroke-width="2" />
    <text x="112" y="580" font-family="Arial, sans-serif" font-size="24" font-weight="600" fill="#bfdbfe">${escapeSvgText(model.actionLabel)}</text>
    ${extensionBadge}
  </svg>`;
}

export function buildDocumentPreviewDataUrl(
  params: BuildDocumentPreviewInput,
): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    buildDocumentPreviewSvg(params),
  )}`;
}

export async function extractDocumentPreviewTextFromFile(
  file: File,
): Promise<string | null> {
  const kind = detectDocumentKind({
    fileName: file.name,
    mimeType: file.type,
  });

  if (kind !== 'text' && kind !== 'markdown') {
    return null;
  }

  const raw = await file.text();
  const normalized = summarizePreviewText(raw);
  return normalized ? normalized.slice(0, 420) : null;
}

export function buildDocumentPreviewBlob(
  params: BuildDocumentPreviewInput,
): Blob {
  return new Blob([buildDocumentPreviewSvg(params)], {
    type: 'image/svg+xml',
  });
}

export function getDocumentInteractionPolicy(
  params: DetectDocumentKindInput,
): DocumentInteractionPolicy {
  const openUrl = cleanHttpUrl(params.url);
  const kind = detectDocumentKind(params);
  const typeLabel = kind ? getDocumentTypeLabel(kind) : 'Document';

  if (!openUrl || !kind) {
    return {
      kind,
      typeLabel,
      previewable: false,
      previewUrl: '',
      openUrl,
      downloadUrl: openUrl,
      preferDownload: false,
      actionMode: 'open_new_tab',
      fallbackMessage:
        'Open or download the document to view the original file.',
    };
  }

  if (kind === 'pdf') {
    return {
      kind,
      typeLabel,
      previewable: true,
      previewUrl: `${openUrl}#toolbar=0&navpanes=0`,
      openUrl,
      downloadUrl: openUrl,
      preferDownload: false,
      actionMode: 'inline_preview',
      fallbackMessage: null,
    };
  }

  if (
    (kind === 'word' || kind === 'presentation' || kind === 'spreadsheet') &&
    supportsOfficeEmbed(openUrl)
  ) {
    return {
      kind,
      typeLabel,
      previewable: true,
      previewUrl: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
        openUrl,
      )}`,
      openUrl,
      downloadUrl: openUrl,
      preferDownload: false,
      actionMode: 'inline_preview',
      fallbackMessage: null,
    };
  }

  if (kind === 'text' || kind === 'markdown') {
    return {
      kind,
      typeLabel,
      previewable: false,
      previewUrl: '',
      openUrl,
      downloadUrl: openUrl,
      preferDownload: false,
      actionMode: 'open_new_tab',
      fallbackMessage: 'Open this document in a new tab to read the full text.',
    };
  }

  return {
    kind,
    typeLabel,
    previewable: false,
    previewUrl: '',
    openUrl,
    downloadUrl: openUrl,
    preferDownload: true,
    actionMode: 'download',
    fallbackMessage:
      'Preview is unavailable here. Download the original file to view it.',
  };
}
