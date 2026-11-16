/** A tri-state checkbox (select all / group): checked, indeterminate, or disabled when there's nothing to pick. */
export interface CheckState {
  checked: boolean;
  indeterminate: boolean;
  disabled: boolean;
}

/** The parent checkbox state for a set of child flags. */
export function checkState(flags: readonly boolean[]): CheckState {
  const n = flags.filter(Boolean).length;
  return { checked: flags.length > 0 && n === flags.length, indeterminate: n > 0 && n < flags.length, disabled: flags.length === 0 };
}
