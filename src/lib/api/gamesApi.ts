/**
 * Game Session Framework API.
 * Create sessions, invitations, accept/decline/cancel, persist state, append events.
 */
import { supabase } from '../auth/supabaseClient';
import type {
  GameDefinition,
  GameSession,
  GameInvitation,
  GameEvent,
  GameSessionStatus,
} from '../../types/games';

const SESSIONS_PAGE_SIZE = 50;

export async function fetchGameDefinitions(): Promise<GameDefinition[]> {
  const { data, error } = await supabase
    .from('game_definitions')
    .select('*')
    .eq('status', 'active')
    .order('game_type');
  if (error) throw error;
  return (data ?? []) as GameDefinition[];
}

export async function fetchGameDefinitionByType(
  gameType: string,
): Promise<GameDefinition | null> {
  const { data, error } = await supabase
    .from('game_definitions')
    .select('*')
    .eq('game_type', gameType)
    .eq('status', 'active')
    .maybeSingle();
  if (error) throw error;
  return data as GameDefinition | null;
}

export async function fetchMySessions(options?: {
  statuses?: GameSessionStatus[];
  limit?: number;
}): Promise<GameSession[]> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user?.id;
  if (!userId) return [];

  const limit = options?.limit ?? SESSIONS_PAGE_SIZE;

  const { data: participantRows } = await supabase
    .from('game_session_participants')
    .select('session_id')
    .eq('user_id', userId);
  const sessionIds = (participantRows ?? []).map((r) => r.session_id);

  const { data: createdRows } = await supabase
    .from('game_sessions')
    .select('id')
    .eq('created_by', userId);
  const createdIds = (createdRows ?? []).map((r) => r.id);

  const allIds = [...new Set([...sessionIds, ...createdIds])];
  if (allIds.length === 0) return [];

  let query = supabase
    .from('game_sessions')
    .select(
      `
      *,
      game_definition:game_definitions(*),
      participants:game_session_participants(*),
      invitations:game_invitations(*)
    `,
    )
    .in('id', allIds)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (options?.statuses?.length) {
    query = query.in('status', options.statuses);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as GameSession[];
}

export async function fetchSessionById(
  sessionId: string,
): Promise<GameSession | null> {
  const { data, error } = await supabase
    .from('game_sessions')
    .select(
      `
      *,
      game_definition:game_definitions(*),
      participants:game_session_participants(*),
      invitations:game_invitations(*)
    `,
    )
    .eq('id', sessionId)
    .maybeSingle();
  if (error) throw error;
  return data as GameSession | null;
}

export async function createSoloSession(
  gameDefinitionId: string,
  initialState: Record<string, unknown> = {},
): Promise<GameSession> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user?.id;
  if (!userId) throw new Error('Not authenticated');

  const { data: sessionRow, error: sessionError } = await supabase
    .from('game_sessions')
    .insert({
      game_definition_id: gameDefinitionId,
      created_by: userId,
      status: 'active',
      state_payload: initialState,
    })
    .select(
      `
      *,
      game_definition:game_definitions(*)
    `,
    )
    .single();
  if (sessionError) throw sessionError;

  await supabase.from('game_session_participants').insert({
    session_id: sessionRow.id,
    user_id: userId,
    role: 'creator',
    acceptance_state: 'accepted',
    turn_order_position: 0,
  });

  return sessionRow as GameSession;
}

export async function createMultiplayerSessionWithInvite(
  gameDefinitionId: string,
  recipientId: string,
  initialState: Record<string, unknown> = {},
): Promise<{ session: GameSession; invitation: GameInvitation }> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user?.id;
  if (!userId) throw new Error('Not authenticated');
  if (recipientId === userId) throw new Error('Cannot invite yourself');

  const { data: sessionRow, error: sessionError } = await supabase
    .from('game_sessions')
    .insert({
      game_definition_id: gameDefinitionId,
      created_by: userId,
      status: 'pending_invitation',
      state_payload: initialState,
    })
    .select(
      `
      *,
      game_definition:game_definitions(*)
    `,
    )
    .single();
  if (sessionError) throw sessionError;

  await supabase.from('game_session_participants').insert([
    {
      session_id: sessionRow.id,
      user_id: userId,
      role: 'creator',
      acceptance_state: 'accepted',
      turn_order_position: 0,
    },
    {
      session_id: sessionRow.id,
      user_id: recipientId,
      role: 'invitee',
      acceptance_state: 'pending',
      turn_order_position: 1,
    },
  ]);

  const { data: invRow, error: invError } = await supabase
    .from('game_invitations')
    .insert({
      session_id: sessionRow.id,
      sender_id: userId,
      recipient_id: recipientId,
      status: 'pending',
    })
    .select()
    .single();
  if (invError) throw invError;

  return {
    session: sessionRow as GameSession,
    invitation: invRow as GameInvitation,
  };
}

