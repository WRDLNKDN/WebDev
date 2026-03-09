import type { IndustryGroup } from '../../../types/profile';

export type EditProfileFormData = {
  handle: string;
  pronouns: string;
  bio: string;
  skills: string;
  industries: IndustryGroup[];
  niche_field: string;
  location: string;
  profile_visibility: 'members_only' | 'connections_only';
};
