import { describe, expect, it } from 'vitest';
import { FORM_OUTLINED_FIELD_SX } from '../../lib/ui/formSurface';
import { profileStepTextField } from '../../theme/joinStyles';

describe('required field asterisk styles', () => {
  it('keeps shared outlined form labels using a red required asterisk', () => {
    expect(
      FORM_OUTLINED_FIELD_SX['& .MuiInputLabel-root']?.[
        '& .MuiFormLabel-asterisk'
      ],
    ).toEqual({
      color: '#f44336',
    });
  });

  it('keeps join profile field labels using a red required asterisk', () => {
    expect(
      profileStepTextField['& .MuiInputLabel-root']?.[
        '& .MuiFormLabel-asterisk'
      ],
    ).toEqual({
      color: '#f44336',
    });
  });
});