export async function createMultiplayerSessionWithInvites(
  gameDefinitionId: string,
  recipientIds: string[],
  initialState: Record<string, unknown> = {},
): Promise<{ session: GameSession; invitations: GameInvitation[] }> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user?.id;
  if (!userId) throw new Error('Not authenticated');
  const uniqueRecipients = [...new Set(recipientIds)].filter(
    (id) => id !== userId,
  );
  if (uniqueRecipients.length === 0)
    throw new Error('At least one other recipient required');

  const { data: sessionRow, error: sessionError } = await supabase
    .from('game_sessions')
    .insert({
      game_definition_id: gameDefinitionId,
      created_by: userId,
      status: 'pending_invitation',
      state_payload: initialState,
    })
    .select(
      `
      *,
      game_definition:game_definitions(*)
    `,
    )
    .single();
  if (sessionError) throw sessionError;

  await supabase.from('game_session_participants').insert([
    {
      session_id: sessionRow.id,
      user_id: userId,
      role: 'creator',
      acceptance_state: 'accepted',
      turn_order_position: 0,
    },
    ...uniqueRecipients.map((recipientId, i) => ({
      session_id: sessionRow.id,
      user_id: recipientId,
      role: 'invitee' as const,
      acceptance_state: 'pending' as const,
      turn_order_position: i + 1,
    })),
  ]);

  const { data: invRows, error: invError } = await supabase
    .from('game_invitations')
    .insert(
      uniqueRecipients.map((recipientId) => ({
        session_id: sessionRow.id,
        sender_id: userId,
        recipient_id: recipientId,
        status: 'pending',
      })),
    )
    .select();
  if (invError) throw invError;

  return {
    session: sessionRow as GameSession,
    invitations: (invRows ?? []) as GameInvitation[],
  };
}

export async function acceptInvitation(invitationId: string): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user?.id;
  if (!userId) throw new Error('Not authenticated');

  const { data: inv, error: invFetchError } = await supabase
    .from('game_invitations')
    .select('session_id, recipient_id')
    .eq('id', invitationId)
    .eq('recipient_id', userId)
    .eq('status', 'pending')
    .single();
  if (invFetchError || !inv)
    throw new Error('Invitation not found or not pending');

  await supabase
    .from('game_invitations')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', invitationId);

  await supabase
    .from('game_session_participants')
    .update({
      acceptance_state: 'accepted',
      updated_at: new Date().toISOString(),
    })
    .eq('session_id', inv.session_id)
    .eq('user_id', userId);

  await supabase
    .from('game_sessions')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('id', inv.session_id);

  const { data: sessionRow } = await supabase
    .from('game_sessions')
    .select('game_definition:game_definitions(game_type)')
    .eq('id', inv.session_id)
    .single();
  const gameType = (
    sessionRow?.game_definition as { game_type?: string } | null
  )?.game_type;
  if (gameType === 'tic_tac_toe') {
    const emptyBoard = Array.from({ length: 9 }, () => '');
    await updateSessionState(
      inv.session_id,
      {
        board: emptyBoard,
        currentTurnPosition: 0,
      },
      'waiting_your_move',
    );
  }
  if (gameType === 'connect_four') {
    const emptyBoard = Array.from({ length: 6 }, () =>
      Array.from({ length: 7 }, () => ''),
    );
    await updateSessionState(
      inv.session_id,
      {
        board: emptyBoard,
        currentTurnPosition: 0,
      },
      'waiting_your_move',
    );
  }
  if (gameType === 'checkers') {
    const checkersBoard = [
      ['', 'o', '', 'o', '', 'o', '', 'o'],
      ['o', '', 'o', '', 'o', '', 'o', ''],
      ['', 'o', '', 'o', '', 'o', '', 'o'],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['x', '', 'x', '', 'x', '', 'x', ''],
      ['', 'x', '', 'x', '', 'x', '', 'x'],
      ['x', '', 'x', '', 'x', '', 'x', ''],
    ];
    await updateSessionState(
      inv.session_id,
      {
        board: checkersBoard,
        currentTurnPosition: 0,
      },
      'waiting_your_move',
    );
  }
  if (gameType === 'trivia') {
    const { data: existing } = await supabase
      .from('game_sessions')
      .select('state_payload')
      .eq('id', inv.session_id)
      .single();
    const state = (existing?.state_payload as Record<string, unknown>) ?? {};
    const scores = (state.scores as Record<string, number>) ?? {};
    if (typeof userId === 'string' && !(userId in scores)) {
      scores[userId] = 0;
      await updateSessionState(inv.session_id, { scores });
    }
  }
  if (gameType === 'two_truths_lie') {
    const { data: existing } = await supabase
      .from('game_sessions')
      .select('state_payload')
      .eq('id', inv.session_id)
      .single();
    const state = (existing?.state_payload as Record<string, unknown>) ?? {};
    const scores = (state.scores as Record<string, number>) ?? {};
    if (typeof userId === 'string' && !(userId in scores)) {
      scores[userId] = 0;
      await updateSessionState(inv.session_id, { scores });
    }
  }
  if (gameType === 'darts') {
    const { data: existing } = await supabase
      .from('game_sessions')
      .select('state_payload')
      .eq('id', inv.session_id)
      .single();
    const state = (existing?.state_payload as Record<string, unknown>) ?? {};
    const scores = (state.scores as Record<string, number>) ?? {};
    const startingScore =
      typeof state.startingScore === 'number' ? state.startingScore : 501;
    if (typeof userId === 'string' && !(userId in scores)) {
      scores[userId] = startingScore;
      await updateSessionState(inv.session_id, { scores });
    }
  }
  if (gameType === 'battleship') {
    const { data: existing } = await supabase
      .from('game_sessions')
      .select('state_payload')
      .eq('id', inv.session_id)
      .single();
    const state = (existing?.state_payload as Record<string, unknown>) ?? {};
    if (!state.phase) {
      await updateSessionState(inv.session_id, {
        phase: 'placing',
        creatorShips: [],
        inviteeShips: [],
        creatorShots: [],
        inviteeShots: [],
        currentTurnPosition: 0,
      });
    }
  }
  if (gameType === 'scrabble') {
    const { data: existing } = await supabase
      .from('game_sessions')
      .select('state_payload')
      .eq('id', inv.session_id)
      .single();
    const state = (existing?.state_payload as Record<string, unknown>) ?? {};
    if (!state.phase) {
      await updateSessionState(inv.session_id, { phase: 'waiting_players' });
    }
  }
  if (gameType === 'chess') {
    const { data: existing } = await supabase
      .from('game_sessions')
      .select('state_payload')
      .eq('id', inv.session_id)
      .single();
    const state = (existing?.state_payload as Record<string, unknown>) ?? {};
    if (!state.phase) {
      await updateSessionState(inv.session_id, { phase: 'waiting_players' });
    }
  }
  if (gameType === 'reversi') {
    const reversiBoard = [
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', 'X', 'O', '', '', ''],
      ['', '', '', 'O', 'X', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
    ];
    await updateSessionState(
      inv.session_id,
      {
        board: reversiBoard,
        currentTurnPosition: 0,
      },
      'waiting_your_move',
    );
  }
}

