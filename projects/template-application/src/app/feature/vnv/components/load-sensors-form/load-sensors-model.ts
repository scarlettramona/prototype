import { endOfDay } from '../../../../core/mock-data/dates';
import { checkState, type CheckState } from '../../../../core/selection/check-state';
import type { DateRange, Sensor, VnvFarm, VnvLocation } from '../../../../core/vnv/vnv.models';

export { checkState, type CheckState };

/**
 * Pure logic for the Load sensors form (Figma 1:11708…1:12068): name-token
 * filters, search, no-data, and the one-component-at-a-time selection.
 */

/** The selection: sensors of one location (one component at a time). */
export interface PickerSelection {
  locationId: string | null;
  ids: ReadonlySet<string>;
}

export const EMPTY_SELECTION: PickerSelection = { locationId: null, ids: new Set() };

/** Upper-case name tokens of a location id and a sensor id, split on '-'. */
export function tokensOf(locationId: string, sensorId: string): Set<string> {
  return new Set([...locationId.split('-'), ...sensorId.split('-')].map((t) => t.toUpperCase()));
}

/**
 * The Add filters menu: area codes and types from the location ids
 * (`241-AN-<AREA>-<tank>-<TYPE>`), e.g. TI, TMAC, WST, WSTA.
 */
export function filterOptions(farm: VnvFarm): string[] {
  const out = new Set<string>();
  for (const g of farm.groups) {
    for (const l of g.locations) {
      const parts = l.id.split('-');
      if (parts[2]) out.add(parts[2].toUpperCase());
      if (parts.length > 4) out.add(parts[parts.length - 1].toUpperCase());
    }
  }
  return [...out].sort();
}

/** Every chip must be one of the sensor's tokens (WST matches WST, not WSTA). */
export function matchesFilters(locationId: string, sensorId: string, filters: readonly string[]): boolean {
  if (filters.length === 0) return true;
  const tokens = tokensOf(locationId, sensorId);
  return filters.every((f) => tokens.has(f.toUpperCase()));
}

export function matchesSearch(sensorId: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  return q === '' || sensorId.toLowerCase().includes(q);
}

/** Does the sensor have readings in the range (whole days)? */
export function hasData(sensor: Pick<Sensor, 'dataStart' | 'dataEnd'>, range: DateRange): boolean {
  return sensor.dataStart <= endOfDay(range.end) && sensor.dataEnd >= range.start;
}

/**
 * The sensor name as Figma shows it: the stem plain, the distinguishing suffix
 * bold. `AN103-TMAC-TI-U1-RJA` → `AN103-TMAC-TI-` + **`U1-RJA`**.
 */
export function splitName(sensorId: string): { stem: string; suffix: string } {
  const parts = sensorId.split('-');
  if (parts.length <= 3) return { stem: '', suffix: sensorId };
  return { stem: parts.slice(0, 3).join('-') + '-', suffix: parts.slice(3).join('-') };
}

export interface TextSegment {
  text: string;
  match: boolean;
}

/** Splits text into segments, marking case-insensitive matches of `query`. */
export function highlight(text: string, query: string): TextSegment[] {
  const q = query.trim();
  if (!q) return [{ text, match: false }];
  const out: TextSegment[] = [];
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  let i = 0;
  for (let at = lower.indexOf(needle); at !== -1; at = lower.indexOf(needle, i)) {
    if (at > i) out.push({ text: text.slice(i, at), match: false });
    out.push({ text: text.slice(at, at + q.length), match: true });
    i = at + q.length;
  }
  if (i < text.length) out.push({ text: text.slice(i), match: false });
  return out;
}

// ── Tree ────────────────────────────────────────────────────────────────────

export interface TreeLocationVm {
  id: string;
  groupId: string;
  selectedCount: number;
}

export interface TreeGroupVm {
  id: string;
  locations: TreeLocationVm[];
}

/** Groups → locations that have at least one sensor passing the filters (and search, when searching). */
export function buildTree(
  farm: VnvFarm,
  filters: readonly string[],
  query: string,
  selection: PickerSelection,
): TreeGroupVm[] {
  return farm.groups
    .map((g) => ({
      id: g.id,
      locations: g.locations
        .filter((l) => l.sensorIds.some((id) => matchesFilters(l.id, id, filters) && matchesSearch(id, query)))
        .map((l) => ({
          id: l.id,
          groupId: g.id,
          selectedCount: selection.locationId === l.id ? selection.ids.size : 0,
        })),
    }))
    .filter((g) => g.locations.length > 0);
}

