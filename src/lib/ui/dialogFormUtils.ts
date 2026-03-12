export function shouldSubmitWithModifier(event: {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
}) {
  return event.key === 'Enter' && (event.metaKey || event.ctrlKey);
}

export function shouldCloseDialogFromReason(
  reason: 'backdropClick' | 'escapeKeyDown',
) {
  return reason === 'backdropClick' || reason === 'escapeKeyDown';
}
