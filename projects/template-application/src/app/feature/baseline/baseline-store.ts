import { computed, inject, Injectable, signal } from '@angular/core';
import { BaselineMockService } from '../../core/baseline/baseline-mock.service';
import type { BaselineMode, BaselineRecord, BaselineValues } from '../../core/baseline/baseline.models';
import type { Sensor } from '../../core/vnv/vnv.models';

/** The Baseline page's state (provided by the page): the sensor list, the selected sensor and its history, and saving. */
@Injectable()
export class BaselineStore {
  private readonly service = inject(BaselineMockService);

  readonly sensors = signal<readonly Sensor[]>([]);
  readonly sensorsLoading = signal(false);
  readonly selectedId = signal<string | null>(null);
  /** The selected sensor's history, newest (current) first. */
  readonly history = signal<readonly BaselineRecord[]>([]);
  readonly historyLoading = signal(false);
  readonly saving = signal(false);
  readonly mode = signal<BaselineMode>('edit');

  readonly selected = computed(() => this.sensors().find((s) => s.id === this.selectedId()) ?? null);
  readonly current = computed(() => this.history()[0] ?? null);
  readonly busy = computed(() => this.historyLoading() || this.saving());

  /** Ignores responses for a sensor that's no longer selected. */
  private token = 0;

  async loadSensors(): Promise<void> {
    if (this.sensors().length || this.sensorsLoading()) return;
    this.sensorsLoading.set(true);
    try {
      this.sensors.set(await this.service.getSensors());
    } finally {
      this.sensorsLoading.set(false);
    }
  }

  /** Selects a sensor and loads its history; `null` clears the selection. */
  async select(id: string | null): Promise<void> {
    if (id === this.selectedId()) return;
    const token = ++this.token;
    this.selectedId.set(id);
    this.history.set([]);
    this.mode.set('edit');
    if (!id) {
      this.historyLoading.set(false);
      return;
    }
    this.historyLoading.set(true);
    try {
      const history = await this.service.getHistory(id);
      if (token === this.token) this.history.set(history);
    } finally {
      if (token === this.token) this.historyLoading.set(false);
    }
  }

  /** Saves the selected sensor's baseline in the current mode, then returns to Edit existing. */
  async save(values: BaselineValues): Promise<void> {
    const sensorId = this.selectedId();
    if (!sensorId) return;
    const token = this.token;
    this.saving.set(true);
    try {
      const history = await this.service.save({ sensorId, mode: this.mode(), values });
      if (token === this.token) {
        this.history.set(history);
        this.mode.set('edit');
      }
    } finally {
      this.saving.set(false);
    }
  }
}
