import { Feed } from '../feed/Feed';

/**
 * Saved posts list. Reuses Feed with savedMode (same layout, saved feed only, no composer).
 */
export const SavedPage = () => <Feed savedMode />;
