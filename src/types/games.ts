/**
 * Game Session Framework types.
 * Shared infrastructure for Phuzzle, Hangman, Tic-Tac-Toe, and future games.
 */

export type GameSessionStatus =
  | 'draft'
  | 'pending_invitation'
  | 'active'
  | 'waiting_players'
  | 'waiting_your_move'
  | 'waiting_opponent_move'
  | 'completed'
  | 'declined'
  | 'canceled'
  | 'expired';

export type GameCompletionResult =
  | 'winner'
  | 'loser'
  | 'draw'
  | 'solved'
  | 'failed'
  | 'abandoned';

export type GameInvitationStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'canceled'
  | 'expired';

export type ParticipantRole = 'creator' | 'invitee' | 'player';
export type AcceptanceState = 'pending' | 'accepted' | 'declined';

export type GameEventType = 'move' | 'turn_advance' | 'completion' | 'system';

export interface GameDefinition {
  id: string;
  game_type: string;
  name: string;
  min_players: number;
  max_players: number;
  is_solo_capable: boolean;
  is_multiplayer_capable: boolean;
  status: 'active' | 'deprecated';
  capabilities: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface GameSession {
  id: string;
  game_definition_id: string;
  created_by: string;
  status: GameSessionStatus;
  state_payload: Record<string, unknown>;
  result: GameCompletionResult | null;
  created_at: string;
  updated_at: string;
  game_definition?: GameDefinition;
  participants?: GameSessionParticipant[];
  invitations?: GameInvitation[];
}

export interface GameSessionParticipant {
  id: string;
  session_id: string;
  user_id: string;
  role: ParticipantRole;
  acceptance_state: AcceptanceState;
  turn_order_position: number | null;
  created_at: string;
  updated_at: string;
}

export interface GameInvitation {
  id: string;
  session_id: string;
  sender_id: string;
  recipient_id: string;
  status: GameInvitationStatus;
  created_at: string;
  updated_at: string;
}

export interface GameEvent {
  id: string;
  session_id: string;
  event_type: GameEventType;
  actor_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export type GameNotificationType =
  | 'game_invite'
  | 'game_invite_accepted'
  | 'game_invite_declined'
  | 'game_invite_canceled'
  | 'game_your_turn'
  | 'game_completed';
