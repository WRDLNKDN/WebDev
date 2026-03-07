import { useEffect } from 'react';

const FIELD_SELECTOR = [
  'input:not([type="hidden"])',
  'textarea',
  '[role="combobox"]',
  '.MuiSelect-select',
].join(',');

export const cleanFieldTooltipText = (
  value: string | null | undefined,
): string => {
  return (value ?? '').replace(/\s+/g, ' ').trim();
};

const textByIds = (ids: string, root: Document): string => {
  const parts = ids
    .split(/\s+/)
    .map((id) => cleanFieldTooltipText(root.getElementById(id)?.textContent))
    .filter(Boolean);
  return cleanFieldTooltipText(parts.join(' '));
};

export const resolveFieldHint = (el: HTMLElement, root: Document): string => {
  const explicit = cleanFieldTooltipText(el.getAttribute('data-field-tooltip'));
  if (explicit) return explicit;

  const ariaLabel = cleanFieldTooltipText(el.getAttribute('aria-label'));
  if (ariaLabel) return ariaLabel;

  const placeholder = cleanFieldTooltipText(el.getAttribute('placeholder'));
  if (placeholder) return placeholder;

  const labelledBy = cleanFieldTooltipText(el.getAttribute('aria-labelledby'));
  if (labelledBy) {
    const text = textByIds(labelledBy, root);
    if (text) return text;
  }

  const id = cleanFieldTooltipText(el.getAttribute('id'));
  if (id) {
    const label = cleanFieldTooltipText(
      root.querySelector(`label[for="${id}"]`)?.textContent,
    );
    if (label) return label;
  }

  const formControl = el.closest('.MuiFormControl-root');
  const muiLabel = cleanFieldTooltipText(
    formControl?.querySelector('.MuiInputLabel-root')?.textContent,
  );
  if (muiLabel) return muiLabel;

  return '';
};

export const GlobalFormTooltips = () => {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const applyTitle = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return;
      const el = target.closest(FIELD_SELECTOR) as HTMLElement | null;
      if (!el) return;
      if (cleanFieldTooltipText(el.getAttribute('title'))) return;
      const hint = resolveFieldHint(el, document);
      if (!hint) return;
      el.setAttribute('title', hint);
    };

    const onMouseOver = (event: Event) => applyTitle(event.target);
    const onFocusIn = (event: Event) => applyTitle(event.target);

    document.addEventListener('mouseover', onMouseOver, true);
    document.addEventListener('focusin', onFocusIn, true);

    return () => {
      document.removeEventListener('mouseover', onMouseOver, true);
      document.removeEventListener('focusin', onFocusIn, true);
    };
  }, []);

  return null;
};
