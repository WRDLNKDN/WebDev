import type { SxProps, Theme } from '@mui/material';
import { Paper } from '@mui/material';
import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { CANDY_BLUEY } from '../../../theme/candyStyles';
import { getLinkType } from '../../../lib/portfolio/linkUtils';
import type { PortfolioItem } from '../../../types/portfolio';
import {
  ProjectCardActions,
  ProjectCardContent,
  ProjectCardMedia,
} from './projectCardParts';

function isExternalUrl(url: string): boolean {
  const t = url.trim();
  return t.startsWith('http://') || t.startsWith('https://');
}

interface ProjectCardProps {
  project: PortfolioItem;
  variant?: 'compact' | 'showcase';
  isOwner?: boolean;
  onEdit?: (project: PortfolioItem) => void | Promise<void>;
  onDelete?: (projectId: string) => void | Promise<void>;
  onToggleHighlight?: (
    projectId: string,
    isHighlighted: boolean,
  ) => void | Promise<void>;
  onOpenPreview?: (project: PortfolioItem) => void;
  dragHandle?: ReactNode;
  onMoveUp?: (projectId: string) => void;
  onMoveDown?: (projectId: string) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

export const ProjectCard = ({
  project,
  variant = 'compact',
  isOwner,
  onEdit,
  onDelete,
  onToggleHighlight,
  onOpenPreview,
  dragHandle,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
}: ProjectCardProps) => {
  const isShowcase = variant === 'showcase';
  const showArrowControls = onMoveUp != null || onMoveDown != null;
  const url = project.project_url?.trim() ?? '';
  const external = url && isExternalUrl(url);
  const cardOpensArtifact = isShowcase && Boolean(url) && !onOpenPreview;
  const cardIsInteractive =
    !isOwner && (Boolean(onOpenPreview) || cardOpensArtifact);

  const openArtifact = () => {
    if (!url) return;
    if (external) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    window.location.assign(url);
  };

  const linkType = url ? getLinkType(url) : 'unsupported';
  const resolvedType = (project.resolved_type as string) || linkType;
  const artifactHost = (() => {
    if (!external || !url) return null;
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return null;
    }
  })();

  const hasManualImage = Boolean(project.image_url);
  const thumbnailUrl = hasManualImage
    ? project.image_url
    : project.thumbnail_url || (resolvedType === 'image' ? url : null);

  const categories = (project.tech_stack ?? [])
    .map((tag) => String(tag).trim())
    .filter(Boolean)
    .slice(0, 4);

  return (
    <Paper
      {...(onOpenPreview ? { component: 'div' as const } : {})}
      role={cardIsInteractive ? (onOpenPreview ? 'button' : 'link') : undefined}
      tabIndex={cardIsInteractive ? 0 : undefined}
      onClick={
        cardIsInteractive
          ? (e: MouseEvent<HTMLDivElement>) => {
              if ((e.target as HTMLElement).closest('a, button')) return;
              if (onOpenPreview) {
                onOpenPreview(project);
                return;
              }
              openArtifact();
            }
          : undefined
      }
      onKeyDown={
        cardIsInteractive
          ? (e: KeyboardEvent<HTMLDivElement>) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (onOpenPreview) {
                  onOpenPreview(project);
                  return;
                }
                openArtifact();
              }
            }
          : undefined
      }
      sx={
        [
          CANDY_BLUEY,
          {
            width: '100%',
            maxWidth: isShowcase ? 'none' : { xs: '100%', sm: 360 },
            minHeight: isShowcase ? { xs: 0, md: 0 } : { xs: 200, md: 220 },
            height: isShowcase ? '100%' : { xs: 200, md: 220 },
            borderRadius: 3,
            scrollSnapAlign: 'start',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            ...(cardIsInteractive ? { cursor: 'pointer' as const } : {}),
          },
        ] as SxProps<Theme>
      }
    >
      <ProjectCardMedia
        thumbnailUrl={thumbnailUrl}
        title={project.title}
        isShowcase={isShowcase}
      />

      <ProjectCardContent
        project={project}
        categories={categories}
        isShowcase={isShowcase}
        resolvedType={resolvedType}
        artifactHost={artifactHost}
        onOpenPreview={onOpenPreview}
        cardOpensArtifact={cardOpensArtifact}
      />

      {url && (
        <ProjectCardActions
          url={url}
          external={Boolean(external)}
          project={project}
          onOpenPreview={onOpenPreview}
          dragHandle={dragHandle}
          showArrowControls={showArrowControls}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
          onEdit={isOwner ? onEdit : undefined}
          onToggleHighlight={isOwner ? onToggleHighlight : undefined}
          onDelete={isOwner ? onDelete : undefined}
        />
      )}
    </Paper>
  );
};
