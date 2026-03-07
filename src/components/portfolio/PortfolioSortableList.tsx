/**
 * Sortable list of portfolio project cards with drag handle.
 * Uses @dnd-kit for accessible drag-and-drop and keyboard reorder.
 */
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
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
import type { PortfolioItem } from '../../types/portfolio';
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
      sx={{ display: 'block', width: '100%' }}
    >
      <ProjectCard
        project={project}
        isOwner={isOwner}
        onEdit={onEdit}
        onDelete={onDelete}
        onOpenPreview={onOpenPreview}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
        dragHandle={
          isOwner && canReorder ? (
            <Box
              {...attributes}
              {...listeners}
              component="span"
              tabIndex={0}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: { xs: 36, md: 32 },
                height: { xs: 36, md: 32 },
                borderRadius: 1,
                color: 'text.secondary',
                cursor: 'grab',
                touchAction: 'none',
                '&:hover': { color: 'primary.main', bgcolor: 'action.hover' },
                '&:focus': {
                  outline: '2px solid',
                  outlineColor: 'primary.main',
                },
                '&:active': { cursor: 'grabbing' },
              }}
              aria-label={`Drag to reorder ${project.title}. Use arrow keys to move, Space to drop.`}
            >
              <DragIndicatorIcon fontSize="small" />
            </Box>
          ) : undefined
        }
      />
    </Box>
  );
};

interface PortfolioSortableListProps {
  projects: PortfolioItem[];
  isOwner: boolean;
  onReorder: (orderedIds: string[]) => void | Promise<void>;
  onEdit?: (project: PortfolioItem) => void | Promise<void>;
  onDelete?: (projectId: string) => void | Promise<void>;
  onOpenPreview?: (project: PortfolioItem) => void;
}

export const PortfolioSortableList = ({
  projects,
  isOwner,
  onReorder,
  onEdit,
  onDelete,
  onOpenPreview,
}: PortfolioSortableListProps) => {
  const canReorder = isOwner && projects.length > 1;
  const moveProjectByOffset = (projectId: string, offset: -1 | 1) => {
    if (!canReorder) return;
    const currentIndex = projects.findIndex((p) => p.id === projectId);
    if (currentIndex < 0) return;
    const nextIndex = currentIndex + offset;
    if (nextIndex < 0 || nextIndex >= projects.length) return;
    const reordered = arrayMove(projects, currentIndex, nextIndex);
    void onReorder(reordered.map((p) => p.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (!canReorder) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = projects.findIndex((p) => p.id === active.id);
    const newIndex = projects.findIndex((p) => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(projects, oldIndex, newIndex);
    void onReorder(reordered.map((p) => p.id));
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
            'Picked up project. Use arrow keys to move, Space to drop.',
          onDragOver: ({ over }) =>
            over
              ? 'Over new position. Press Space to drop.'
              : 'No drop target.',
          onDragEnd: () => 'Reordered. New order saved.',
          onDragCancel: () => 'Reorder cancelled.',
        },
      }}
    >
      <SortableContext
        items={projects.map((p) => p.id)}
        strategy={rectSortingStrategy}
      >
        <Box sx={{ display: 'contents' }}>
          {projects.map((project, index) => (
            <SortableCard
              key={project.id}
              project={project}
              isOwner={isOwner}
              canReorder={canReorder}
              onMoveUp={
                canReorder
                  ? (projectId) => moveProjectByOffset(projectId, -1)
                  : undefined
              }
              onMoveDown={
                canReorder
                  ? (projectId) => moveProjectByOffset(projectId, 1)
                  : undefined
              }
              canMoveUp={canReorder && index > 0}
              canMoveDown={canReorder && index < projects.length - 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onOpenPreview={onOpenPreview}
            />
          ))}
        </Box>
      </SortableContext>
    </DndContext>
  );
};
