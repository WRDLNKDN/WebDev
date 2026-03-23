/**
 * Solo Blackjack: play against the dealer. Hit, stand; dealer follows house rules.
 * Entertainment only — no real-money betting, purchasable credits, or redeemable rewards.
 */
import ReplayIcon from '@mui/icons-material/Replay';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createBlackjackSession,
  fetchSessionById,
} from '../../lib/api/gamesApi';
import { useAppToast } from '../../context/AppToastContext';
import { toMessage } from '../../lib/utils/errors';
import type { GameSession } from '../../types/games';
import {
  MiniGameIntroScreen,
  MiniGameLoadingNotFound,
  MiniGamePlayHeaderRow,
  MiniGamePlayPageRoot,
} from './games/MiniGamePlayChrome';

const RANKS = [
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
  'A',
];
const SUITS = ['S', 'H', 'D', 'C'];
const SUIT_SYMBOLS: Record<string, string> = {
  S: '♠',
  H: '♥',
  D: '♦',
  C: '♣',
};

function buildDeck(): string[] {
  const deck: string[] = [];
  for (const r of RANKS) for (const s of SUITS) deck.push(r + s);
  return deck;
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function cardValue(card: string): number {
  const r = card.slice(0, -1);
  if (r === 'A') return 11;
  if (['J', 'Q', 'K'].includes(r)) return 10;
  return parseInt(r, 10) || 0;
}

function handValue(hand: string[]): number {
  let total = hand.reduce((s, c) => s + cardValue(c), 0);
  let aces = hand.filter((c) => c.startsWith('A')).length;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

function isBlackjack(hand: string[]): boolean {
  return hand.length === 2 && handValue(hand) === 21;
}

function cardLabel(card: string): string {
  const r = card.slice(0, -1);
  const s = SUIT_SYMBOLS[card.slice(-1)] ?? card.slice(-1);
  return r + s;
}

type Phase = 'idle' | 'player_turn' | 'dealer_turn' | 'round_over';
type Result = 'win' | 'loss' | 'push' | null;

export const BlackjackPlayPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { showToast } = useAppToast();
  const [session, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [startingNew, setStartingNew] = useState(false);

  const [deck, setDeck] = useState<string[]>(() => shuffle(buildDeck()));
  const [playerHand, setPlayerHand] = useState<string[]>([]);
  const [dealerHand, setDealerHand] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<Result>(null);
  const [dealerRevealed, setDealerRevealed] = useState(false);
  const statsRef = useRef({ wins: 0, losses: 0, pushes: 0 });

  const loadSession = useCallback(async (id: string) => {
    const s = await fetchSessionById(id);
    if (!s) {
      setNotFound(true);
      setSession(null);
      return;
    }
    const def = s.game_definition as { game_type?: string } | undefined;
    if (def?.game_type !== 'blackjack') {
      setNotFound(true);
      setSession(null);
      return;
    }
    setSession(s);
    setNotFound(false);
  }, []);

  useEffect(() => {
    if (!sessionId?.trim()) {
      setLoading(false);
      setSession(null);
      return;
    }
    setLoading(true);
    loadSession(sessionId.trim()).finally(() => setLoading(false));
  }, [sessionId, loadSession]);

  const dealFromDeck = useCallback(
    (
      currentDeck: string[],
      count: number,
    ): { cards: string[]; rest: string[] } => {
      const rest = [...currentDeck];
      const cards: string[] = [];
      for (let i = 0; i < count && rest.length > 0; i++) {
        cards.push(rest.shift()!);
      }
      return { cards, rest };
    },
    [],
  );

  const startRound = useCallback(() => {
    const newDeck = shuffle(buildDeck());
    const { cards: p1, rest: d1 } = dealFromDeck(newDeck, 2);
    const { cards: dHand, rest: restDeck } = dealFromDeck(d1, 2);
    setDeck(restDeck);
    setPlayerHand(p1);
    setDealerHand(dHand);
    setDealerRevealed(false);
    setResult(null);

    const playerBJ = isBlackjack(p1);
    const dealerBJ = isBlackjack(dHand);
    if (dealerBJ && !playerBJ) {
      setPhase('round_over');
      setResult('loss');
      setDealerRevealed(true);
      statsRef.current.losses += 1;
      return;
    }
    if (playerBJ && dealerBJ) {
      setPhase('round_over');
      setResult('push');
      setDealerRevealed(true);
      statsRef.current.pushes += 1;
      return;
    }
    if (playerBJ) {
      setPhase('round_over');
      setResult('win');
      setDealerRevealed(true);
      statsRef.current.wins += 1;
      return;
    }
    setPhase('player_turn');
  }, [dealFromDeck]);

  useEffect(() => {
    if (session && phase === 'idle') startRound();
  }, [session, phase, startRound]);

  const handleHit = useCallback(() => {
    if (phase !== 'player_turn' || deck.length === 0) return;
    const { cards, rest } = dealFromDeck(deck, 1);
    const newPlayerHand = [...playerHand, ...cards];
    setPlayerHand(newPlayerHand);
    setDeck(rest);
    const total = handValue(newPlayerHand);
    if (total > 21) {
      setPhase('round_over');
      setResult('loss');
      setDealerRevealed(true);
      statsRef.current.losses += 1;
    }
  }, [phase, deck, playerHand, dealFromDeck]);

  const handleStand = useCallback(() => {
    if (phase !== 'player_turn') return;
    setPhase('dealer_turn');
    setDealerRevealed(true);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'dealer_turn' || deck.length === 0) return;
    let dHand = [...dealerHand];
    let rest = [...deck];
    while (handValue(dHand) < 17 && rest.length > 0) {
      const { cards, rest: next } = dealFromDeck(rest, 1);
      dHand = [...dHand, ...cards];
      rest = next;
    }
    setDealerHand(dHand);
    setDeck(rest);
    const playerTotal = handValue(playerHand);
    const dealerTotal = handValue(dHand);
    if (dealerTotal > 21) {
      setResult('win');
      statsRef.current.wins += 1;
    } else if (dealerTotal > playerTotal) {
      setResult('loss');
      statsRef.current.losses += 1;
    } else if (dealerTotal < playerTotal) {
      setResult('win');
      statsRef.current.wins += 1;
    } else {
      setResult('push');
      statsRef.current.pushes += 1;
    }
    setPhase('round_over');
  }, [phase, dealerHand, deck, playerHand, dealFromDeck]);

  const handleNewRound = useCallback(() => {
    startRound();
  }, [startRound]);

  const handlePlayAgain = useCallback(async () => {
    setStartingNew(true);
    try {
      const newSession = await createBlackjackSession();
      navigate(`/dashboard/games/blackjack/${newSession.id}`, {
        replace: true,
      });
    } catch (e) {
      showToast({ message: toMessage(e), severity: 'error' });
    } finally {
      setStartingNew(false);
    }
  }, [navigate, showToast]);

  if (loading || notFound) {
    return <MiniGameLoadingNotFound loading={loading} notFound={notFound} />;
  }

  if (!sessionId) {
    return (
      <MiniGameIntroScreen
        title="Blackjack"
        description="Play against the dealer. Hit to take a card, Stand to hold. Get closer to 21 than the dealer without going over. For entertainment only — no real money or rewards."
        startingNew={startingNew}
        onStartNew={async () => {
          await handlePlayAgain();
        }}
        startAriaLabel="Start new Blackjack game"
      />
    );
  }

  if (!session) return null;

  const playerTotal = handValue(playerHand);
  const dealerTotal = handValue(dealerHand);
  const stats = statsRef.current;

  return (
    <MiniGamePlayPageRoot>
      <MiniGamePlayHeaderRow
        title="Blackjack"
        showStats
        stats={
          <Typography variant="body2" color="text.secondary">
            Session: {stats.wins}W / {stats.losses}L / {stats.pushes}P — for fun
            only
          </Typography>
        }
      />

      <Paper variant="outlined" sx={{ p: 3, maxWidth: 520 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
          Dealer
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
          {dealerHand.map((card, i) => (
            <Box
              key={`${card}-${i}`}
              sx={{
                width: 56,
                height: 80,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'background.paper',
                fontWeight: 700,
                fontSize: '1rem',
              }}
            >
              {dealerRevealed || i === 0 ? cardLabel(card) : '?'}
            </Box>
          ))}
        </Stack>
        {dealerRevealed && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Dealer total: {dealerTotal}
            {dealerTotal > 21 && ' (bust)'}
          </Typography>
        )}

        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
          Your hand
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mb: 1 }} flexWrap="wrap">
          {playerHand.map((card, i) => (
            <Box
              key={`${card}-${i}`}
              sx={{
                width: 56,
                height: 80,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'background.paper',
                fontWeight: 700,
                fontSize: '1rem',
              }}
            >
              {cardLabel(card)}
            </Box>
          ))}
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Your total: {playerTotal}
          {playerTotal > 21 && ' (bust)'}
        </Typography>

        {phase === 'round_over' && result != null && (
          <Typography
            variant="h6"
            sx={{ fontWeight: 600, mb: 2 }}
            color={
              result === 'win'
                ? 'success.main'
                : result === 'loss'
                  ? 'error.main'
                  : 'text.primary'
            }
          >
            {result === 'win' && 'You win!'}
            {result === 'loss' && 'You lose.'}
            {result === 'push' && 'Push.'}
          </Typography>
        )}

        {phase === 'player_turn' && (
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Button
              variant="contained"
              onClick={handleHit}
              disabled={deck.length === 0}
            >
              Hit
            </Button>
            <Button variant="outlined" onClick={handleStand}>
              Stand
            </Button>
          </Stack>
        )}

        {phase === 'round_over' && (
          <Button
            variant="contained"
            startIcon={<ReplayIcon />}
            onClick={handleNewRound}
            sx={{ mt: 1 }}
          >
            New round
          </Button>
        )}
      </Paper>
    </MiniGamePlayPageRoot>
  );
};