export async function declineInvitation(invitationId: string): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user?.id;
  if (!userId) throw new Error('Not authenticated');

  const { data: inv } = await supabase
    .from('game_invitations')
    .select('session_id, recipient_id')
    .eq('id', invitationId)
    .eq('recipient_id', userId)
    .eq('status', 'pending')
    .single();
  if (!inv) throw new Error('Invitation not found or not pending');

  await supabase
    .from('game_invitations')
    .update({ status: 'declined', updated_at: new Date().toISOString() })
    .eq('id', invitationId);

  await supabase
    .from('game_session_participants')
    .update({
      acceptance_state: 'declined',
      updated_at: new Date().toISOString(),
    })
    .eq('session_id', inv.session_id)
    .eq('user_id', userId);

  await supabase
    .from('game_sessions')
    .update({ status: 'declined', updated_at: new Date().toISOString() })
    .eq('id', inv.session_id);
}

export async function cancelInvitation(invitationId: string): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user?.id;
  if (!userId) throw new Error('Not authenticated');

  const { data: inv } = await supabase
    .from('game_invitations')
    .select('session_id, sender_id')
    .eq('id', invitationId)
    .eq('sender_id', userId)
    .eq('status', 'pending')
    .single();
  if (!inv) throw new Error('Invitation not found or not yours to cancel');

  await supabase
    .from('game_invitations')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('id', invitationId);

  await supabase
    .from('game_sessions')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('id', inv.session_id);
}

export async function updateSessionState(
  sessionId: string,
  statePatch: Record<string, unknown>,
  status?: GameSessionStatus,
): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user?.id;
  if (!userId) throw new Error('Not authenticated');

  const updates: {
    state_payload?: Record<string, unknown>;
    status?: GameSessionStatus;
    updated_at: string;
  } = {
    updated_at: new Date().toISOString(),
  };
  if (Object.keys(statePatch).length) {
    const { data: existing } = await supabase
      .from('game_sessions')
      .select('state_payload')
      .eq('id', sessionId)
      .single();
    const current = (existing?.state_payload as Record<string, unknown>) ?? {};
    updates.state_payload = { ...current, ...statePatch };
  }
  if (status) updates.status = status;

  const { error } = await supabase
    .from('game_sessions')
    .update(updates)
    .eq('id', sessionId);
  if (error) throw error;
}

export async function appendGameEvent(
  sessionId: string,
  eventType: 'move' | 'turn_advance' | 'completion' | 'system',
  payload: Record<string, unknown> = {},
  actorId?: string | null,
): Promise<GameEvent> {
  const { data, error } = await supabase
    .from('game_events')
    .insert({
      session_id: sessionId,
      event_type: eventType,
      actor_id: actorId ?? null,
      payload,
    })
    .select()
    .single();
  if (error) throw error;
  return data as GameEvent;
}

