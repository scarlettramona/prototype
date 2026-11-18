import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, model, output, signal, untracked } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { startOfDay } from '../../../../core/mock-data/dates';
import { defaultDateRange, MOCK_TODAY } from '../../../../core/mock-data/today';
import { TANK_FARMS } from '../../../../core/vnv/tank-farms';
import type { Sensor, VnvFarm } from '../../../../core/vnv/vnv.models';
import type { DateRangeValue } from '../../../../ui/components/date-range-field/date-range-field.component';
import {
  buildList,
  buildSearch,
  buildTree,
  EMPTY_SELECTION,
  FILTER_KINDS,
  filterOptions,
  sameFilter,
  setSensors,
  toggleExpanded,
  toggleSensor,
  type PickerFilter,
  type PickerSelection,
} from './load-sensors-model';

export interface LoadSensorsInit {
  locationId: string | null;
  /** Pre-selected sensors (the loaded ones, in the popover). */
  selectedIds: readonly string[];
  search: string;
  filters: readonly PickerFilter[];
  showNoData: boolean;
}

export interface LoadSensorsRequest {
  locationId: string;
  sensorIds: string[];
  range: DateRangeValue;
}

let nextId = 0;

/** "Set to default" and the first visit: the last 90 days, ending today. */
export function defaultLoadRange(today: number): DateRangeValue {
  return defaultDateRange(today);
}

/**
 * Load sensors (Figma sensor-query 1:11708 … 1:12068): Farm, dates, search,
 * Add filters (Equipment / Tank / Component type submenus, as chips), then the
 * farm tree (equipment → tank → component, each row with its count of sensors
 * that have data), the sensors of the chosen component, and the footer with
 * the selection summary and Load sensors.
 * - `page`: first visit, the form is the page; the footer sticks to the window.
 * - `dialog`: from Load data, in a centred modal; the columns scroll inside.
 */
