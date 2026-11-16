import { inject, Injectable } from '@angular/core';
import { delay, MOCK_LATENCY } from '../mock-data/latency';
import { MOCK_DATA_CONFIG } from '../mock-data/mock-data.config';
import { MockDataService } from '../mock-data/mock-data.service';
import type { Baseline, Sensor } from '../vnv/vnv.models';
import { buildBaselineHistory } from './baseline-history';
import type { BaselineRecord, BaselineSaveRequest } from './baseline.models';

/**
 * The Baseline "backend". Reads resolve after 300–800 ms. Saves change the
 * history in memory and the sensor's current baseline, so the VNV page draws
 * the new values too, until the page reloads.
 */
@Injectable({ providedIn: 'root' })
export class BaselineMockService {
  private readonly data = inject(MockDataService);
  private readonly latency = inject(MOCK_LATENCY);
  /** Histories built so far, newest first; built on first request. */
  private readonly histories = new Map<string, BaselineRecord[]>();
  private nextId = 0;

  /** Every sensor, for the sensor search. */
  async getSensors(): Promise<Sensor[]> {
    const ds = await this.data.vnvDataset();
    return this.respond([...ds.sensors.values()].map((s) => ({ ...s })).sort((a, b) => a.id.localeCompare(b.id)));
  }

  /** A sensor's baseline history, newest (the current baseline) first. */
  async getHistory(sensorId: string): Promise<BaselineRecord[]> {
    return this.respond((await this.history(sensorId)).map((r) => ({ ...r })));
  }

  /**
   * Saves a baseline, recording the current user. `edit` replaces the current
   * record; `new` adds a record that becomes the current one. Returns the updated history.
   */
  async save(request: BaselineSaveRequest): Promise<BaselineRecord[]> {
    const history = await this.history(request.sensorId);
    const saved: BaselineRecord = {
      id: request.mode === 'edit' && history[0] ? history[0].id : `${request.sensorId}|new-${this.nextId++}`,
      sensorId: request.sensorId,
      ...request.values,
      comment: request.values.comment.trim(),
      savedBy: MOCK_DATA_CONFIG.currentUser,
      savedAt: Date.now(),
    };
    if (request.mode === 'edit' && history.length) history[0] = saved;
    else history.unshift(saved);
    history.sort((a, b) => b.startDate - a.startDate);
    await this.syncCurrent(history[0]);
    return this.respond(history.map((r) => ({ ...r })));
  }

  private async history(sensorId: string): Promise<BaselineRecord[]> {
    let history = this.histories.get(sensorId);
    if (!history) {
      const ds = await this.data.vnvDataset();
      const current = ds.baselines.get(sensorId);
      if (!current) throw new Error(`Unknown sensor: ${sensorId}`);
      history = buildBaselineHistory(current, MOCK_DATA_CONFIG);
      this.histories.set(sensorId, history);
    }
    return history;
  }

  /** The newest record is the sensor's current baseline, which VNV reads. */
  private async syncCurrent(record: BaselineRecord): Promise<void> {
    const ds = await this.data.vnvDataset();
    const baseline: Baseline = {
      sensorId: record.sensorId,
      value: record.value,
      upperLimitOffset: record.upperLimitOffset,
      lowerLimitOffset: record.lowerLimitOffset,
      slopeRatePerYear: record.slopeRatePerYear,
      startDate: record.startDate,
    };
    // The dataset is the in-memory "database"; mock mutations write to it like applyReview does.
    (ds.baselines as Map<string, Baseline>).set(record.sensorId, baseline);
  }

  private respond<T>(value: T): Promise<T> {
    return delay(this.latency(), value);
  }
}
