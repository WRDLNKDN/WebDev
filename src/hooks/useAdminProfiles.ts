// src/hooks/useAdminProfiles.ts

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ProfileRow, ProfileStatus } from '../pages/admin/adminApi';
import { fetchProfiles } from '../pages/admin/adminApi';

type UseAdminProfilesArgs = {
  token: string;
  initialStatus: ProfileStatus | 'all';
};

export const useAdminProfiles = ({
  token,
  initialStatus,
}: UseAdminProfilesArgs) => {
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<ProfileStatus | 'all'>(initialStatus);
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);
  const [sort, setSort] = useState<'created_at' | 'updated_at'>('created_at');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetchProfiles(token, {
        status,
        q,
        limit,
        offset,
        sort,
        order,
      });

      setRows(res.data);
      setCount(res.count);
      setSelected(new Set());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load profiles');
    } finally {
      setLoading(false);
    }
  }, [token, status, q, limit, offset, sort, order]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedIds = useMemo(() => Array.from(selected), [selected]);

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

      for (const r of rows) {
        if (allChecked) next.delete(r.id);
        else next.add(r.id);
      }

      return next;
    });
  };

  return {
    rows,
    count,
    loading,
    error,
    status,
    setStatus,
    q,
    setQ,
    limit,
    setLimit,
    offset,
    setOffset,
    sort,
    setSort,
    order,
    setOrder,
    selected,
    selectedIds,
    toggle,
    toggleAll,
    reload: load,
  };
};
