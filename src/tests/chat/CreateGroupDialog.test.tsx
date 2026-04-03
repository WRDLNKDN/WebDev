/** @vitest-environment jsdom */
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  loadEligibleChatConnections: vi.fn(),
}));

vi.mock('../../lib/auth/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
    },
  },
}));

vi.mock('../../lib/chat/loadEligibleChatConnections', () => ({
  loadEligibleChatConnections: mocks.loadEligibleChatConnections,
}));

import { CreateGroupDialog } from '../../components/chat/dialogs/CreateGroupDialog';

const theme = createTheme({ palette: { mode: 'dark' } });

function renderDialog(ui: ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe('CreateGroupDialog', () => {
  beforeEach(() => {
    mocks.getSession.mockReset();
    mocks.loadEligibleChatConnections.mockReset();
    mocks.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
    });
    mocks.loadEligibleChatConnections.mockResolvedValue([]);

    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
  });

  it('shows a friendly create error and keeps entered values when optional backend fields are unsupported', async () => {
    const onClose = vi.fn();
    const onCreate = vi
      .fn()
      .mockRejectedValue(
        new Error(
          "Could not find the 'description' column of 'chat_rooms' in the schema cache.",
        ),
      );

    renderDialog(
      <CreateGroupDialog
        open
        onClose={onClose}
        onCreate={onCreate}
        currentUserId="user-1"
      />,
    );

    await waitFor(() => {
      expect(mocks.loadEligibleChatConnections).toHaveBeenCalledWith('user-1');
    });

    fireEvent.change(screen.getByLabelText('Group name'), {
      target: { value: 'Studio Crew' },
    });
    fireEvent.change(screen.getByLabelText('Group description'), {
      target: { value: 'Discuss weekly creative reviews.' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(
        screen.getByText(
          "We couldn't create the group right now. Please try again.",
        ),
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByText(/Could not find the 'description' column/i),
    ).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Studio Crew')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('Discuss weekly creative reviews.'),
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
