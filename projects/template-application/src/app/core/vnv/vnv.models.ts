import type { Qi } from '../qi/qi.models';

/** Farm → group → location → sensors, as the Load sensors tree shows them. */
export interface VnvFarm {
  id: string; // 'AN'
  groups: VnvGroup[];
}

export interface VnvGroup {
  id: string; // '241-AN-TMAC'
  locations: VnvLocation[];
}

/** A "component" in the page header, e.g. `241-AN-TMAC-103-TI · 6 sensors`. */
export interface VnvLocation {
  id: string; // '241-AN-TMAC-103-TI'
  groupId: string;
  sensorIds: string[];
}

export interface Sensor {
  id: string; // 'AN102-WSTA-TI-054'
  /** The location (component) the sensor belongs to. */
  locationId: string;
  /** Shown muted after the name: `AN102-WSTA-TI-054 (0in)`. */
  elevationIn: number;
  units: '°F';
  /** Index into the chart series palette, stable for the sensor. */
  colorIndex: number;
  /** First and last day the sensor has readings. Outside this range it has "no data". */
  dataStart: number;
  dataEnd: number;
  /** True for the five sensors exported from the real system. */
  real: boolean;
}

export interface Reading {
  /** Stable id: `<sensorId>|<timestamp>`. */
  id: string;
  sensorId: string;
  /** Local timestamp (ms). Same-day source readings are spread evenly across the day. */
  timestamp: number;
  /** °F, stored as exported (float32 precision). Display with 2 decimals. */
  value: number;
  qi: Qi;
  comment?: string;
  reviewer?: string;
  reviewedAt?: number;
  /** True for rows from the real export. */
  real: boolean;
}

/** Baseline reference settings for a sensor (right panel, "Baseline sensor"). */
export interface Baseline {
  sensorId: string;
  /** °F */
  value: number;
  /** °F */
  upperLimitOffset: number;
  /** °F */
  lowerLimitOffset: number;
  /** °F per year */
  slopeRatePerYear: number;
  startDate: number;
}

/** An "Equipment out of service" window for a sensor. */
export interface OutOfService {
  sensorId: string;
  start: number;
  end: number;
}

export interface DateRange {
  start: number;
  end: number;
}

export interface VnvLoadRequest extends DateRange {
  sensorIds: string[];
}

export interface VnvLoadResult {
  sensors: Sensor[];
  /** Sorted by sensor, then time. */
  readings: Reading[];
  baselines: Baseline[];
  outOfService: OutOfService[];
}

export interface VnvReviewRequest {
  readingIds: string[];
  qi: Qi;
  comment: string;
}
