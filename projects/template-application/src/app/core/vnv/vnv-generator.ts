import { addDays, DAY_MS, eachDay, endOfDay, parseUsDate } from '../mock-data/dates';
import type { MockDataConfig } from '../mock-data/mock-data.config';
import { Rng } from '../mock-data/random';
import type { Qi } from '../qi/qi.models';
import type { Baseline, OutOfService, Reading, Sensor, VnvFarm, VnvGroup, VnvLocation } from './vnv.models';
import type { VnvSource, VnvSourceReading } from './vnv-source';

/** Everything the VNV mock service serves. Readings are generated per sensor on first request. */
export interface VnvDataset {
  farm: VnvFarm;
  sensors: ReadonlyMap<string, Sensor>;
  baselines: ReadonlyMap<string, Baseline>;
  outOfService: readonly OutOfService[];
  /** All readings for a sensor, sorted by time. Deterministic and cached. */
  readingsFor(sensorId: string): Reading[];
}

/** How a generated sensor relates to the real series it derives from. */
interface Derivation {
  parent: string;
  offsetF: number;
}

interface RealStats {
  mean: number;
  std: number;
  /** Midpoint of the export window: the seasonal curve is anchored here. */
  anchor: number;
  /** Real rows replace generated ones within [start, end]. */
  start: number;
  end: number;
}

/**
 * Builds the VNV dataset: the real sensors and readings, untouched, plus
 * generated sensors (up to 40 in the real location, and the rest of the Load
 * sensors tree) and generated readings from 01/01/2025 to 11/12/2026.
 */
export function buildVnvDataset(source: VnvSource, config: MockDataConfig): VnvDataset {
  const vnv = config.vnv;
  const seed = config.seed;
  const rangeStart = parseUsDate(vnv.rangeStart);
  const rangeEnd = parseUsDate(vnv.rangeEnd);

  // Real series statistics.
  const realBySensor = groupBy(source.readings, (r) => r.sensorId);
  const realIds = [...realBySensor.keys()].sort();
  const stats = new Map<string, RealStats>();
  for (const id of realIds) {
    const values = realBySensor.get(id)!.map((r) => r.value);
    const meta = source.metadata.find((m) => m.sensorId === id);
    const times = realBySensor.get(id)!.map((r) => r.timestamp);
    const start = meta?.start ?? Math.min(...times);
    const end = meta?.end ?? Math.max(...times);
    stats.set(id, { mean: mean(values), std: std(values), anchor: (start + end) / 2, start, end: endOfDay(end) });
  }

  // Sensors and the location tree.
  const sensors = new Map<string, Sensor>();
  const derivations = new Map<string, Derivation>();
  const locations: VnvLocation[] = [];

  const main = vnv.mainLocation;
  const mainIds = [...realIds];
  for (let n = main.firstNumber; mainIds.length < main.sensorCount; n++) {
    const id = `${main.sensorPrefix}${String(n).padStart(3, '0')}`;
    if (!mainIds.includes(id)) mainIds.push(id);
  }
  mainIds.sort();
  locations.push({ id: main.id, groupId: main.groupId, sensorIds: mainIds });
  mainIds.forEach((id, i) => {
    const real = realBySensor.has(id);
    sensors.set(id, {
      id,
      locationId: main.id,
      elevationIn: 0,
      units: '°F',
      colorIndex: i,
      dataStart: rangeStart,
      dataEnd: rangeEnd,
      real,
    });
    if (!real) derivations.set(id, derive(seed, id, realIds, vnv.offsetF));
  });

  const noDataEnd = parseUsDate(vnv.noDataEnd);
  for (const loc of vnv.otherLocations) {
    const ids =
      loc.sensors === 'tmac'
        ? [1, 2, 3].flatMap((u) => ['A', 'B'].map((x) => `AN${loc.tank}-TMAC-TI-U${u}-RJ${x}`))
        : [36, 37, 38, 39, 40, 41].map((n) => `AN${loc.tank}-WST-TI-${String(n).padStart(3, '0')}`);
    locations.push({ id: loc.id, groupId: loc.groupId, sensorIds: ids });
    ids.forEach((id, i) => {
      const noData = Rng.for(seed, `vnv:nodata:${id}`).chance(vnv.noDataRate);
      sensors.set(id, {
        id,
        locationId: loc.id,
        elevationIn: 0,
        units: '°F',
        colorIndex: i,
        dataStart: rangeStart,
        dataEnd: noData ? noDataEnd : rangeEnd,
        real: false,
      });
      derivations.set(id, derive(seed, id, realIds, vnv.offsetF));
    });
  }

  const groupIds = [...new Set(locations.map((l) => l.groupId))].sort();
  const groups: VnvGroup[] = groupIds.map((gid) => ({
    id: gid,
    locations: locations.filter((l) => l.groupId === gid).sort((a, b) => a.id.localeCompare(b.id)),
  }));
  const farm: VnvFarm = { id: vnv.farm, groups };

  // Reference data.
  const baselines = new Map<string, Baseline>();
  for (const sensor of sensors.values()) {
    const rng = Rng.for(seed, `vnv:baseline:${sensor.id}`);
    const d = derivations.get(sensor.id);
    const level = d ? stats.get(d.parent)!.mean + d.offsetF : stats.get(sensor.id)!.mean;
    baselines.set(sensor.id, {
      sensorId: sensor.id,
      value: round(level + rng.range(-0.3, 0.3), 2),
      upperLimitOffset: round(rng.int(6, 12) * 0.25, 2),
      lowerLimitOffset: round(rng.int(6, 12) * 0.25, 2),
      slopeRatePerYear: round(rng.range(-0.05, 0.05), 2),
      startDate: parseUsDate(vnv.baselineStartDate),
    });
  }
  const outOfService: OutOfService[] = vnv.outOfService
    .filter((o) => sensors.has(o.sensorId))
    .map((o) => ({ sensorId: o.sensorId, start: parseUsDate(o.start), end: endOfDay(parseUsDate(o.end)) }));

  // Readings, generated lazily.
  const cache = new Map<string, Reading[]>();
  const readingsFor = (sensorId: string): Reading[] => {
    const hit = cache.get(sensorId);
    if (hit) return hit;
    const sensor = sensors.get(sensorId);
    if (!sensor) return [];
    const readings = sensor.real
      ? realSensorReadings(sensor, realBySensor.get(sensorId)!, stats.get(sensorId)!, config)
      : generatedReadings(sensor, derivations.get(sensorId)!, stats.get(derivations.get(sensorId)!.parent)!, config);
    cache.set(sensorId, readings);
    return readings;
  };

  return { farm, sensors, baselines, outOfService, readingsFor };
}

