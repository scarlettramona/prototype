import { TestBed } from '@angular/core/testing';
import { parseUsDate } from '../mock-data/dates';
import { MOCK_DATA_CONFIG } from '../mock-data/mock-data.config';
import { provideTestMockData } from '../mock-data/testing/provide-test-mock-data';
import { VnvMockService } from '../vnv/vnv-mock.service';
import { BaselineMockService } from './baseline-mock.service';
import type { BaselineValues } from './baseline.models';

describe('BaselineMockService', () => {
  const sensorId = 'AN103-TMAC-TI-U1-RJA';
  let service: BaselineMockService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideTestMockData() });
    service = TestBed.inject(BaselineMockService);
  });

  it('lists every sensor, sorted', async () => {
    const sensors = await service.getSensors();
    expect(sensors.length).toBe(160);
    expect(sensors.map((s) => s.id)).toEqual([...sensors.map((s) => s.id)].sort((a, b) => a.localeCompare(b)));
  });

  it('builds a seeded history, newest first, ending with the VNV baseline', async () => {
    const history = await service.getHistory(sensorId);
    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < history.length; i++) expect(history[i].startDate).toBeLessThan(history[i - 1].startDate);
    const [vnv] = (await TestBed.inject(VnvMockService).load({ sensorIds: [sensorId], start: 0, end: 0 })).baselines;
    expect(history[0]).toMatchObject({ value: vnv.value, startDate: vnv.startDate, lowerLimitOffset: vnv.lowerLimitOffset });
    expect(await service.getHistory(sensorId)).toEqual(history);
  });

  it('edit replaces the current record; new adds one; both update the VNV baseline', async () => {
    const before = await service.getHistory(sensorId);
    const values: BaselineValues = { ...before[0], value: 80.5, comment: '  Recalibrated  ' };

    const edited = await service.save({ sensorId, mode: 'edit', values });
    expect(edited.length).toBe(before.length);
    expect(edited[0]).toMatchObject({ id: before[0].id, value: 80.5, comment: 'Recalibrated', savedBy: MOCK_DATA_CONFIG.currentUser });

    const added = await service.save({ sensorId, mode: 'new', values: { ...values, startDate: parseUsDate('11/16/2026'), value: 81 } });
    expect(added.length).toBe(before.length + 1);
    expect(added[0].value).toBe(81);
    expect(added[1].value).toBe(80.5);

    const [vnv] = (await TestBed.inject(VnvMockService).load({ sensorIds: [sensorId], start: 0, end: 0 })).baselines;
    expect(vnv.value).toBe(81);
  });

  it('restore puts the history and the VNV baseline back (Undo)', async () => {
    const before = await service.getHistory(sensorId);
    await service.save({ sensorId, mode: 'new', values: { ...before[0], startDate: parseUsDate('11/16/2026'), value: 90 } });
    const restored = await service.restore(sensorId, before);
    expect(restored).toEqual(before);
    expect(await service.getHistory(sensorId)).toEqual(before);
    const [vnv] = (await TestBed.inject(VnvMockService).load({ sensorIds: [sensorId], start: 0, end: 0 })).baselines;
    expect(vnv.value).toBe(before[0].value);
  });
});
