import { inject, Injectable } from '@angular/core';
import { delay, MOCK_LATENCY } from '../mock-data/latency';
import { MOCK_DATA_CONFIG } from '../mock-data/mock-data.config';
import { MockDataService } from '../mock-data/mock-data.service';
import type { Reading, Sensor, VnvFarm, VnvLoadRequest, VnvLoadResult, VnvReviewRequest } from './vnv.models';

/**
 * The VNV "backend". Reads resolve after 300–800 ms. Reviews change the
 * readings in memory, so they last until the page reloads.
 */
@Injectable({ providedIn: 'root' })
export class VnvMockService {
  private readonly data = inject(MockDataService);
  private readonly latency = inject(MOCK_LATENCY);

  /** The Load sensors tree. */
  async getFarm(): Promise<VnvFarm> {
    const ds = await this.data.vnvDataset();
    return this.respond(structuredClone(ds.farm));
  }

  /** Sensor details for ids (unknown ids are skipped). */
  async getSensors(ids: readonly string[]): Promise<Sensor[]> {
    const ds = await this.data.vnvDataset();
    return this.respond(ids.flatMap((id) => (ds.sensors.has(id) ? [{ ...ds.sensors.get(id)! }] : [])));
  }

  /** Which of `ids` have readings in the range (for the picker's no-data state). */
  async sensorsWithData(ids: readonly string[], start: number, end: number): Promise<Set<string>> {
    const ds = await this.data.vnvDataset();
    const out = new Set<string>();
    for (const id of ids) {
      const s = ds.sensors.get(id);
      if (s && s.dataStart <= end && s.dataEnd >= start) out.add(id);
    }
    return this.respond(out);
  }

  /** Readings and reference data for the sensors, within [start, end]. */
  async load(request: VnvLoadRequest): Promise<VnvLoadResult> {
    const ds = await this.data.vnvDataset();
    const sensors = request.sensorIds.flatMap((id) => (ds.sensors.has(id) ? [{ ...ds.sensors.get(id)! }] : []));
    const readings = sensors.flatMap((s) =>
      ds
        .readingsFor(s.id)
        .filter((r) => r.timestamp >= request.start && r.timestamp <= request.end)
        .map((r) => ({ ...r })),
    );
    const ids = new Set(sensors.map((s) => s.id));
    return this.respond({
      sensors,
      readings,
      baselines: sensors.map((s) => ({ ...ds.baselines.get(s.id)! })),
      outOfService: ds.outOfService.filter((o) => ids.has(o.sensorId)).map((o) => ({ ...o })),
    });
  }

  /** Sets QI and comment on readings, recording the current user. Returns the updated readings. */
  async applyReview(request: VnvReviewRequest): Promise<Reading[]> {
    const ds = await this.data.vnvDataset();
    const now = Date.now();
    const updated: Reading[] = [];
    const bySensor = new Map<string, string[]>();
    for (const id of request.readingIds) {
      const sensorId = id.slice(0, id.lastIndexOf('|'));
      bySensor.set(sensorId, [...(bySensor.get(sensorId) ?? []), id]);
    }
    for (const [sensorId, ids] of bySensor) {
      const wanted = new Set(ids);
      for (const r of ds.readingsFor(sensorId)) {
        if (!wanted.has(r.id)) continue;
        r.qi = request.qi;
        r.comment = request.comment || undefined;
        r.reviewer = MOCK_DATA_CONFIG.currentUser;
        r.reviewedAt = now;
        updated.push({ ...r });
      }
    }
    return this.respond(updated);
  }

  private respond<T>(value: T): Promise<T> {
    return delay(this.latency(), value);
  }
}
