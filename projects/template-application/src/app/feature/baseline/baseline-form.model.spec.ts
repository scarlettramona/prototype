import type { BaselineRecord } from '../../core/baseline/baseline.models';
import { parseUsDate } from '../../core/mock-data/dates';
import { changedFields, initialFormValue, minStartDate, toBaselineValues } from './baseline-form.model';

const record = (startDate: string, value: number): BaselineRecord => ({
  id: startDate,
  sensorId: 's',
  startDate: parseUsDate(startDate),
  value,
  slopeRatePerYear: 0.02,
  lowerLimitOffset: 1.5,
  upperLimitOffset: 2,
  comment: 'Old comment',
  savedBy: 'Someone',
  savedAt: 0,
});

describe('Baseline form model', () => {
  const history = [record('4/19/2013', 77.9), record('6/1/2011', 76.5)];
  const today = parseUsDate('11/16/2026') + 15 * 3600_000;

  it('starts Edit existing at the current baseline, Create new at today with no comment', () => {
    expect(initialFormValue(history[0], 'edit', today)).toMatchObject({ value: 77.9, comment: 'Old comment' });
    expect(initialFormValue(history[0], 'edit', today).startDate!.getTime()).toBe(parseUsDate('4/19/2013'));
    const fresh = initialFormValue(history[0], 'new', today);
    expect(fresh.startDate!.getTime()).toBe(parseUsDate('11/16/2026'));
    expect(fresh).toMatchObject({ value: 77.9, comment: '' });
  });

  it('limits the start date to after the baseline before it', () => {
    expect(minStartDate(history, 'new')).toBe(parseUsDate('4/19/2013'));
    expect(minStartDate(history, 'edit')).toBe(parseUsDate('6/1/2011'));
    expect(minStartDate(history.slice(0, 1), 'edit')).toBeNull();
  });

  it('converts the form value and finds the changed fields', () => {
    const v = toBaselineValues({ ...initialFormValue(history[0], 'edit', today), value: 78.25, comment: ' Old comment ' })!;
    expect(v.comment).toBe('Old comment');
    expect([...changedFields(v, history[0])]).toEqual(['value']);
    expect(toBaselineValues({ ...initialFormValue(history[0], 'edit', today), upperLimitOffset: null })).toBeNull();
  });
});
