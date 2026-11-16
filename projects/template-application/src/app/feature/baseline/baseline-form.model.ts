import { startOfDay } from '../../core/mock-data/dates';
import type { BaselineMode, BaselineRecord, BaselineValues } from '../../core/baseline/baseline.models';

/** The form's fields, as the inputs hold them. */
export interface BaselineFormValue {
  startDate: Date | null;
  value: number | null;
  slopeRatePerYear: number | null;
  lowerLimitOffset: number | null;
  upperLimitOffset: number | null;
  comment: string;
}

export type BaselineField = keyof BaselineValues;

export const BASELINE_FIELDS: readonly BaselineField[] = ['startDate', 'value', 'slopeRatePerYear', 'lowerLimitOffset', 'upperLimitOffset', 'comment'];

/**
 * Where the form starts. Edit existing: the current baseline. Create new: the
 * current values, starting `today`, with an empty comment.
 */
export function initialFormValue(current: BaselineRecord, mode: BaselineMode, today: number): BaselineFormValue {
  return {
    startDate: new Date(mode === 'new' ? startOfDay(today) : current.startDate),
    value: current.value,
    slopeRatePerYear: current.slopeRatePerYear,
    lowerLimitOffset: current.lowerLimitOffset,
    upperLimitOffset: current.upperLimitOffset,
    comment: mode === 'new' ? '' : current.comment,
  };
}

/**
 * The start date must come after the baseline before it: the current one when
 * creating a new baseline, the previous one when editing. `null`: no limit.
 */
export function minStartDate(history: readonly BaselineRecord[], mode: BaselineMode): number | null {
  const before = mode === 'new' ? history[0] : history[1];
  return before ? before.startDate : null;
}

/** The form value as a baseline, or `null` while a required field is empty. */
export function toBaselineValues(v: BaselineFormValue): BaselineValues | null {
  const { startDate, value, slopeRatePerYear, lowerLimitOffset, upperLimitOffset } = v;
  if (!startDate || value === null || slopeRatePerYear === null || lowerLimitOffset === null || upperLimitOffset === null) return null;
  return { startDate: startOfDay(startDate.getTime()), value, slopeRatePerYear, lowerLimitOffset, upperLimitOffset, comment: v.comment.trim() };
}

/** The fields whose values differ from `current`. */
export function changedFields(values: BaselineValues, current: BaselineValues): Set<BaselineField> {
  return new Set(BASELINE_FIELDS.filter((f) => (f === 'comment' ? values.comment.trim() !== current.comment.trim() : values[f] !== current[f])));
}

/** `2` → `2.00`; the precision the baseline fields are shown and edited at. */
export function formatTemp(value: number): string {
  return value.toFixed(2);
}
