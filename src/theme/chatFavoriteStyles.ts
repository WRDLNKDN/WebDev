/** Shared star / favorite affordances for chat room lists and overlay (mobile + desktop). */
export const CHAT_FAVORITE_ACTIVE_BUTTON_SX = {
  color: '#ffc947',
  bgcolor: 'rgba(255, 201, 71, 0.24)',
  border: '1px solid rgba(255, 201, 71, 0.5)',
  boxShadow:
    '0 0 0 1px rgba(255, 201, 71, 0.12) inset, 0 0 12px rgba(255, 201, 71, 0.18)',
  '&:hover': {
    bgcolor: 'rgba(255, 201, 71, 0.3)',
    borderColor: 'rgba(255, 201, 71, 0.62)',
  },
} as const;

export const CHAT_FAVORITE_IDLE_BUTTON_SX = {
  color: 'text.secondary',
  opacity: 0.72,
  border: '1px solid transparent',
  '&:hover': {
    opacity: 1,
    color: '#ffc947',
    bgcolor: 'rgba(255, 201, 71, 0.1)',
    borderColor: 'rgba(255, 201, 71, 0.2)',
  },
} as const;

export const CHAT_FAVORITE_ROW_BADGE_SX = {
  fontSize: 15,
  color: '#ffc947',
  flexShrink: 0,
  filter: 'drop-shadow(0 0 10px rgba(255, 201, 71, 0.45))',
} as const;

export const CHAT_FAVORITE_ICON_BUTTON_STAR_SX = {
  fontSize: '1.125rem',
  filter: 'drop-shadow(0 0 6px rgba(255, 201, 71, 0.35))',
} as const;
