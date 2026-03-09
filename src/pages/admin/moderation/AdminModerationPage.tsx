import { Box, Divider, Typography } from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { ProfileRow, ProfileStatus } from '../../../types/types';
import {
  approveProfiles,
  deleteProfiles,
  disableProfiles,
  fetchProfiles,
  rejectProfiles,
} from '../core/adminApi';
import { toMessage } from '../../../lib/utils/errors';
import { ProfileDetailDialog } from './ProfileDetailDialog';
import { useAdminSession } from '../core/AdminSessionContext';
import {
  ModerationBulkActions,
  ModerationConfirmDialog,
  ModerationError,
  ModerationFilters,
  ModerationPager,
  ModerationTable,
} from './adminModerationUi';

type Props = {
  initialStatus?: ProfileStatus | 'all';
};

type ConfirmState = null | {
  title: string;
  body: string;
  destructive?: boolean;
  showHardDelete?: boolean;
  action: (opts: { hardDeleteAuthUsers: boolean }) => Promise<void>;
};

export const AdminModerationPage = ({ initialStatus }: Props) => {
  const session = useAdminSession();
  const token = session?.access_token ?? '';
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<ProfileStatus | 'all' | ''>(
    initialStatus ?? '',
  );
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);
  const [sort, setSort] = useState<'created_at' | 'updated_at' | ''>('');
  const [order, setOrder] = useState<'asc' | 'desc' | ''>('');

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [details, setDetails] = useState<ProfileRow | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [hardDeleteAuthUsers, setHardDeleteAuthUsers] = useState(false);

  const page = useMemo(() => Math.floor(offset / limit) + 1, [offset, limit]);
  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(count / limit)),
    [count, limit],
  );
  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, count: c } = await fetchProfiles(token, {
        status: status || 'all',
        q,
        limit,
        offset,
        sort: sort || 'created_at',
        order: order || 'asc',
      });
      setRows(data);
      setCount(c);
      setSelected(new Set());
    } catch (e: unknown) {
      setError(toMessage(e));
    } finally {
      setLoading(false);
    }
  }, [limit, offset, order, q, sort, status, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allChecked = rows.length > 0 && rows.every((r) => next.has(r.id));
      if (allChecked) rows.forEach((r) => next.delete(r.id));
      else rows.forEach((r) => next.add(r.id));
      return next;
    });
  };

  const run = async (action: () => Promise<unknown>) => {
    setLoading(true);
    setError(null);
    try {
      await action();
      await load();
    } catch (e: unknown) {
      setError(toMessage(e));
      setLoading(false);
    }
  };

  const bulkDisabled = selectedIds.length === 0 || loading;
  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someChecked = rows.some((r) => selected.has(r.id));

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Moderation
      </Typography>
      <Typography variant="body2" sx={{ opacity: 0.8 }}>
        Review profiles, approve or reject registrations, and manage active
        members.
      </Typography>
      <Divider sx={{ my: 2 }} />

      <ModerationFilters
        status={status}
        setStatus={setStatus}
        q={q}
        setQ={setQ}
        sort={sort}
        setSort={setSort}
        order={order}
        setOrder={setOrder}
        limit={limit}
        setLimit={setLimit}
        onRefresh={() => void load()}
        loading={loading}
        resetOffset={() => setOffset(0)}
      />

      <ModerationBulkActions
        bulkDisabled={bulkDisabled}
        selectedCount={selectedIds.length}
        onApprove={() =>
          setConfirm({
            title: 'Approve selected profiles?',
            body: `This will approve ${selectedIds.length} profile(s).`,
            action: async () => run(() => approveProfiles(token, selectedIds)),
          })
        }
        onReject={() =>
          setConfirm({
            title: 'Reject selected profiles?',
            body: `This will reject ${selectedIds.length} profile(s).`,
            action: async () => run(() => rejectProfiles(token, selectedIds)),
          })
        }
        onDisable={() =>
          setConfirm({
            title: 'Deactivate selected profiles?',
            body: `This will deactivate ${selectedIds.length} profile(s).`,
            action: async () => run(() => disableProfiles(token, selectedIds)),
          })
        }
        onDelete={() => {
          setHardDeleteAuthUsers(false);
          setConfirm({
            title: 'Delete selected profiles?',
            body: `This will delete ${selectedIds.length} profile row(s).`,
            destructive: true,
            showHardDelete: true,
            action: async (opts) =>
              run(() =>
                deleteProfiles(token, selectedIds, opts.hardDeleteAuthUsers),
              ),
          });
        }}
      />

      <ModerationError error={error} />

      <ModerationTable
        loading={loading}
        rows={rows}
        selected={selected}
        allChecked={allChecked}
        someChecked={someChecked}
        toggleAll={toggleAll}
        toggle={toggle}
        onView={setDetails}
        onApprove={(r) =>
          setConfirm({
            title: `Approve ${r.handle}?`,
            body: 'This will make the profile public.',
            action: async () => run(() => approveProfiles(token, [r.id])),
          })
        }
        onReject={(r) =>
          setConfirm({
            title: `Reject ${r.handle}?`,
            body: 'This will keep the profile hidden from public.',
            action: async () => run(() => rejectProfiles(token, [r.id])),
          })
        }
      />

      <ModerationPager
        page={page}
        pageCount={pageCount}
        count={count}
        loading={loading}
        offset={offset}
        limit={limit}
        onPrev={() => setOffset((o) => Math.max(0, o - limit))}
        onNext={() => setOffset((o) => (o + limit < count ? o + limit : o))}
      />

      <ProfileDetailDialog
        open={!!details}
        profile={details}
        onClose={() => setDetails(null)}
      />

      <ModerationConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title}
        body={confirm?.body}
        destructive={confirm?.destructive}
        showHardDelete={confirm?.showHardDelete}
        hardDeleteAuthUsers={hardDeleteAuthUsers}
        setHardDeleteAuthUsers={setHardDeleteAuthUsers}
        onCancel={() => {
          setConfirm(null);
          setHardDeleteAuthUsers(false);
        }}
        onConfirm={async () => {
          const action = confirm?.action;
          const hard = hardDeleteAuthUsers;
          setConfirm(null);
          setHardDeleteAuthUsers(false);
          if (action) await action({ hardDeleteAuthUsers: hard });
        }}
      />
    </Box>
  );
};
