import type { AnalysisFilter, AnalysisState, QiFilter } from '../ill/ill.models';
import type { Qi } from '../qi/qi.models';

/**
 * Named screen states, reachable with `?state=<name>`. Each fixture describes
 * what's loaded, the view, selections, open popovers and analysis states, in
 * data-independent terms; `resolvePrototypeState()` turns it into concrete ids.
 * Screens read the resolved state from `PrototypeStateService`.
 *
 * `frame` is the Figma node in file Eb0lHuZv2e067FftD2RuqL that the state
 * reproduces, where one exists.
 */

export interface VnvFixture {
  module: 'vnv';
  frame?: string;
  /** `null`: nothing loaded yet (first visit). Dates are M/D/YYYY. */
  loaded: null | {
    locationId: string;
    start: string;
    end: string;
    showAllData: boolean;
  };
  view: 'chart' | 'table';
  /** How many sensors to hide (from the end of the legend). */
  hiddenSensorCount?: number;
  /** QIs shown by the quality filter. Default: all. */
  visibleQi?: readonly Qi[];
  /** Select this many readings (the newest of the first visible sensor). */
  selectionCount?: number;
  popover?: 'load-form' | 'vnv-form';
  /** Load sensors form contents, when it's open or is the page. */
  loadForm?: { start: string; end: string; locationId?: string; search?: string; filters?: readonly string[] };
}

export interface IllLibraryFixture {
  module: 'ill';
  screen: 'library';
  frame?: string;
  /** `null`: the form, no results yet. Dates are M/D/YYYY. */
  query: { start: string; end: string; qi: QiFilter; analysis: AnalysisFilter };
  loaded: boolean;
  groupByWell: boolean;
  /** Select all scans of the first well (grouped) or the first N rows. */
  selection?: 'first-well' | number;
  /** Expand the first result row whose scan has a saved analysis. */
  expandFirstSaved?: boolean;
}

export interface IllFocusFixture {
  module: 'ill';
  screen: 'focus';
  frame?: string;
  /** Opens every scan of the focus well. */
  well: 'focus';
  /** `all` = the All scans tab; otherwise the first scan in that analysis state. */
  activeTab: 'all' | AnalysisState;
  popover?: 'scans-legend';
  /** Depth window in inches, [from, to] in axis order (600 → 0). Default: full range. */
  zoom?: readonly [number, number];
}

export type PrototypeFixture = VnvFixture | IllLibraryFixture | IllFocusFixture;

const VNV_LOADED = {
  locationId: '241-AN-WSTA-102-TI',
  start: '1/1/2025',
  end: '11/12/2026',
  showAllData: true,
} as const;

const LOAD_FORM_DATES = { start: '7/19/2026', end: '10/19/2026' } as const;

const LIBRARY_QUERY = { start: '7/19/2026', end: '10/19/2026', qi: 'Any', analysis: 'Unsaved' } as const;

export const PROTOTYPE_STATES = {
  // VNV
  'vnv-first-visit': { module: 'vnv', frame: '1:10989', loaded: null, view: 'chart', loadForm: { ...LOAD_FORM_DATES } },
  'vnv-chart': { module: 'vnv', frame: '1:11401', loaded: VNV_LOADED, view: 'chart' },
  'vnv-chart-load-form-open': {
    module: 'vnv',
    frame: '1:11102',
    loaded: VNV_LOADED,
    view: 'chart',
    popover: 'load-form',
    loadForm: { ...LOAD_FORM_DATES, locationId: VNV_LOADED.locationId, filters: ['TI', 'WST'] },
  },
  'vnv-load-form-search': {
    module: 'vnv',
    frame: '1:12068',
    loaded: VNV_LOADED,
    view: 'chart',
    popover: 'load-form',
    loadForm: { ...LOAD_FORM_DATES, search: 'U3', filters: ['TI', 'WST'] },
  },
  'vnv-chart-sensors-hidden': { module: 'vnv', loaded: VNV_LOADED, view: 'chart', hiddenSensorCount: 30 },
  'vnv-chart-selection': {
    module: 'vnv',
    frame: '1:11678',
    loaded: VNV_LOADED,
    view: 'chart',
    selectionCount: 8,
    popover: 'vnv-form',
  },
  'vnv-table': { module: 'vnv', loaded: VNV_LOADED, view: 'table' },
  'vnv-table-selection': { module: 'vnv', frame: '1:10892', loaded: VNV_LOADED, view: 'table', selectionCount: 8 },

  // ILL · Scan library
  'ill-library-empty': {
    module: 'ill',
    screen: 'library',
    frame: '1:2014',
    query: LIBRARY_QUERY,
    loaded: false,
    groupByWell: false,
  },
  'ill-library-results': {
    module: 'ill',
    screen: 'library',
    frame: '1:2094',
    query: LIBRARY_QUERY,
    loaded: true,
    groupByWell: false,
    expandFirstSaved: true,
  },
  'ill-library-grouped': {
    module: 'ill',
    screen: 'library',
    frame: '1:2334',
    query: LIBRARY_QUERY,
    loaded: true,
    groupByWell: true,
    selection: 'first-well',
  },
  'ill-library-saved': {
    module: 'ill',
    screen: 'library',
    frame: '1:2883',
    query: { ...LIBRARY_QUERY, analysis: 'Saved' },
    loaded: true,
    groupByWell: false,
    selection: 2,
  },
  'ill-library-grouped-expanded': {
    module: 'ill',
    screen: 'library',
    frame: '1:3814',
    query: LIBRARY_QUERY,
    loaded: true,
    groupByWell: true,
    expandFirstSaved: true,
  },

  // ILL · Focus view
  'ill-all-scans': { module: 'ill', screen: 'focus', frame: '1:10048', well: 'focus', activeTab: 'all' },
  'ill-scan-saved': { module: 'ill', screen: 'focus', frame: '1:9514', well: 'focus', activeTab: 'saved' },
  'ill-scan-zoomed': {
    module: 'ill',
    screen: 'focus',
    frame: '1:8968',
    well: 'focus',
    activeTab: 'saved',
    zoom: [150, 10],
  },
  'ill-scan-unsaved-rerun': { module: 'ill', screen: 'focus', well: 'focus', activeTab: 'saved+unsaved' },
  'ill-scan-no-analysis': { module: 'ill', screen: 'focus', well: 'focus', activeTab: 'none' },
  'ill-scan-first-run-unsaved': { module: 'ill', screen: 'focus', well: 'focus', activeTab: 'unsaved' },
  'ill-scans-popover': {
    module: 'ill',
    screen: 'focus',
    frame: '1:10714',
    well: 'focus',
    activeTab: 'saved+unsaved',
    popover: 'scans-legend',
  },
} as const satisfies Record<string, PrototypeFixture>;

export type PrototypeStateName = keyof typeof PROTOTYPE_STATES;

export const PROTOTYPE_STATE_NAMES = Object.keys(PROTOTYPE_STATES) as PrototypeStateName[];

export function isPrototypeStateName(value: unknown): value is PrototypeStateName {
  return typeof value === 'string' && value in PROTOTYPE_STATES;
}
