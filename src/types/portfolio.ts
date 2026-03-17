/** Server-generated thumbnail status. Thumbnail failure does not block saving. */
export type ThumbnailStatus = 'pending' | 'generated' | 'failed';

/** Stable id for the resume slot in the unified portfolio sortable list (resume + projects). */
export const RESUME_ITEM_ID = '__resume__';

export interface PortfolioItem {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  project_url: string | null;
  tech_stack: string[];
  created_at: string;
  /** Explicit display order (lower first). Used for drag-and-drop reorder. */
  sort_order?: number;
  /** Highlights appear in the carousel above category sections. */
  is_highlighted?: boolean;
  /** Canonical URL after provider normalization. */
  normalized_url?: string | null;
  /** URL used for iframe embed when different from project_url. */
  embed_url?: string | null;
  /** Detected link type (image, pdf, google_doc, etc.). */
  resolved_type?: string | null;
  /** Server-generated thumbnail in platform storage; used only when no manual image. */
  thumbnail_url?: string | null;
  /** pending = queued; generated = thumbnail_url set; failed = show fallback. */
  thumbnail_status?: ThumbnailStatus | null;
}

export type NewProject = {
  title: string;
  description: string;
  image_url: string;
  project_url: string;
  tech_stack: string[];
  is_highlighted: boolean;
};

export type ProjectUploadFiles = {
  thumbnailFile?: File;
};
