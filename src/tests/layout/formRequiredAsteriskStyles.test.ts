import { describe, expect, it } from 'vitest';
import { FORM_OUTLINED_FIELD_SX } from '../../lib/ui/formSurface';
import { profileStepTextField } from '../../theme/joinStyles';
import { INPUT_STYLES as EDIT_PROFILE_INPUT_STYLES } from '../../components/profile/editProfileDialog/constants';
import { INPUT_STYLES as PORTFOLIO_EDIT_PROFILE_INPUT_STYLES } from '../../components/portfolio/dialogs/editProfileDialogStyles';

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

  it('keeps profile edit dialog labels using a red required asterisk', () => {
    expect(
      EDIT_PROFILE_INPUT_STYLES['& .MuiInputLabel-root']?.[
        '& .MuiFormLabel-asterisk'
      ],
    ).toEqual({
      color: '#f44336',
    });
  });

  it('keeps portfolio profile dialog labels using a red required asterisk', () => {
    expect(
      PORTFOLIO_EDIT_PROFILE_INPUT_STYLES['& .MuiInputLabel-root']?.[
        '& .MuiFormLabel-asterisk'
      ],
    ).toEqual({
      color: '#f44336',
    });
  });
});
