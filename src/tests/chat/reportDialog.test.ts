import { describe, expect, it } from 'vitest';
import {
  shouldCloseDialogFromReason,
  shouldSubmitWithModifier,
} from '../../lib/ui/dialogFormUtils';

describe('Report dialog keyboard helper', () => {
  it('submits on Ctrl+Enter', () => {
    expect(
      shouldSubmitWithModifier({
        key: 'Enter',
        ctrlKey: true,
        metaKey: false,
      }),
    ).toBe(true);
  });

  it('submits on Cmd+Enter', () => {
    expect(
      shouldSubmitWithModifier({
        key: 'Enter',
        ctrlKey: false,
        metaKey: true,
      }),
    ).toBe(true);
  });

  it('does not submit on plain Enter', () => {
    expect(
      shouldSubmitWithModifier({
        key: 'Enter',
        ctrlKey: false,
        metaKey: false,
      }),
    ).toBe(false);
  });

  it('treats Escape and backdrop dismissals as close reasons', () => {
    expect(shouldCloseDialogFromReason('escapeKeyDown')).toBe(true);
    expect(shouldCloseDialogFromReason('backdropClick')).toBe(true);
  });
});