@Component({
  selector: 'app-load-sensors-form',
  imports: [
    NgTemplateOutlet,
    MatButtonModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTooltipModule,
  ],
  templateUrl: './load-sensors-form.component.html',
  styleUrl: './load-sensors-form.component.scss',
  host: { class: 'app-filled-fields', '[class.dialog]': "mode() === 'dialog'", '[class.page]': "mode() === 'page'", '[class.searching]': 'searching()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadSensorsFormComponent {
  private readonly today = inject(MOCK_TODAY);
  protected readonly fieldId = `load-sensors-${nextId++}`;
  readonly mode = input<'page' | 'dialog'>('page');
  readonly farm = input.required<VnvFarm>();
  /** Every tank farm; only the loaded farm (AN, the only one with data) can be chosen. */
  protected readonly tankFarms = TANK_FARMS;
  readonly sensors = input.required<readonly Sensor[]>();
  readonly loadedSensorIds = input<readonly string[]>([]);
  readonly initial = input<LoadSensorsInit | null>(null);
  /** Shared with the page header's date range. */
  readonly range = model.required<DateRangeValue>();

  readonly load = output<LoadSensorsRequest>();
  readonly cancel = output<void>();

  protected readonly search = signal('');
  protected readonly filters = signal<PickerFilter[]>([]);
  protected readonly selection = signal<PickerSelection>(EMPTY_SELECTION);
  protected readonly activeLocationId = signal<string | null>(null);
  protected readonly expanded = signal<ReadonlySet<string>>(new Set());
  protected readonly showNoData = signal(false);

  private readonly sensorsById = computed(() => new Map(this.sensors().map((s) => [s.id, s])));
  private readonly loaded = computed(() => new Set(this.loadedSensorIds()));
  private readonly locations = computed(() => new Map(this.farm().groups.flatMap((g) => g.locations.map((l) => [l.id, l] as const))));

  private readonly options = computed(() => filterOptions(this.farm()));
  /** Add filters → Equipment / Tank / Component type, each without the values already chosen. */
  protected readonly filterMenus = computed(() =>
    FILTER_KINDS.map((k) => ({
      ...k,
      values: this.options()[k.kind].filter((value) => !this.filters().some((f) => sameFilter(f, { kind: k.kind, value }))),
    })),
  );
  protected readonly searching = computed(() => this.search().trim() !== '');
  protected readonly tree = computed(() => buildTree(this.farm(), this.sensorsById(), this.filters(), this.search(), this.range()));
  protected readonly list = computed(() => {
    const loc = this.locations().get(this.activeLocationId() ?? '');
    return loc ? buildList(loc, this.sensorsById(), this.range(), this.loaded(), this.selection(), this.showNoData()) : null;
  });
  protected readonly results = computed(() =>
    this.searching() ? buildSearch(this.farm(), this.sensorsById(), this.filters(), this.search(), this.range(), this.selection()) : null,
  );
  /** Equipment group shared by every search match, shown once instead of on each header. */
  protected readonly sharedGroup = computed(() => {
    const ids = new Set(this.results()?.groups.map((g) => g.groupId));
    return ids.size === 1 ? [...ids][0] : null;
  });
  protected readonly summary = computed(() => {
    const s = this.selection();
    return s.locationId ? `${s.locationId} | ${s.ids.size} selected` : '';
  });

  protected readonly startDate = computed(() => new Date(this.range().start));
  protected readonly endDate = computed(() => new Date(this.range().end));

  constructor() {
    // (Re)initialise whenever the host passes new initial values (opening the popover, a ?state= fixture).
    effect(() => {
      const init = this.initial();
      untracked(() => this.reset(init));
    });
  }

  /** Back to `init`, or to an empty form (first visit Cancel). */
  reset(init: LoadSensorsInit | null = null): void {
    this.search.set(init?.search ?? '');
    this.filters.set([...(init?.filters ?? [])]);
    this.showNoData.set(init?.showNoData ?? false);
    const locationId = init?.locationId ?? null;
    const ids = init?.selectedIds ?? [];
    this.selection.set(locationId && ids.length ? { locationId, ids: new Set(ids) } : EMPTY_SELECTION);
    this.activeLocationId.set(locationId);
    const loc = locationId ? this.locations().get(locationId) : undefined;
    this.expanded.set(new Set(loc ? [loc.groupId, ...(loc.tankId ? [loc.tankId] : [])] : []));
  }

  /** Equipment and tank rows; everything is open while searching. */
  protected isExpanded(id: string): boolean {
    return this.searching() || this.expanded().has(id);
  }

  /** One equipment group open at a time, and one tank within it (`toggleExpanded`). */
  protected toggleNode(id: string): void {
    this.expanded.set(toggleExpanded(this.farm(), this.expanded(), id));
  }

  protected openLocation(locationId: string): void {
    this.activeLocationId.set(locationId);
  }

  protected toggle(locationId: string, id: string): void {
    this.selection.set(toggleSensor(this.selection(), locationId, id));
  }

  protected setAll(locationId: string, ids: readonly string[], on: boolean): void {
    this.selection.set(setSensors(this.selection(), locationId, ids, on));
  }

  /** "Show in tree": leave search and open that component. */
  protected showInTree(groupId: string, tankId: string | null, locationId: string): void {
    this.search.set('');
    this.activeLocationId.set(locationId);
    this.expanded.set(new Set([groupId, ...(tankId ? [tankId] : [])]));
  }

  protected addFilter(filter: PickerFilter): void {
    this.filters.set([...this.filters(), filter]);
  }

  protected removeFilter(filter: PickerFilter): void {
    this.filters.set(this.filters().filter((f) => !sameFilter(f, filter)));
  }

  protected kindLabel(filter: PickerFilter): string {
    return FILTER_KINDS.find((k) => k.kind === filter.kind)?.label ?? '';
  }

  protected setStart(d: Date | null): void {
    if (d) this.range.set({ start: startOfDay(d.getTime()), end: Math.max(this.range().end, startOfDay(d.getTime())) });
  }

  protected setEnd(d: Date | null): void {
    if (d) this.range.set({ start: Math.min(this.range().start, startOfDay(d.getTime())), end: startOfDay(d.getTime()) });
  }

  protected setDefaultDates(): void {
    this.range.set(defaultLoadRange(this.today));
  }

  protected submit(): void {
    const s = this.selection();
    if (!s.locationId || s.ids.size === 0) return;
    // Keep the location's sensor order.
    const order = this.locations().get(s.locationId)?.sensorIds ?? [];
    this.load.emit({ locationId: s.locationId, sensorIds: order.filter((id) => s.ids.has(id)), range: this.range() });
  }

  protected onCancel(): void {
    if (this.mode() === 'page') {
      this.reset(null);
      this.range.set(defaultLoadRange(this.today));
    }
    this.cancel.emit();
  }

}
