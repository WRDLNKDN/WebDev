import { Link, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useMemo } from 'react';
import { LINK_PREVIEW_URL_REGEX } from '../../../lib/urlPreviewText';

type MessageContentProps = {
  content: string;
};

type MessagePart =
  | { type: 'text'; text: string }
  | { type: 'mention'; text: string; handle: string }
  | { type: 'url'; text: string; href: string };

/**
 * Parses message content to extract @mentions and render them as styled links.
 * Mentions are detected as @handle patterns.
 */
export const MessageContent = ({ content }: MessageContentProps) => {
  const parts = useMemo(() => {
    if (!content) return [];
    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    const urlRegex = new RegExp(LINK_PREVIEW_URL_REGEX.source, 'gi');
    const parts: MessagePart[] = [];
    let lastIndex = 0;
    while (lastIndex < content.length) {
      mentionRegex.lastIndex = lastIndex;
      urlRegex.lastIndex = lastIndex;
      const mentionMatch = mentionRegex.exec(content);
      const urlMatch = urlRegex.exec(content);
      const nextMatch = [mentionMatch, urlMatch]
        .filter((match): match is RegExpExecArray => Boolean(match))
        .sort((a, b) => a.index - b.index)[0];

      if (!nextMatch) break;

      if (nextMatch.index > lastIndex) {
        parts.push({
          type: 'text',
          text: content.slice(lastIndex, nextMatch.index),
        });
      }

      if (urlMatch && nextMatch.index === urlMatch.index) {
        parts.push({
          type: 'url',
          text: urlMatch[0],
          href: urlMatch[0],
        });
      } else if (mentionMatch && nextMatch.index === mentionMatch.index) {
        parts.push({
          type: 'mention',
          text: mentionMatch[0],
          handle: mentionMatch[1],
        });
      }

      lastIndex = nextMatch.index + nextMatch[0].length;
    }

    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        text: content.slice(lastIndex),
      });
    }

    return parts.length > 0 ? parts : [{ type: 'text', text: content }];
  }, [content]);

  if (parts.length === 0) {
    return (
      <Typography
        variant="body2"
        sx={{ whiteSpace: 'pre-wrap', display: 'block' }}
      >
        {content || ''}
      </Typography>
    );
  }

  return (
    <Typography
      variant="body2"
      component="span"
      sx={{ whiteSpace: 'pre-wrap', display: 'block' }}
    >
      {parts.map((part, index) => {
        if (part.type === 'mention') {
          const mentionPart = part as {
            type: 'mention';
            text: string;
            handle: string;
          };
          return (
            <Link
              key={index}
              component={RouterLink}
              to={`/p/h~${encodeURIComponent(mentionPart.handle)}`}
              sx={{
                display: 'inline-block',
                color: '#5eead4',
                textDecoration: 'none',
                fontWeight: 600,
                px: { xs: 0.75, sm: 0.5 },
                py: { xs: 0.25, sm: 0.125 },
                mx: 0.125,
                borderRadius: 1,
                bgcolor: 'rgba(45, 212, 191, 0.14)',
                border: '1px solid rgba(45, 212, 191, 0.35)',
                verticalAlign: 'baseline',
                lineHeight: 1.45,
                WebkitTapHighlightColor: 'rgba(45, 212, 191, 0.25)',
                '&:hover': {
                  textDecoration: 'none',
                  bgcolor: 'rgba(45, 212, 191, 0.22)',
                  borderColor: 'rgba(45, 212, 191, 0.5)',
                },
              }}
            >
              {mentionPart.text}
            </Link>
          );
        }
        if (part.type === 'url') {
          const urlPart = part as { type: 'url'; text: string; href: string };
          return (
            <Link
              key={index}
              href={urlPart.href}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: 'primary.main',
                textDecorationColor: 'currentColor',
                overflowWrap: 'anywhere',
              }}
            >
              {urlPart.text}
            </Link>
          );
        }
        return <span key={index}>{part.text}</span>;
      })}
    </Typography>
  );
};
