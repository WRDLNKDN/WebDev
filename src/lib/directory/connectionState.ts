import type { ConnectionState } from '../api/directoryApi';

export const connectionStateLabel: Record<ConnectionState, string> = {
  not_connected: 'Not connected',
  pending: 'Pending',
  pending_received: 'Connection request',
  connected: 'Connected',
};
