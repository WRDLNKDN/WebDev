import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { MessageContent } from '../../components/chat/message/MessageContent';

describe('MessageContent', () => {
  it('renders urls as external links and preserves mentions', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <MessageContent content="Look at https://example.com and talk to @nick" />
      </MemoryRouter>,
    );

    expect(markup).toContain('href="https://example.com"');
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('href="/p/h~nick"');
    expect(markup).toContain('@nick');
  });
});
