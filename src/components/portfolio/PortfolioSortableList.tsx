/**
 * Sortable list of portfolio project cards with drag handle.
 * Uses @dnd-kit for accessible drag-and-drop and keyboard reorder.
 */
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { Box } from '@mui/material';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { PortfolioItem } from '../../types/portfolio';
import { ProjectCard } from './ProjectCard';

interface SortableCardProps {
  project: PortfolioItem;
  isOwner: boolean;
  onEdit?: (project: PortfolioItem) => void | Promise<void>;
  onDelete?: (projectId: string) => void | Promise<void>;
  onOpenPreview?: (project: PortfolioItem) => void;
}

const SortableCard = ({
  project,
  isOwner,
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
    <Box ref={setNodeRef} style={style} sx={{ display: 'inline-block' }}>
      <ProjectCard
        project={project}
        isOwner={isOwner}
        onEdit={onEdit}
        onDelete={onDelete}
        onOpenPreview={onOpenPreview}
        dragHandle={
          isOwner ? (
            <Box
              {...attributes}
              {...listeners}
              component="span"
              tabIndex={0}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
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
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = projects.findIndex((p) => p.id === active.id);
    const newIndex = projects.findIndex((p) => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(projects, oldIndex, newIndex);
    void onReorder(reordered.map((p) => p.id));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
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
        strategy={verticalListSortingStrategy}
      >
        <Box sx={{ display: 'contents' }}>
          {projects.map((project) => (
            <SortableCard
              key={project.id}
              project={project}
              isOwner={isOwner}
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