export async function setCurrentTurn(
  sessionId: string,
  participantUserId: string,
): Promise<void> {
  const { data: participants } = await supabase
    .from('game_session_participants')
    .select('id, user_id, turn_order_position')
    .eq('session_id', sessionId)
    .order('turn_order_position');
  if (!participants?.length) return;

  const nextIndex =
    participants.findIndex((p) => p.user_id === participantUserId) + 1;
  const next = participants[nextIndex >= participants.length ? 0 : nextIndex];
  if (!next) return;

  const { data: me } = await supabase.auth.getSession();
  const myId = me.session?.user?.id;
  const isMyTurn = next.user_id === myId;

  await supabase
    .from('game_sessions')
    .update({
      status: isMyTurn ? 'waiting_your_move' : 'waiting_opponent_move',
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);
}

export async function completeSession(
  sessionId: string,
  result: 'winner' | 'loser' | 'draw' | 'solved' | 'failed' | 'abandoned',
  statePatch?: Record<string, unknown>,
): Promise<void> {
  const updates: Record<string, unknown> = {
    status: 'completed',
    result,
    updated_at: new Date().toISOString(),
  };
  if (statePatch && Object.keys(statePatch).length) {
    const { data: existing } = await supabase
      .from('game_sessions')
      .select('state_payload')
      .eq('id', sessionId)
      .single();
    const current = (existing?.state_payload as Record<string, unknown>) ?? {};
    updates.state_payload = { ...current, ...statePatch };
  }
  const { error } = await supabase
    .from('game_sessions')
    .update(updates)
    .eq('id', sessionId);
  if (error) throw error;
}

export async function fetchPendingInvitationsForUser(
  userId: string,
): Promise<GameInvitation[]> {
  const { data, error } = await supabase
    .from('game_invitations')
    .select('*')
    .eq('recipient_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as GameInvitation[];
}

export async function makeTicTacToeMove(
  sessionId: string,
  cellIndex: number,
): Promise<void> {
  const { error } = await supabase.rpc('make_tic_tac_toe_move', {
    p_session_id: sessionId,
    p_cell_index: cellIndex,
  });
  if (error) throw error;
}

export async function makeConnectFourMove(
  sessionId: string,
  columnIndex: number,
): Promise<void> {
  const { error } = await supabase.rpc('make_connect_four_move', {
    p_session_id: sessionId,
    p_column: columnIndex,
  });
  if (error) throw error;
}

export async function makeCheckersMove(
  sessionId: string,
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number,
): Promise<void> {
  const { error } = await supabase.rpc('make_checkers_move', {
    p_session_id: sessionId,
    p_from_r: fromRow,
    p_from_c: fromCol,
    p_to_r: toRow,
    p_to_c: toCol,
  });
  if (error) throw error;
}

export async function createSnakeSession(): Promise<GameSession> {
  const def = await fetchGameDefinitionByType('snake');
  if (!def) throw new Error('Snake is not available');
  return createSoloSession(def.id, { score: 0 });
}

export async function createSlotsSession(): Promise<GameSession> {
  const def = await fetchGameDefinitionByType('slots');
  if (!def) throw new Error('Slots is not available');
  return createSoloSession(def.id, {});
}

export async function createTetrisSession(): Promise<GameSession> {
  const def = await fetchGameDefinitionByType('tetris');
  if (!def) throw new Error('Tetris is not available');
  return createSoloSession(def.id, { score: 0, level: 1 });
}

export async function createMazeChaseSession(): Promise<GameSession> {
  const def = await fetchGameDefinitionByType('maze_chase');
  if (!def) throw new Error('Maze Chase is not available');
  return createSoloSession(def.id, { score: 0, lives: 3 });
}

export async function createBlackjackSession(): Promise<GameSession> {
  const def = await fetchGameDefinitionByType('blackjack');
  if (!def) throw new Error('Blackjack is not available');
  return createSoloSession(def.id, {});
}

export type PoolBallState = {
  id: string;
  x: number;
  y: number;
  pocketed: boolean;
};

export type PoolStatePayload = {
  shots?: number;
  sunk?: number;
  cueBall?: { x: number; y: number };
  balls?: PoolBallState[];
  status?: 'aiming' | 'shooting' | 'won';
};

const POOL_CUE_START = { x: 170, y: 210 };
const POOL_BALL_RADIUS = 12;

function getDefaultPoolBalls(): PoolBallState[] {
  const startX = 490;
  const startY = 210;
  const spacing = POOL_BALL_RADIUS * 2 + 2;
  return [
    { id: 'one', x: startX, y: startY, pocketed: false },
    {
      id: 'two',
      x: startX + spacing,
      y: startY - POOL_BALL_RADIUS - 1,
      pocketed: false,
    },
    {
      id: 'three',
      x: startX + spacing,
      y: startY + POOL_BALL_RADIUS + 1,
      pocketed: false,
    },
    {
      id: 'four',
      x: startX + spacing * 2,
      y: startY - spacing,
      pocketed: false,
    },
    { id: 'five', x: startX + spacing * 2, y: startY, pocketed: false },
    {
      id: 'six',
      x: startX + spacing * 2,
      y: startY + spacing,
      pocketed: false,
    },
  ];
}

export async function createPoolSession(): Promise<GameSession> {
  const def = await fetchGameDefinitionByType('pool');
  if (!def) throw new Error('Pool is not available');
  return createSoloSession(def.id, {
    shots: 0,
    sunk: 0,
    cueBall: POOL_CUE_START,
    balls: getDefaultPoolBalls(),
    status: 'aiming',
  });
}

export type DailyWordStatePayload = {
  puzzleDate?: string;
  guesses?: Array<{
    word: string;
    hints: ('correct' | 'present' | 'absent')[];
  }>;
};

export async function getOrCreateDailyWordSession(): Promise<GameSession> {
  const def = await fetchGameDefinitionByType('daily_word');
  if (!def) throw new Error('Daily Word is not available');
  const { data: sessionId, error } = await supabase.rpc(
    'get_or_create_daily_word_session',
  );
  if (error) throw error;
  const session = await fetchSessionById(sessionId as string);
  if (!session) throw new Error('Failed to load session');
  return session;
}

export async function submitDailyWordGuess(
  sessionId: string,
  guess: string,
): Promise<{
  hints: ('correct' | 'present' | 'absent')[];
  win: boolean;
  gameOver: boolean;
  attemptsUsed: number;
}> {
  const { data, error } = await supabase.rpc('submit_daily_word_guess', {
    p_session_id: sessionId,
    p_guess: guess.trim().toLowerCase(),
  });
  if (error) throw error;
  return data as {
    hints: ('correct' | 'present' | 'absent')[];
    win: boolean;
    gameOver: boolean;
    attemptsUsed: number;
  };
}

export type Game2048StatePayload = {
  board?: number[][];
  score?: number;
};

export async function create2048Session(): Promise<GameSession> {
  const def = await fetchGameDefinitionByType('2048');
  if (!def) throw new Error('2048 is not available');
  const board = createEmpty2048Board();
  spawn2048Tile(board);
  spawn2048Tile(board);
  return createSoloSession(def.id, { board, score: 0 });
}

function createEmpty2048Board(): number[][] {
  return Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => 0));
}

function getEmptyCells(board: number[][]): [number, number][] {
  const out: [number, number][] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c] === 0) out.push([r, c]);
    }
  }
  return out;
}

export function spawn2048Tile(board: number[][]): void {
  const empty = getEmptyCells(board);
  if (empty.length === 0) return;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  board[r][c] = Math.random() < 0.9 ? 2 : 4;
}

export async function fetchRandomHangmanWord(): Promise<string> {
  const { data, error } = await supabase.rpc('get_random_hangman_word');
  if (error) throw error;
  if (typeof data !== 'string' || !data) throw new Error('No word available');
  return data.toLowerCase();
}

