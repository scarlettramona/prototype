import { parseUsDate, startOfDay } from '../mock-data/dates';
import { MOCK_DATA_CONFIG } from '../mock-data/mock-data.config';
import { buildTestVnvDataset, loadVnvSource, readMockFile } from '../mock-data/testing/load-mock-sources';
import { parseCsvRecords } from '../mock-data/csv';
import { buildVnvDataset, quantise } from './vnv-generator';

describe('VNV source', () => {
  it('parses all 212 real readings as Unreviewed, across 5 sensors', () => {
    const src = loadVnvSource();
    expect(src.readings.length).toBe(212);
    expect(new Set(src.readings.map((r) => r.sensorId)).size).toBe(5);
    expect(src.readings.every((r) => r.qi === 'Unreviewed')).toBe(true);
  });

  it('spreads same-day readings evenly across the day, in file order', () => {
    const src = loadVnvSource();
    const day = src.readings.filter((r) => r.sensorId === 'AN102-WSTA-TI-074' && startOfDay(r.timestamp) === parseUsDate('10/13/2026'));
    expect(day.length).toBeGreaterThan(1);
    const times = day.map((r) => r.timestamp);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    const gaps = times.slice(1).map((t, i) => t - times[i]);
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThanOrEqual(1);
  });
});

describe('VNV generator', () => {
  const ds = buildTestVnvDataset();
  const main = MOCK_DATA_CONFIG.vnv.mainLocation;

  it('fills the real location to 40 sensors named AN102-WSTA-TI-0xx', () => {
    const location = ds.farm.groups.flatMap((g) => g.locations).find((l) => l.id === main.id)!;
    expect(location.sensorIds.length).toBe(40);
    expect(location.sensorIds.every((id) => /^AN102-WSTA-TI-0\d\d$/.test(id))).toBe(true);
    expect(new Set(location.sensorIds.map((id) => ds.sensors.get(id)!.colorIndex)).size).toBe(40);
  });

  it('keeps every real reading unchanged', () => {
    const csv = parseCsvRecords(readMockFile('vnv/vnv-readings.csv'));
    const src = loadVnvSource();
    src.readings.forEach((r, i) => {
      const generated = ds.readingsFor(r.sensorId).find((x) => x.id === `${r.sensorId}|${r.timestamp}`);
      expect(generated).toBeDefined();
      expect(generated!.real).toBe(true);
      expect(generated!.value).toBe(Number(csv[i]['value']));
      expect(generated!.qi).toBe('Unreviewed');
    });
    const realCount = [...ds.sensors.values()].flatMap((s) => (s.real ? ds.readingsFor(s.id) : [])).filter((r) => r.real).length;
    expect(realCount).toBe(212);
  });

  it('is deterministic', () => {
    const again = buildVnvDataset(loadVnvSource(), MOCK_DATA_CONFIG);
    for (const id of ['AN102-WSTA-TI-041', 'AN102-WSTA-TI-054', 'AN103-TMAC-TI-U1-RJA']) {
      expect(again.readingsFor(id)).toEqual(ds.readingsFor(id));
    }
    expect(again.baselines).toEqual(ds.baselines);
  });

  it('covers 01/01/2025 → 11/12/2026 with 1–4 readings a day, quantised like the exports', () => {
    const readings = ds.readingsFor('AN102-WSTA-TI-041');
    expect(startOfDay(readings[0].timestamp)).toBe(parseUsDate('1/1/2025'));
    expect(startOfDay(readings.at(-1)!.timestamp)).toBe(parseUsDate('11/12/2026'));
    const perDay = new Map<number, number>();
    for (const r of readings) perDay.set(startOfDay(r.timestamp), (perDay.get(startOfDay(r.timestamp)) ?? 0) + 1);
    expect(Math.min(...perDay.values())).toBeGreaterThanOrEqual(1);
    expect(Math.max(...perDay.values())).toBeLessThanOrEqual(4);
    expect(readings.every((r) => r.value === quantise(r.value, 0.1))).toBe(true);
  });

  it('starts every reading Unreviewed, with no reviewer or comment, real rows included', () => {
    const readings = [...ds.sensors.values()].flatMap((s) => ds.readingsFor(s.id));
    expect(readings.some((r) => r.real)).toBe(true);
    expect(readings.every((r) => r.qi === 'Unreviewed' && !r.reviewer && !r.reviewedAt && !r.comment)).toBe(true);
  });

  it('has baselines, out-of-service windows and some no-data sensors', () => {
    expect(ds.baselines.size).toBe(ds.sensors.size);
    expect(ds.outOfService.length).toBeGreaterThanOrEqual(1);
    expect([...ds.sensors.values()].some((s) => s.dataEnd < parseUsDate('7/19/2026'))).toBe(true);
  });
});
