import { describe, expect, it } from 'vitest';
import {
  cleanFieldTooltipText,
  resolveFieldHint,
} from '../../components/common/GlobalFormTooltips';

function makeElement(
  attrs: Record<string, string> = {},
  options: {
    formControlLabelText?: string;
  } = {},
): HTMLElement {
  return {
    getAttribute: (name: string) => attrs[name] ?? null,
    closest: (selector: string) => {
      if (
        selector === '.MuiFormControl-root' &&
        options.formControlLabelText != null
      ) {
        return {
          querySelector: (q: string) =>
            q === '.MuiInputLabel-root'
              ? { textContent: options.formControlLabelText }
              : null,
        };
      }
      return null;
    },
  } as unknown as HTMLElement;
}

function makeDocument(
  options: {
    labelsByFor?: Record<string, string>;
    textById?: Record<string, string>;
  } = {},
): Document {
  const labelsByFor = options.labelsByFor ?? {};
  const textById = options.textById ?? {};
  return {
    querySelector: (selector: string) => {
      const match = selector.match(/^label\[for="(.+)"\]$/);
      if (!match) return null;
      const text = labelsByFor[match[1]];
      return text ? ({ textContent: text } as Element) : null;
    },
    getElementById: (id: string) => {
      const text = textById[id];
      return text ? ({ textContent: text } as HTMLElement) : null;
    },
  } as unknown as Document;
}

describe('GlobalFormTooltips helpers', () => {
  it('normalizes whitespace in tooltip text', () => {
    expect(cleanFieldTooltipText('  A   label \n with   space  ')).toBe(
      'A label with space',
    );
  });

  it('resolves hint by precedence', () => {
    const root = makeDocument({
      labelsByFor: { project_url: 'Project URL label' },
      textById: { helper_1: 'ARIA Labelled' },
    });

    const explicit = makeElement({
      'data-field-tooltip': 'Explicit hint',
      'aria-label': 'aria',
      placeholder: 'placeholder',
      id: 'project_url',
      'aria-labelledby': 'helper_1',
    });
    expect(resolveFieldHint(explicit, root)).toBe('Explicit hint');

    const aria = makeElement({
      'aria-label': 'Aria hint',
      placeholder: 'placeholder',
      id: 'project_url',
    });
    expect(resolveFieldHint(aria, root)).toBe('Aria hint');

    const placeholder = makeElement({
      placeholder: 'Placeholder hint',
      id: 'project_url',
    });
    expect(resolveFieldHint(placeholder, root)).toBe('Placeholder hint');
  });

  it('falls back to labelledby / html label / MUI label', () => {
    const root = makeDocument({
      labelsByFor: { project_name: 'Project Name Label' },
      textById: { helper_1: 'From labelledby' },
    });

    const labelledBy = makeElement({ 'aria-labelledby': 'helper_1' });
    expect(resolveFieldHint(labelledBy, root)).toBe('From labelledby');

    const htmlFor = makeElement({ id: 'project_name' });
    expect(resolveFieldHint(htmlFor, root)).toBe('Project Name Label');

    const mui = makeElement({}, { formControlLabelText: 'MUI Field Label' });
    expect(resolveFieldHint(mui, root)).toBe('MUI Field Label');
  });
});