/** Real sensor: real rows inside the export window, generated around it. */
function realSensorReadings(sensor: Sensor, real: VnvSourceReading[], stats: RealStats, config: MockDataConfig): Reading[] {
  const generated = synthesize(sensor, stats.mean, stats, config).filter(
    (r) => r.timestamp < stats.start || r.timestamp > stats.end,
  );
  const realRows: Reading[] = real.map((r) => ({
    id: `${r.sensorId}|${r.timestamp}`,
    sensorId: r.sensorId,
    timestamp: r.timestamp,
    value: r.value,
    qi: r.qi,
    real: true,
  }));
  return [...generated, ...realRows].sort((a, b) => a.timestamp - b.timestamp);
}

function generatedReadings(sensor: Sensor, d: Derivation, parent: RealStats, config: MockDataConfig): Reading[] {
  return synthesize(sensor, parent.mean + d.offsetF, parent, config);
}

/**
 * Synthesises a sensor's series: level + yearly seasonal swing + day-to-day
 * drift (AR(1)) + within-day noise, quantised like the exports.
 */
function synthesize(sensor: Sensor, level: number, parent: RealStats, config: MockDataConfig): Reading[] {
  const vnv = config.vnv;
  const rng = Rng.for(config.seed, `vnv:readings:${sensor.id}`);
  const end = parseUsDate(vnv.rangeEnd);
  const unreviewedFrom = addDays(end, -(vnv.unreviewedDays - 1));
  const sigma = Math.max(parent.std, 0.4);
  const seasonal = (t: number) => vnv.seasonalAmplitudeF * Math.cos((2 * Math.PI * (dayOfYear(t) - 227)) / 365.25);
  const seasonalAtAnchor = seasonal(parent.anchor);

  const out: Reading[] = [];
  let drift = 0;
  for (const day of eachDay(sensor.dataStart, Math.min(sensor.dataEnd, end))) {
    drift = 0.8 * drift + rng.normal() * sigma * 0.45;
    const n = rng.int(vnv.readingsPerDay.min, vnv.readingsPerDay.max);
    for (let i = 0; i < n; i++) {
      const timestamp = day + Math.round(((i + 0.5) / n) * DAY_MS);
      const raw = level + (seasonal(timestamp) - seasonalAtAnchor) + drift + rng.normal() * sigma * 0.35;
      const reading: Reading = {
        id: `${sensor.id}|${timestamp}`,
        sensorId: sensor.id,
        timestamp,
        value: quantise(raw, vnv.quantumC),
        qi: 'Unreviewed',
        real: false,
      };
      if (day < unreviewedFrom) review(reading, rng, config, end);
      out.push(reading);
    }
  }
  return out;
}

function review(reading: Reading, rng: Rng, config: MockDataConfig, end: number): void {
  const mix = config.vnv.reviewedQiMix;
  const roll = rng.next();
  const qi: Qi = roll < mix.Good ? 'Good' : roll < mix.Good + mix.Suspect ? 'Suspect' : 'Transcribed';
  reading.qi = qi;
  reading.reviewer = rng.pick(config.people);
  reading.reviewedAt = Math.min(reading.timestamp + rng.int(1, 20) * DAY_MS, end);
  const commentRate = qi === 'Good' ? config.vnv.commentRate : 0.8;
  if (rng.chance(commentRate)) reading.comment = rng.pick(config.comments);
}

function derive(seed: number, id: string, realIds: string[], offset: { min: number; max: number }): Derivation {
  const rng = Rng.for(seed, `vnv:derive:${id}`);
  return { parent: rng.pick(realIds), offsetF: rng.sign() * rng.range(offset.min, offset.max) };
}

/** Round to the export's 0.1 °C step, expressed in °F, at float32 precision. */
export function quantise(valueF: number, quantumC: number): number {
  const c = Math.round((valueF - 32) / 1.8 / quantumC) * quantumC;
  return Math.fround(c * 1.8 + 32);
}

function dayOfYear(t: number): number {
  const d = new Date(t);
  return (t - new Date(d.getFullYear(), 0, 1).getTime()) / DAY_MS;
}

function groupBy<T>(items: readonly T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function std(values: number[]): number {
  const m = mean(values);
  return Math.sqrt(values.reduce((a, b) => a + (b - m) ** 2, 0) / values.length);
}

function round(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
