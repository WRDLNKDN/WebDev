/**
 * Sortable list of portfolio items: resume (optional) + project cards.
 * Uses @dnd-kit for accessible drag-and-drop and keyboard reorder.
 * Whole card is draggable (no handle icon).
 */
import { Box } from '@mui/material';
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { RESUME_ITEM_ID, type PortfolioItem } from '../../types/portfolio';
import { ProjectCard } from './ProjectCard';

interface SortableCardProps {
  project: PortfolioItem;
  isOwner: boolean;
  canReorder: boolean;
  onMoveUp?: (projectId: string) => void;
  onMoveDown?: (projectId: string) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onEdit?: (project: PortfolioItem) => void | Promise<void>;
  onDelete?: (projectId: string) => void | Promise<void>;
  onToggleHighlight?: (
    projectId: string,
    isHighlighted: boolean,
  ) => void | Promise<void>;
  onOpenPreview?: (project: PortfolioItem) => void;
}

const SortableCard = ({
  project,
  isOwner,
  canReorder,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  onEdit,
  onDelete,
  onToggleHighlight,
  onOpenPreview,
}: SortableCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...(isOwner && canReorder ? { ...attributes, ...listeners } : {})}
      sx={{
        display: 'block',
        width: '100%',
        ...(isOwner && canReorder
          ? {
              cursor: 'grab',
              touchAction: 'none',
              '&:active': { cursor: 'grabbing' },
            }
          : {}),
      }}
      tabIndex={isOwner && canReorder ? 0 : undefined}
      role={isOwner && canReorder ? 'button' : undefined}
      aria-label={
        isOwner && canReorder
          ? `Drag to reorder ${project.title}. Use arrow keys to move, Space to drop.`
          : undefined
      }
    >
      <ProjectCard
        project={project}
        isOwner={isOwner}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleHighlight={onToggleHighlight}
        onOpenPreview={onOpenPreview}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
      />
    </Box>
  );
};

interface SortableResumeCardProps {
  renderResumeCard: (dragHandle: React.ReactNode) => React.ReactNode;
  canReorder: boolean;
}

const SortableResumeCard = ({
  renderResumeCard,
  canReorder,
}: SortableResumeCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: RESUME_ITEM_ID });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...(canReorder ? { ...attributes, ...listeners } : {})}
      sx={{
        display: 'block',
        width: '100%',
        ...(canReorder
          ? {
              cursor: 'grab',
              touchAction: 'none',
              '&:active': { cursor: 'grabbing' },
            }
          : {}),
      }}
      tabIndex={canReorder ? 0 : undefined}
      role={canReorder ? 'button' : undefined}
      aria-label={
        canReorder
          ? 'Drag to reorder resume. Use arrow keys to move, Space to drop.'
          : undefined
      }
    >
      {renderResumeCard(undefined)}
    </Box>
  );
};

interface PortfolioSortableListProps {
  /** Ids in display order; may include RESUME_ITEM_ID when resume is present. */
  orderedIds: string[];
  projects: PortfolioItem[];
  /** When provided, the resume slot is included and rendered with this render prop (receives drag handle). */
  renderResumeCard?: (dragHandle: React.ReactNode) => React.ReactNode;
  isOwner: boolean;
  onReorder: (orderedIds: string[]) => void | Promise<void>;
  onEdit?: (project: PortfolioItem) => void | Promise<void>;
  onDelete?: (projectId: string) => void | Promise<void>;
  onToggleHighlight?: (
    projectId: string,
    isHighlighted: boolean,
  ) => void | Promise<void>;
  onOpenPreview?: (project: PortfolioItem) => void;
}

export const PortfolioSortableList = ({
  orderedIds,
  projects,
  renderResumeCard,
  isOwner,
  onReorder,
  onEdit,
  onDelete,
  onToggleHighlight,
  onOpenPreview,
}: PortfolioSortableListProps) => {
  const canReorder = isOwner && orderedIds.length > 1;
  const projectById = new Map(projects.map((p) => [p.id, p]));

  const moveItemByOffset = (id: string, offset: -1 | 1) => {
    if (!canReorder) return;
    const currentIndex = orderedIds.indexOf(id);
    if (currentIndex < 0) return;
    const nextIndex = currentIndex + offset;
    if (nextIndex < 0 || nextIndex >= orderedIds.length) return;
    const reordered = arrayMove(orderedIds, currentIndex, nextIndex);
    void onReorder(reordered);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (!canReorder) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedIds.indexOf(active.id as string);
    const newIndex = orderedIds.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(orderedIds, oldIndex, newIndex);
    void onReorder(reordered);
  };

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      accessibility={{
        announcements: {
          onDragStart: () =>
            'Picked up item. Use arrow keys to move, Space to drop.',
          onDragOver: ({ over }) =>
            over
              ? 'Over new position. Press Space to drop.'
              : 'No drop target.',
          onDragEnd: () => 'Reordered. New order saved.',
          onDragCancel: () => 'Reorder cancelled.',
        },
      }}
    >
      <SortableContext items={orderedIds} strategy={rectSortingStrategy}>
        <Box sx={{ display: 'contents' }}>
          {orderedIds.map((id, index) => {
            if (id === RESUME_ITEM_ID) {
              if (!renderResumeCard) return null;
              return (
                <SortableResumeCard
                  key={RESUME_ITEM_ID}
                  renderResumeCard={renderResumeCard}
                  canReorder={canReorder}
                />
              );
            }
            const project = projectById.get(id);
            if (!project) return null;
            return (
              <SortableCard
                key={project.id}
                project={project}
                isOwner={isOwner}
                canReorder={canReorder}
                onMoveUp={
                  canReorder
                    ? (projectId) => moveItemByOffset(projectId, -1)
                    : undefined
                }
                onMoveDown={
                  canReorder
                    ? (projectId) => moveItemByOffset(projectId, 1)
                    : undefined
                }
                canMoveUp={canReorder && index > 0}
                canMoveDown={canReorder && index < orderedIds.length - 1}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleHighlight={onToggleHighlight}
                onOpenPreview={onOpenPreview}
              />
            );
          })}
        </Box>
      </SortableContext>
    </DndContext>
  );
};
