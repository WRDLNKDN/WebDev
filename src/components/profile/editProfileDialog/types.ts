import type { IndustryGroup } from '../../../types/profile';

export type EditProfileFormData = {
  handle: string;
  pronouns: string;
  bio: string;
  skills: string;
  /** Up to 8 interests (taxonomy + custom Other). Persisted to nerd_creds.interests. */
  interests: string[];
  industries: IndustryGroup[];
  niche_field: string;
  location: string;
  profile_visibility: 'members_only' | 'connections_only';
};