export type HangmanStatePayload = {
  word?: string;
  guessedLetters?: string[];
  wrongCount?: number;
  maxWrong?: number;
};

export async function createHangmanSession(): Promise<GameSession> {
  const def = await fetchGameDefinitionByType('hangman');
  if (!def) throw new Error('Hangman is not available');
  const word = await fetchRandomHangmanWord();
  return createSoloSession(def.id, {
    word,
    guessedLetters: [],
    wrongCount: 0,
    maxWrong: 6,
  });
}

export async function makeHangmanGuess(
  sessionId: string,
  letter: string,
): Promise<void> {
  const normalized = letter.toLowerCase().trim();
  if (normalized.length !== 1 || !/^[a-z]$/.test(normalized)) {
    throw new Error('Guess a single letter a–z');
  }

  const session = await fetchSessionById(sessionId);
  if (!session) throw new Error('Game not found');
  const def = session.game_definition as { game_type?: string } | undefined;
  if (def?.game_type !== 'hangman') throw new Error('Not a Hangman game');
  if (session.status === 'completed') throw new Error('Game already finished');

  const state = (session.state_payload ?? {}) as HangmanStatePayload;
  const word = (state.word ?? '').toLowerCase();
  const guessedLetters = [...(state.guessedLetters ?? [])];
  const wrongCount = state.wrongCount ?? 0;
  const maxWrong = Math.max(1, state.maxWrong ?? 6);

  if (guessedLetters.includes(normalized)) return;

  guessedLetters.push(normalized);
  const inWord = word.includes(normalized);
  const newWrongCount = inWord ? wrongCount : wrongCount + 1;

  const allRevealed =
    word.length > 0 && [...word].every((c) => guessedLetters.includes(c));
  const lost = newWrongCount >= maxWrong;

  await updateSessionState(sessionId, {
    guessedLetters,
    wrongCount: newWrongCount,
  });

  if (allRevealed) {
    await completeSession(sessionId, 'solved');
  } else if (lost) {
    await completeSession(sessionId, 'failed');
  }
}

export type TriviaQuestion = {
  id: string;
  question_text: string;
  correct_answer: string;
  choices: string[];
  category: string | null;
  difficulty: string | null;
  created_at: string;
};

export type TriviaStatePayload = {
  questionIds?: string[];
  currentQuestionIndex?: number;
  totalQuestions?: number;
  scores?: Record<string, number>;
  answers?: Array<{
    q: number;
    user_id: string;
    answer: string;
    correct: boolean;
  }>;
};

const DEFAULT_TRIVIA_QUESTION_COUNT = 5;

export async function fetchTriviaQuestions(
  count: number = DEFAULT_TRIVIA_QUESTION_COUNT,
  category?: string | null,
  difficulty?: string | null,
): Promise<TriviaQuestion[]> {
  const { data, error } = await supabase.rpc('get_trivia_questions', {
    p_count: count,
    p_category: category ?? null,
    p_difficulty: difficulty ?? null,
  });
  if (error) throw error;
  return (data ?? []) as TriviaQuestion[];
}

export async function createTriviaSoloSession(
  questionCount: number = DEFAULT_TRIVIA_QUESTION_COUNT,
): Promise<GameSession> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user?.id;
  if (!userId) throw new Error('Not authenticated');

  const def = await fetchGameDefinitionByType('trivia');
  if (!def) throw new Error('Trivia is not available');

  const questions = await fetchTriviaQuestions(questionCount);
  if (questions.length === 0) throw new Error('No trivia questions available');
  const questionIds = questions.map((q) => q.id);

  return createSoloSession(def.id, {
    questionIds,
    currentQuestionIndex: 0,
    totalQuestions: questionIds.length,
    scores: { [userId]: 0 },
    answers: [],
  });
}

export async function createTriviaMultiplayerSession(
  recipientIds: string[],
  questionCount: number = DEFAULT_TRIVIA_QUESTION_COUNT,
): Promise<{ session: GameSession; invitations: GameInvitation[] }> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user?.id;
  if (!userId) throw new Error('Not authenticated');

  const def = await fetchGameDefinitionByType('trivia');
  if (!def) throw new Error('Trivia is not available');

  const questions = await fetchTriviaQuestions(questionCount);
  if (questions.length === 0) throw new Error('No trivia questions available');
  const questionIds = questions.map((q) => q.id);

  return createMultiplayerSessionWithInvites(def.id, recipientIds, {
    questionIds,
    currentQuestionIndex: 0,
    totalQuestions: questionIds.length,
    scores: { [userId]: 0 },
    answers: [],
  });
}

export async function submitTriviaAnswer(
  sessionId: string,
  questionIndex: number,
  answer: string,
): Promise<void> {
  const { error } = await supabase.rpc('submit_trivia_answer', {
    p_session_id: sessionId,
    p_question_index: questionIndex,
    p_answer: answer ?? '',
  });
  if (error) throw error;
}

export type TwoTruthsLieStatePayload = {
  roundIndex?: number;
  submitterUserId?: string;
  statements?: [string, string, string] | null;
  lieIndex?: number | null;
  votes?: Record<string, number>;
  revealed?: boolean;
  scores?: Record<string, number>;
};

export async function createTwoTruthsLieSession(
  recipientIds: string[],
): Promise<{ session: GameSession; invitations: GameInvitation[] }> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user?.id;
  if (!userId) throw new Error('Not authenticated');

  const def = await fetchGameDefinitionByType('two_truths_lie');
  if (!def) throw new Error('Two Truths and a Lie is not available');

  return createMultiplayerSessionWithInvites(def.id, recipientIds, {
    roundIndex: 0,
    submitterUserId: userId,
    statements: null,
    lieIndex: null,
    votes: {},
    revealed: false,
    scores: { [userId]: 0 },
  });
}