// ── List (browse) ───────────────────────────────────────────────────────────

export interface SensorRowVm {
  id: string;
  stem: string;
  suffix: string;
  loaded: boolean;
  noData: boolean;
  checked: boolean;
}

export interface SensorListVm {
  location: VnvLocation;
  rows: SensorRowVm[];
  /** Sensors (after filters) with no readings in the range. */
  noDataCount: number;
  selectAll: CheckState;
}

/** The right column for one location. No-data rows are hidden unless `showNoData`. */
export function buildList(
  location: VnvLocation,
  sensorsById: ReadonlyMap<string, Sensor>,
  filters: readonly string[],
  range: DateRange,
  loaded: ReadonlySet<string>,
  selection: PickerSelection,
  showNoData: boolean,
): SensorListVm {
  const ids = location.sensorIds.filter((id) => matchesFilters(location.id, id, filters));
  const mine = selection.locationId === location.id ? selection.ids : new Set<string>();
  const all = ids.map((id) => {
    const s = sensorsById.get(id);
    const { stem, suffix } = splitName(id);
    return { id, stem, suffix, loaded: loaded.has(id), noData: !s || !hasData(s, range), checked: mine.has(id) };
  });
  const noDataCount = all.filter((r) => r.noData).length;
  const rows = showNoData ? all : all.filter((r) => !r.noData);
  return { location, rows, noDataCount, selectAll: checkState(rows.filter((r) => !r.noData).map((r) => r.checked)) };
}

// ── Search ──────────────────────────────────────────────────────────────────

export interface SearchRowVm {
  id: string;
  segments: TextSegment[];
  noData: boolean;
  checked: boolean;
}

export interface SearchGroupVm {
  groupId: string;
  locationId: string;
  rows: SearchRowVm[];
  check: CheckState;
  /** Every match here has no data in the range: the group is dimmed. */
  disabled: boolean;
}

export interface SearchVm {
  query: string;
  count: number;
  groups: SearchGroupVm[];
}

/** The right column while searching: matches grouped by location (Figma 1:12068). */
export function buildSearch(
  farm: VnvFarm,
  sensorsById: ReadonlyMap<string, Sensor>,
  filters: readonly string[],
  query: string,
  range: DateRange,
  selection: PickerSelection,
): SearchVm {
  const groups: SearchGroupVm[] = [];
  for (const g of farm.groups) {
    for (const l of g.locations) {
      const ids = l.sensorIds.filter((id) => matchesFilters(l.id, id, filters) && matchesSearch(id, query));
      if (ids.length === 0) continue;
      const mine = selection.locationId === l.id ? selection.ids : new Set<string>();
      const rows = ids.map((id) => {
        const s = sensorsById.get(id);
        return { id, segments: highlight(id, query), noData: !s || !hasData(s, range), checked: mine.has(id) };
      });
      const selectable = rows.filter((r) => !r.noData);
      groups.push({
        groupId: g.id,
        locationId: l.id,
        rows,
        check: checkState(selectable.map((r) => r.checked)),
        disabled: selectable.length === 0,
      });
    }
  }
  return { query: query.trim(), count: groups.reduce((n, g) => n + g.rows.length, 0), groups };
}

// ── Selection rule: one component at a time ─────────────────────────────────

export function toggleSensor(sel: PickerSelection, locationId: string, id: string): PickerSelection {
  const ids = new Set(sel.locationId === locationId ? sel.ids : []);
  if (ids.has(id)) ids.delete(id);
  else ids.add(id);
  return ids.size ? { locationId, ids } : EMPTY_SELECTION;
}

export function setSensors(sel: PickerSelection, locationId: string, ids: readonly string[], on: boolean): PickerSelection {
  const next = new Set(sel.locationId === locationId ? sel.ids : []);
  for (const id of ids) {
    if (on) next.add(id);
    else next.delete(id);
  }
  return next.size ? { locationId, ids: next } : EMPTY_SELECTION;
}
