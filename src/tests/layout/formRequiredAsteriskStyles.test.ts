import { describe, expect, it } from 'vitest';
import { FORM_OUTLINED_FIELD_SX } from '../../lib/ui/formSurface';
import { profileStepTextField } from '../../theme/joinStyles';
import { ACTION_COLORS } from '../../theme/themeConstants';
import { INPUT_STYLES as EDIT_PROFILE_INPUT_STYLES } from '../../components/profile/editProfileDialog/constants';
import { INPUT_STYLES as PORTFOLIO_EDIT_PROFILE_INPUT_STYLES } from '../../components/portfolio/dialogs/editProfileDialogStyles';

describe('required field asterisk styles', () => {
  it('keeps shared outlined form labels using the brand error color for required asterisks', () => {
    expect(
      FORM_OUTLINED_FIELD_SX['& .MuiInputLabel-root']?.[
        '& .MuiFormLabel-asterisk'
      ],
    ).toEqual({
      color: ACTION_COLORS.error,
    });
  });

  it('keeps join profile field labels using the brand error color for required asterisks', () => {
    expect(
      profileStepTextField['& .MuiInputLabel-root']?.[
        '& .MuiFormLabel-asterisk'
      ],
    ).toEqual({
      color: ACTION_COLORS.error,
    });
  });

  it('keeps profile edit dialog labels using the brand error color for required asterisks', () => {
    expect(
      EDIT_PROFILE_INPUT_STYLES['& .MuiInputLabel-root']?.[
        '& .MuiFormLabel-asterisk'
      ],
    ).toEqual({
      color: ACTION_COLORS.error,
    });
  });

  it('keeps portfolio profile dialog labels using the brand error color for required asterisks', () => {
    expect(
      PORTFOLIO_EDIT_PROFILE_INPUT_STYLES['& .MuiInputLabel-root']?.[
        '& .MuiFormLabel-asterisk'
      ],
    ).toEqual({
      color: ACTION_COLORS.error,
    });
  });
});
