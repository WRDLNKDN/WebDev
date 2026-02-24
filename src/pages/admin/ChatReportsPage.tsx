import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/auth/supabaseClient';
import type {
  ChatReport,
  ChatReportCategory,
  ChatReportStatus,
} from '../../types/chat';

type ReportRow = ChatReport & {
  reporter_handle?: string;
  reported_user_handle?: string;
  message_preview?: string;
};

const CATEGORY_LABELS: Record<ChatReportCategory, string> = {
  harassment: 'Harassment',
  spam: 'Spam',
  inappropriate_content: 'Inappropriate Content',
  other: 'Other',
};

const STATUS_COLORS: Record<
  ChatReportStatus,
  'default' | 'warning' | 'success'
> = {
  open: 'warning',
  under_review: 'default',
  resolved: 'success',
};

export const ChatReportsPage = () => {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data, error } = await supabase
        .from('chat_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (cancelled || error) {
        if (!cancelled && error) console.error(error);
        return;
      }

      const ids = new Set<string>();
      (data ?? []).forEach((r) => {
        if (r.reporter_id) ids.add(r.reporter_id);
        if (r.reported_user_id) ids.add(r.reported_user_id);
      });

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, handle, display_name')
        .in('id', Array.from(ids));

      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.id, p.handle || p.id]),
      );

      const msgIds = (data ?? [])
        .filter((r): r is typeof r & { reported_message_id: string } =>
          Boolean(r.reported_message_id),
        )
        .map((r) => r.reported_message_id);
      let msgMap = new Map<string, string>();
      if (msgIds.length > 0) {
        const { data: msgs } = await supabase
          .from('chat_messages')
          .select('id, content')
          .in('id', msgIds);
        msgMap = new Map(
          (msgs ?? []).map((m) => [m.id, (m.content || '').slice(0, 50)]),
        );
      }

      setReports(
        (data ?? []).map((r) => ({
          ...r,
          reporter_handle: r.reporter_id
            ? profileMap.get(r.reporter_id)
            : undefined,
          reported_user_handle: r.reported_user_id
            ? profileMap.get(r.reported_user_id)
            : undefined,
          message_preview: r.reported_message_id
            ? msgMap.get(r.reported_message_id)
            : undefined,
        })) as ReportRow[],
      );
      setLoading(false);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const [isModerator, setIsModerator] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.rpc('is_chat_moderator');
      setIsModerator(data === true);
    })();
  }, []);

  const suspendUser = async (userId: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user || !isModerator) return;
    await supabase.from('chat_suspensions').insert({
      user_id: userId,
      suspended_by: session.user.id,
      reason: 'Chat suspension from report',
    });
  };

  const updateStatus = async (id: string, status: ChatReportStatus) => {
    await supabase.from('chat_reports').update({ status }).eq('id', id);
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Chat Reports
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Created</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Reporter</TableCell>
              <TableCell>Reported</TableCell>
              <TableCell>Preview</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reports.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
                <TableCell>{CATEGORY_LABELS[r.category]}</TableCell>
                <TableCell>
                  <Chip
                    label={r.status}
                    color={STATUS_COLORS[r.status]}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  @{r.reporter_handle ?? r.reporter_id.slice(0, 8)}
                </TableCell>
                <TableCell>
                  {r.reported_user_id
                    ? `@${r.reported_user_handle ?? r.reported_user_id.slice(0, 8)}`
                    : 'Message'}
                </TableCell>
                <TableCell
                  sx={{
                    maxWidth: 150,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {r.message_preview ?? r.free_text?.slice(0, 30) ?? '—'}
                </TableCell>
                <TableCell>
                  {r.status === 'open' && (
                    <Button
                      size="small"
                      onClick={() => updateStatus(r.id, 'under_review')}
                    >
                      Review
                    </Button>
                  )}
                  {r.status !== 'resolved' && (
                    <Button
                      size="small"
                      onClick={() => updateStatus(r.id, 'resolved')}
                    >
                      Resolve
                    </Button>
                  )}
                  {isModerator && r.reported_user_id && (
                    <Button
                      size="small"
                      color="warning"
                      onClick={() => void suspendUser(r.reported_user_id!)}
                      sx={{ ml: 1 }}
                    >
                      Suspend from chat
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
