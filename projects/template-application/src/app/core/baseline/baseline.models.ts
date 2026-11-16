/** One baseline record for a sensor: the values in force from `startDate` until the next record starts. */
export interface BaselineRecord {
  id: string;
  sensorId: string;
  startDate: number;
  /** °F */
  value: number;
  /** °F per year */
  slopeRatePerYear: number;
  /** °F below the baseline */
  lowerLimitOffset: number;
  /** °F above the baseline */
  upperLimitOffset: number;
  comment: string;
  savedBy: string;
  savedAt: number;
}

/** The editable part of a baseline. */
export type BaselineValues = Pick<BaselineRecord, 'startDate' | 'value' | 'slopeRatePerYear' | 'lowerLimitOffset' | 'upperLimitOffset' | 'comment'>;

/** `edit`: correct the current baseline in place. `new`: start a new baseline after it. */
export type BaselineMode = 'edit' | 'new';

export interface BaselineSaveRequest {
  sensorId: string;
  mode: BaselineMode;
  values: BaselineValues;
}

/** The lower limit, °F. */
export function lowerLimit(b: Pick<BaselineRecord, 'value' | 'lowerLimitOffset'>): number {
  return b.value - b.lowerLimitOffset;
}

/** The upper limit, °F. */
export function upperLimit(b: Pick<BaselineRecord, 'value' | 'upperLimitOffset'>): number {
  return b.value + b.upperLimitOffset;
}
