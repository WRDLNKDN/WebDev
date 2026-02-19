import type { ConnectionState } from '../api/directoryApi';

export const connectionStateLabel: Record<ConnectionState, string> = {
  not_connected: 'Not connected',
  pending: 'Awaiting approval',
  pending_received: 'Needs your approval',
  connected: 'Connected',
};
