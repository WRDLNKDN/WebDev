/** @vitest-environment jsdom */
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ChatRoomList } from '../../components/chat/room/ChatRoomList';

const theme = createTheme({ palette: { mode: 'dark' } });

function renderList(ui: ReactElement) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={['/chat']}>
        <Routes>
          <Route path="/chat" element={ui} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('ChatRoomList', () => {
  it('renders the polished empty inbox shell with search and actions', () => {
    renderList(
      <ChatRoomList
        rooms={[]}
        loading={false}
        currentUserId="user-1"
        onStartDm={vi.fn()}
        onCreateGroup={vi.fn()}
      />,
    );

    expect(
      screen.getByPlaceholderText('Search conversations'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /new chat/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /new group/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Inbox')).toBeInTheDocument();
    expect(
      screen.getByText('Ready for your first conversation'),
    ).toBeInTheDocument();
    expect(screen.getByText('No conversations yet')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Start a new chat or create a group to begin messaging.',
      ),
    ).toBeInTheDocument();
  });
});
