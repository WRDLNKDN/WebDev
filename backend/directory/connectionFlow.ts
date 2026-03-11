export type ConnectIntent =
  | 'create_pending'
  | 'auto_accept_reverse_pending'
  | 'normalize_existing_connection';

export function getConnectIntent(
  hasReversePending: boolean,
  hasExistingConnection = false,
): ConnectIntent {
  if (hasExistingConnection) return 'normalize_existing_connection';
  return hasReversePending ? 'auto_accept_reverse_pending' : 'create_pending';
}

export type ConnectionOutcome = 'accepted' | 'declined';

export function getConnectionOutcomeNotificationType(
  outcome: ConnectionOutcome,
): 'connection_request_accepted' | 'connection_request_declined' {
  return outcome === 'accepted'
    ? 'connection_request_accepted'
    : 'connection_request_declined';
}
