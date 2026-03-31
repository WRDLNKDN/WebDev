/** @vitest-environment jsdom */
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { GameEndScreen } from '../../components/games/GameEndScreen';

const theme = createTheme({ palette: { mode: 'dark' } });

function renderGameEnd(ui: ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe('GameEndScreen', () => {
  it('renders title, summary, and primary action', () => {
    const onReplay = vi.fn();
    renderGameEnd(
      <GameEndScreen
        title="Puzzle Complete"
        compactSummary="1:00 · 10 · 16"
        celebrationLine="Nice ✓"
        rewardLine="+10 XP"
        replayButtonLabel="Again"
        onReplayClick={onReplay}
      />,
    );

    expect(screen.getByRole('region', { name: /game results/i })).toBeTruthy();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Puzzle Complete' }),
    ).toBeTruthy();
    expect(screen.getByText('1:00 · 10 · 16')).toBeTruthy();
    expect(screen.getByText('Nice ✓')).toBeTruthy();
    expect(screen.getByText('+10 XP')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Again' }));
    expect(onReplay).toHaveBeenCalledTimes(1);
  });

  it('expands View Details and shows details content', async () => {
    renderGameEnd(
      <GameEndScreen
        title="Done"
        onReplayClick={vi.fn()}
        details={<span data-testid="inner-detail">Breakdown</span>}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'View Details' }));

    await waitFor(() => {
      expect(screen.getByTestId('inner-detail')).toBeInTheDocument();
    });
  });
});
