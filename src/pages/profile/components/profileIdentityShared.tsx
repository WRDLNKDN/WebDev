import { IdentityHeader } from '../../../components/profile/identity/IdentityHeader';
import { IndustryGroupBlock } from '../../../components/profile/identity/IndustryGroupBlock';
import { SkillsInterestsPills } from '../../../components/profile/identity/SkillsInterestsPills';
import type { IndustryGroup } from '../../../types/profile';
import type { ReactNode } from 'react';

type CommonProfileThreeColumnIdentityProps = {
  displayName: string;
  memberHandle?: string | null;
  tagline?: string | null;
  bio: string;
  bioIsPlaceholder?: boolean;
  avatarUrl?: string | null;
  industryGroups: IndustryGroup[];
  nicheField: string | null;
  actions?: ReactNode;
  onAddBio?: () => void;
  paperMaxWidth?: number | string;
};

/** Landing / public profile: status + default skills/interests pills. */
type ProfileThreeColumnWithPills = CommonProfileThreeColumnIdentityProps & {
  statusEmoji: string;
  statusMessage: string;
  selectedSkills: string[];
  selectedInterests?: string[];
};

/** Dashboard (and similar): custom badges column (pills + rewards + editors). */
type ProfileThreeColumnWithBadges = CommonProfileThreeColumnIdentityProps & {
  badges: ReactNode;
  statusEmoji?: string;
  statusMessage?: string;
};

export type ProfileThreeColumnIdentityHeaderProps =
  | ProfileThreeColumnWithPills
  | ProfileThreeColumnWithBadges;

/**
 * Shared three-column identity header (avatar | bio + badges | industries) for
 * landing, public profile, and dashboard surfaces.
 */
export const ProfileThreeColumnIdentityHeader = (
  props: ProfileThreeColumnIdentityHeaderProps,
) => {
  const {
    displayName,
    memberHandle,
    tagline,
    bio,
    bioIsPlaceholder = false,
    avatarUrl,
    industryGroups,
    nicheField,
    actions,
    onAddBio,
    paperMaxWidth,
  } = props;

  const badges: ReactNode =
    'badges' in props ? (
      props.badges
    ) : (
      <SkillsInterestsPills
        skills={props.selectedSkills}
        interests={props.selectedInterests ?? []}
      />
    );

  return (
    <IdentityHeader
      layoutVariant="three-column"
      displayName={displayName}
      memberHandle={memberHandle?.trim() || undefined}
      tagline={tagline ?? undefined}
      bio={bio}
      bioIsPlaceholder={bioIsPlaceholder}
      avatarUrl={avatarUrl ?? undefined}
      statusEmoji={props.statusEmoji}
      statusMessage={props.statusMessage}
      badges={badges}
      rightColumn={
        industryGroups.length > 0 || nicheField ? (
          <IndustryGroupBlock groups={industryGroups} nicheField={nicheField} />
        ) : undefined
      }
      actions={actions}
      onAddBio={onAddBio}
      paperMaxWidth={paperMaxWidth}
    />
  );
};
