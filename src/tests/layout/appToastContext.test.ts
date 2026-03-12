import { describe, expect, it } from 'vitest';
import { dismissToast, enqueueToast } from '../../context/AppToastContext';

describe('AppToastContext queue helpers', () => {
  it('enqueues new toasts in order', () => {
    const queue = enqueueToast(
      [
        {
          id: 1,
          message: 'First',
          severity: 'info',
        },
      ],
      {
        message: 'Second',
        severity: 'success',
      },
      () => 2,
    );

    expect(queue.map((item) => item.message)).toEqual(['First', 'Second']);
    expect(queue[1]?.id).toBe(2);
  });

  it('preserves toast action metadata', () => {
    const action = { label: 'Undo', onClick: () => undefined };
    const queue = enqueueToast(
      [],
      {
        message: 'Saved',
        severity: 'success',
        action,
      },
      () => 7,
    );

    expect(queue[0]).toMatchObject({
      id: 7,
      message: 'Saved',
      severity: 'success',
      action: {
        label: 'Undo',
      },
    });
    expect(queue[0]?.action?.onClick).toBe(action.onClick);
  });

  it('dismisses only the current toast', () => {
    const nextQueue = dismissToast([
      { id: 1, message: 'First' },
      { id: 2, message: 'Second' },
    ]);

    expect(nextQueue).toEqual([{ id: 2, message: 'Second' }]);
  });
});
