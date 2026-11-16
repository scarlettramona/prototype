import type { Baseline } from '../vnv/vnv.models';
import { addDays } from '../mock-data/dates';
import { Rng } from '../mock-data/random';
import { round } from '../math/stats';
import type { BaselineRecord } from './baseline.models';

export interface BaselineHistoryConfig {
  seed: number;
  people: readonly string[];
  comments: readonly string[];
}

/**
 * A sensor's baseline history, newest first. The newest record is the sensor's
 * current baseline (the one VNV draws); 1–4 older records come before it,
 * each started 1–3 years earlier. Seeded: the same sensor always gets the same history.
 */
export function buildBaselineHistory(current: Baseline, config: BaselineHistoryConfig): BaselineRecord[] {
  const rng = Rng.for(config.seed, `baseline:history:${current.sensorId}`);
  const person = () => config.people[rng.int(0, config.people.length - 1)];
  const comment = () => (rng.chance(0.75) ? config.comments[rng.int(0, config.comments.length - 1)] : '');
  const record = (index: number, values: Omit<BaselineRecord, 'id' | 'sensorId' | 'comment' | 'savedBy' | 'savedAt'>): BaselineRecord => ({
    id: `${current.sensorId}|${index}`,
    sensorId: current.sensorId,
    ...values,
    comment: comment(),
    savedBy: person(),
    savedAt: addDays(values.startDate, rng.int(0, 6)),
  });

  const older = rng.int(1, 4);
  const records = [
    record(older, {
      startDate: current.startDate,
      value: current.value,
      slopeRatePerYear: current.slopeRatePerYear,
      lowerLimitOffset: current.lowerLimitOffset,
      upperLimitOffset: current.upperLimitOffset,
    }),
  ];
  let start = current.startDate;
  for (let i = older - 1; i >= 0; i--) {
    start = addDays(start, -rng.int(365, 1095));
    records.push(
      record(i, {
        startDate: start,
        value: round(current.value + rng.range(-1.5, 1.5), 2),
        slopeRatePerYear: round(rng.range(-0.05, 0.05), 2),
        lowerLimitOffset: round(rng.int(6, 12) * 0.25, 2),
        upperLimitOffset: round(rng.int(6, 12) * 0.25, 2),
      }),
    );
  }
  return records;
}
