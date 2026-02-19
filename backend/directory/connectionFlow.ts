export type ConnectIntent = 'create_pending' | 'auto_accept_reverse_pending';

export function getConnectIntent(hasReversePending: boolean): ConnectIntent {
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
