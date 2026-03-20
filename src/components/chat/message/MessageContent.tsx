import { Link, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useMemo } from 'react';

type MessageContentProps = {
  content: string;
};

type MessagePart =
  | { type: 'text'; text: string }
  | { type: 'mention'; text: string; handle: string };

/**
 * Parses message content to extract @mentions and render them as styled links.
 * Mentions are detected as @handle patterns.
 */
export const MessageContent = ({ content }: MessageContentProps) => {
  const parts = useMemo(() => {
    if (!content) return [];
    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    const parts: MessagePart[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = mentionRegex.exec(content)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          text: content.slice(lastIndex, match.index),
        });
      }

      // Add mention
      parts.push({
        type: 'mention',
        text: match[0],
        handle: match[1],
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
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
                color: '#2dd4bf',
                textDecoration: 'none',
                fontWeight: 500,
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              {mentionPart.text}
            </Link>
          );
        }
        return <span key={index}>{part.text}</span>;
      })}
    </Typography>
  );
};
