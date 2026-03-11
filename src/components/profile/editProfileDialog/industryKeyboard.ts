export function findMatchingSubIndustryOption(
  inputValue: string,
  options: readonly string[],
  selectedValues: readonly string[],
): string | null {
  const query = inputValue.trim().toLowerCase();
  if (!query) return null;

  const availableOptions = options.filter(
    (option) =>
      !selectedValues.some(
        (selected) => selected.trim().toLowerCase() === option.toLowerCase(),
      ),
  );

  const exact = availableOptions.find(
    (option) => option.toLowerCase() === query,
  );
  if (exact) return exact;

  const prefix = availableOptions.find((option) =>
    option.toLowerCase().startsWith(query),
  );
  if (prefix) return prefix;

  return (
    availableOptions.find((option) => option.toLowerCase().includes(query)) ??
    null
  );
}

export function appendSubIndustrySelection(
  currentValues: readonly string[],
  nextValue: string,
  limit = 8,
): string[] {
  if (!nextValue.trim()) return [...currentValues];
  if (
    currentValues.some(
      (value) => value.trim().toLowerCase() === nextValue.trim().toLowerCase(),
    )
  ) {
    return [...currentValues];
  }
  if (currentValues.length >= limit) return [...currentValues];
  return [...currentValues, nextValue];
}
