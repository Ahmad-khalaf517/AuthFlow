export const describedBy = (id: string, hasError: boolean, hasHint = false) =>
  hasError ? `${id}-error` : hasHint ? `${id}-hint` : undefined;