export async function submitTwoTruthsLieStatements(
  sessionId: string,
  statements: [string, string, string],
  lieIndex: 0 | 1 | 2,
): Promise<void> {
  const { error } = await supabase.rpc('submit_two_truths_lie_statements', {
    p_session_id: sessionId,
    p_statements: statements,
    p_lie_index: lieIndex,
  });
  if (error) throw error;
}

export async function submitTwoTruthsLieVote(
  sessionId: string,
  statementIndex: 0 | 1 | 2,
): Promise<void> {
  const { error } = await supabase.rpc('submit_two_truths_lie_vote', {
    p_session_id: sessionId,
    p_statement_index: statementIndex,
  });
  if (error) throw error;
}

export async function revealTwoTruthsLie(sessionId: string): Promise<void> {
  const { error } = await supabase.rpc('reveal_two_truths_lie', {
    p_session_id: sessionId,
  });
  if (error) throw error;
}

export async function advanceRoundTwoTruthsLie(
  sessionId: string,
): Promise<void> {
  const { error } = await supabase.rpc('advance_round_two_truths_lie', {
    p_session_id: sessionId,
  });
  if (error) throw error;
}

export type WouldYouRatherPrompt = {
  id: string;
  text_a: string;
  text_b: string;
  created_at: string;
};

export type WouldYouRatherStatePayload = {
  promptIds?: string[];
  promptIndex?: number;
  votes?: Record<string, 'A' | 'B'>;
  revealed?: boolean;
};

const DEFAULT_WYR_PROMPT_COUNT = 5;

export async function fetchWouldYouRatherPrompts(
  count: number = DEFAULT_WYR_PROMPT_COUNT,
): Promise<WouldYouRatherPrompt[]> {
  const { data, error } = await supabase.rpc('get_would_you_rather_prompts', {
    p_count: count,
  });
  if (error) throw error;
  return (data ?? []) as WouldYouRatherPrompt[];
}

export async function createWouldYouRatherSession(
  recipientIds: string[],
  promptIds?: string[],
): Promise<{ session: GameSession; invitations: GameInvitation[] }> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user?.id;
  if (!userId) throw new Error('Not authenticated');

  const def = await fetchGameDefinitionByType('would_you_rather');
  if (!def) throw new Error('Would You Rather is not available');

  const ids =
    promptIds && promptIds.length > 0
      ? promptIds
      : (await fetchWouldYouRatherPrompts(DEFAULT_WYR_PROMPT_COUNT)).map(
          (p) => p.id,
        );
  if (ids.length === 0) throw new Error('No prompts available');

  return createMultiplayerSessionWithInvites(def.id, recipientIds, {
    promptIds: ids,
    promptIndex: 0,
    votes: {},
    revealed: false,
  });
}

export async function submitWouldYouRatherVote(
  sessionId: string,
  choice: 'A' | 'B',
): Promise<void> {
  const { error } = await supabase.rpc('submit_would_you_rather_vote', {
    p_session_id: sessionId,
    p_choice: choice,
  });
  if (error) throw error;
}

export async function revealWouldYouRather(sessionId: string): Promise<void> {
  const { error } = await supabase.rpc('reveal_would_you_rather', {
    p_session_id: sessionId,
  });
  if (error) throw error;
}

export async function advancePromptWouldYouRather(
  sessionId: string,
): Promise<void> {
  const { error } = await supabase.rpc('advance_prompt_would_you_rather', {
    p_session_id: sessionId,
  });
  if (error) throw error;
}

export type DartsStatePayload = {
  startingScore?: number;
  playerOrder?: string[];
  scores?: Record<string, number>;
  currentPlayerIndex?: number;
  currentTurnThrows?: number[];
  throwHistory?: Array<{
    playerId: string;
    throws: number[];
    turnTotal: number;
  }>;
  winnerId?: string | null;
};

const DEFAULT_DARTS_START = 501;

export async function createDartsSoloSession(
  startingScore: number = DEFAULT_DARTS_START,
): Promise<GameSession> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user?.id;
  if (!userId) throw new Error('Not authenticated');

  const def = await fetchGameDefinitionByType('darts');
  if (!def) throw new Error('Darts is not available');

  const start = startingScore === 301 ? 301 : DEFAULT_DARTS_START;
  return createSoloSession(def.id, {
    startingScore: start,
    playerOrder: [userId],
    scores: { [userId]: start },
    currentPlayerIndex: 0,
    currentTurnThrows: [],
    throwHistory: [],
    winnerId: null,
  });
}

export async function createDartsMultiplayerSession(
  recipientIds: string[],
  startingScore: number = DEFAULT_DARTS_START,
): Promise<{ session: GameSession; invitations: GameInvitation[] }> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user?.id;
  if (!userId) throw new Error('Not authenticated');

  const def = await fetchGameDefinitionByType('darts');
  if (!def) throw new Error('Darts is not available');

  const start = startingScore === 301 ? 301 : DEFAULT_DARTS_START;
  const playerOrder = [userId, ...recipientIds.filter((id) => id !== userId)];
  const scores: Record<string, number> = {};
  playerOrder.forEach((id) => {
    scores[id] = start;
  });

  return createMultiplayerSessionWithInvites(def.id, recipientIds, {
    startingScore: start,
    playerOrder,
    scores,
    currentPlayerIndex: 0,
    currentTurnThrows: [],
    throwHistory: [],
    winnerId: null,
  });
}

