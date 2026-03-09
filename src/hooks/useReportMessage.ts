import { useCallback } from 'react';
import { supabase } from '../lib/auth/supabaseClient';
import type { ChatReportCategory } from '../types/chat';

export function useReportMessage() {
  const submitReport = useCallback(
    async (
      reportedMessageId?: string | null,
      reportedUserId?: string | null,
      category?: ChatReportCategory,
      freeText?: string,
    ) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('You need to sign in to send reports.');
      }
      if (!reportedMessageId && !reportedUserId) {
        throw new Error('Select a message or member to report.');
      }
      if (!category) {
        throw new Error('Choose a report reason.');
      }

      const { error } = await supabase.from('chat_reports').insert({
        reporter_id: session.user.id,
        reported_message_id: reportedMessageId ?? null,
        reported_user_id: reportedUserId ?? null,
        category,
        free_text: freeText ?? null,
        status: 'open',
      });

      if (error) throw error;
    },
    [],
  );

  return { submitReport };
}