export async function submitDartsThrow(
  sessionId: string,
  points: number,
): Promise<void> {
  const { error } = await supabase.rpc('submit_darts_throw', {
    p_session_id: sessionId,
    p_points: points,
  });
  if (error) throw error;
}

export type CaptionGameImage = {
  id: string;
  image_url: string;
  alt_text: string | null;
  created_at: string;
};

export type CaptionGameStatePayload = {
  imageIds?: string[];
  roundIndex?: number;
  currentImageId?: string | null;
  phase?: 'submitting' | 'voting' | 'revealed';
  captions?: Array<{ playerId: string; text: string }>;
  votes?: Record<string, number>;
  roundHistory?: Array<{
    roundIndex: number;
    imageId: string | null;
    captions: Array<{ playerId: string; text: string }>;
    voteCounts: Record<string, number>;
    topCaptionIndices: number[];
  }>;
};

const DEFAULT_CAPTION_IMAGE_COUNT = 5;

export async function fetchCaptionGameImages(
  count: number = DEFAULT_CAPTION_IMAGE_COUNT,
): Promise<CaptionGameImage[]> {
  const { data, error } = await supabase.rpc('get_caption_game_images', {
    p_count: count,
  });
  if (error) throw error;
  return (data ?? []) as CaptionGameImage[];
}

export async function createCaptionGameSession(
  recipientIds: string[],
): Promise<{ session: GameSession; invitations: GameInvitation[] }> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user?.id;
  if (!userId) throw new Error('Not authenticated');

  const def = await fetchGameDefinitionByType('caption_game');
  if (!def) throw new Error('Caption Game is not available');

  const images = await fetchCaptionGameImages(DEFAULT_CAPTION_IMAGE_COUNT);
  if (images.length === 0) throw new Error('No prompt images available');
  const imageIds = images.map((i) => i.id);
  const currentImageId = imageIds[0] ?? null;

  return createMultiplayerSessionWithInvites(def.id, recipientIds, {
    imageIds,
    roundIndex: 0,
    currentImageId,
    phase: 'submitting',
    captions: [],
    votes: {},
    roundHistory: [],
  });
}

export async function submitCaptionGameCaption(
  sessionId: string,
  captionText: string,
): Promise<void> {
  const { error } = await supabase.rpc('submit_caption_game_caption', {
    p_session_id: sessionId,
    p_caption_text: captionText.trim(),
  });
  if (error) throw error;
}

export async function startCaptionGameVoting(sessionId: string): Promise<void> {
  const { error } = await supabase.rpc('start_caption_game_voting', {
    p_session_id: sessionId,
  });
  if (error) throw error;
}

export async function submitCaptionGameVote(
  sessionId: string,
  captionIndex: number,
): Promise<void> {
  const { error } = await supabase.rpc('submit_caption_game_vote', {
    p_session_id: sessionId,
    p_caption_index: captionIndex,
  });
  if (error) throw error;
}

export async function revealCaptionGameRound(sessionId: string): Promise<void> {
  const { error } = await supabase.rpc('reveal_caption_game_round', {
    p_session_id: sessionId,
  });
  if (error) throw error;
}

export async function advanceCaptionGameRound(
  sessionId: string,
): Promise<void> {
  const { error } = await supabase.rpc('advance_caption_game_round', {
    p_session_id: sessionId,
  });
  if (error) throw error;
}

// --- Word Search ---

export type WordSearchStatePayload = {
  grid: string[][];
  startTime: string;
  durationSeconds: number;
  foundWords: string[];
  score: number;
};

const WORD_SEARCH_GRID_SIZE = 5;
const WORD_SEARCH_DURATION_SECONDS = 60;

function randomLetter(): string {
  return String.fromCharCode(97 + Math.floor(Math.random() * 26));
}

function createWordSearchGrid(): string[][] {
  return Array.from({ length: WORD_SEARCH_GRID_SIZE }, () =>
    Array.from({ length: WORD_SEARCH_GRID_SIZE }, () => randomLetter()),
  );
}

export async function createWordSearchSession(): Promise<GameSession> {
  const def = await fetchGameDefinitionByType('word_search');
  if (!def) throw new Error('Word Search is not available');
  const grid = createWordSearchGrid();
  return createSoloSession(def.id, {
    grid,
    startTime: new Date().toISOString(),
    durationSeconds: WORD_SEARCH_DURATION_SECONDS,
    foundWords: [],
    score: 0,
  });
}

export async function submitWordSearchWord(
  sessionId: string,
  word: string,
  path: [number, number][],
): Promise<void> {
  const { error } = await supabase.rpc('submit_word_search_word', {
    p_session_id: sessionId,
    p_word: word.trim().toLowerCase(),
    p_path: path,
  });
  if (error) throw error;
}

// --- Battleship ---

export type BattleshipShip = { id: string; positions: [number, number][] };
export type BattleshipShot = { r: number; c: number; hit: boolean };

export type BattleshipStatePayload = {
  phase?: 'placing' | 'playing' | 'completed';
  creatorShips?: BattleshipShip[];
  inviteeShips?: BattleshipShip[];
  creatorShots?: BattleshipShot[];
  inviteeShots?: BattleshipShot[];
  currentTurnPosition?: number;
  winnerPosition?: number;
};

const BATTLESHIP_INITIAL_STATE: BattleshipStatePayload = {
  phase: 'placing',
  creatorShips: [],
  inviteeShips: [],
  creatorShots: [],
  inviteeShots: [],
  currentTurnPosition: 0,
};

export async function createBattleshipSession(
  connectionId: string,
): Promise<{ session: GameSession; invitation: GameInvitation }> {
  const def = await fetchGameDefinitionByType('battleship');
  if (!def) throw new Error('Battleship is not available');
  return createMultiplayerSessionWithInvite(
    def.id,
    connectionId,
    BATTLESHIP_INITIAL_STATE,
  );
}

export async function placeBattleshipShips(
  sessionId: string,
  ships: BattleshipShip[],
): Promise<void> {
  const { error } = await supabase.rpc('place_battleship_ships', {
    p_session_id: sessionId,
    p_ships: ships,
  });
  if (error) throw error;
}

export async function fireBattleship(
  sessionId: string,
  row: number,
  col: number,
): Promise<void> {
  const { error } = await supabase.rpc('fire_battleship', {
    p_session_id: sessionId,
    p_row: row,
    p_col: col,
  });
  if (error) throw error;
}

// --- Reversi ---

export type ReversiStatePayload = {
  board?: (string | null)[][];
  currentTurnPosition?: number;
  winnerPosition?: number;
  countX?: number;
  countO?: number;
};

export async function createReversiSession(
  connectionId: string,
): Promise<{ session: GameSession; invitation: GameInvitation }> {
  const def = await fetchGameDefinitionByType('reversi');
  if (!def) throw new Error('Reversi is not available');
  return createMultiplayerSessionWithInvite(def.id, connectionId, {});
}

export async function makeReversiMove(
  sessionId: string,
  row: number,
  col: number,
): Promise<void> {
  const { error } = await supabase.rpc('make_reversi_move', {
    p_session_id: sessionId,
    p_row: row,
    p_col: col,
  });
  if (error) throw error;
}

// --- Chess ---

export type ChessStatePayload = {
  phase?: 'waiting_players' | 'playing' | 'completed';
  board?: (string | null)[][];
  turn?: 'white' | 'black';
  moveHistory?: Array<{
    from: string;
    to: string;
    piece: string;
    captured?: string;
  }>;
  captured?: { white?: string[]; black?: string[] };
  castling?: Record<string, boolean>;
  enPassantTarget?: string | null;
  halfMoveClock?: number;
  fullMoveNumber?: number;
  gameOver?: string | null;
  winner?: 'white' | 'black' | null;
  inCheck?: boolean;
};

export async function createChessSession(
  connectionId: string,
): Promise<{ session: GameSession; invitation: GameInvitation }> {
  const def = await fetchGameDefinitionByType('chess');
  if (!def) throw new Error('Chess is not available');
  return createMultiplayerSessionWithInvite(def.id, connectionId, {});
}

export async function startChessGame(sessionId: string): Promise<void> {
  const { error } = await supabase.rpc('start_chess_game', {
    p_session_id: sessionId,
  });
  if (error) throw error;
}

export async function makeChessMove(
  sessionId: string,
  fromSquare: string,
  toSquare: string,
): Promise<void> {
  const { error } = await supabase.rpc('make_chess_move', {
    p_session_id: sessionId,
    p_from_square: fromSquare,
    p_to_square: toSquare,
  });
  if (error) throw error;
}

export async function getChessLegalMoves(
  sessionId: string,
  fromSquare: string,
): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_chess_legal_moves', {
    p_session_id: sessionId,
    p_from_square: fromSquare,
  });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

// --- Scrabble ---

export type ScrabbleStatePayload = {
  phase?: 'waiting_players' | 'playing' | 'completed';
  board?: (string | null)[][];
  tileBag?: string[];
  racks?: Record<string, string[]>;
  currentTurnPosition?: number;
  scores?: Record<string, number>;
  passCount?: number;
  winnerPosition?: number;
};

export type ScrabblePlacement = { r: number; c: number; letter: string };

export async function createScrabbleSession(
  recipientIds: string[],
): Promise<{ session: GameSession; invitations: GameInvitation[] }> {
  const def = await fetchGameDefinitionByType('scrabble');
  if (!def) throw new Error('Scrabble is not available');
  if (recipientIds.length < 1 || recipientIds.length > 3) {
    throw new Error('Invite 1 to 3 connections');
  }
  return createMultiplayerSessionWithInvites(def.id, recipientIds, {
    phase: 'waiting_players',
  });
}

export async function startScrabbleGame(sessionId: string): Promise<void> {
  const { error } = await supabase.rpc('start_scrabble_game', {
    p_session_id: sessionId,
  });
  if (error) throw error;
}

export async function playScrabbleWord(
  sessionId: string,
  placements: ScrabblePlacement[],
): Promise<void> {
  const { error } = await supabase.rpc('play_scrabble_word', {
    p_session_id: sessionId,
    p_placements: placements,
  });
  if (error) throw error;
}

export async function passScrabbleTurn(sessionId: string): Promise<void> {
  const { error } = await supabase.rpc('pass_scrabble_turn', {
    p_session_id: sessionId,
  });
  if (error) throw error;
}

// --- Breakout ---

export type BreakoutStatePayload = {
  score?: number;
  lives?: number;
  brickRows?: number;
  brickCols?: number;
  bricksRemaining?: number[];
};

const BREAKOUT_BRICK_ROWS = 4;
const BREAKOUT_BRICK_COLS = 10;

function getDefaultBricksRemaining(): number[] {
  return Array.from(
    { length: BREAKOUT_BRICK_ROWS * BREAKOUT_BRICK_COLS },
    (_, i) => i,
  );
}

export async function createBreakoutSession(): Promise<GameSession> {
  const def = await fetchGameDefinitionByType('breakout');
  if (!def) throw new Error('Breakout is not available');
  return createSoloSession(def.id, {
    score: 0,
    lives: 3,
    brickRows: BREAKOUT_BRICK_ROWS,
    brickCols: BREAKOUT_BRICK_COLS,
    bricksRemaining: getDefaultBricksRemaining(),
  });
}
