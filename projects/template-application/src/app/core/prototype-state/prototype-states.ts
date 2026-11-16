import type { AnalysisFilter, QiFilter, StoredAnalysisState } from '../ill/ill.models';
import type { Qi } from '../qi/qi.models';

/**
 * Named screen states, reachable with `?state=<name>`. Each fixture describes
 * what's loaded, the view, selections, open popovers and analysis states, in
 * data-independent terms; `resolvePrototypeState()` turns it into concrete ids.
 * Screens read the resolved state from `PrototypeStateService`.
 *
 * `frame` is the Figma node in file Eb0lHuZv2e067FftD2RuqL that the state
 * reproduces, where one exists.
 *
 * The stored ILL data is saved or none. States that show unsaved (blue)
 * results get them the way a user would: by performing or running an analysis
 * when the fixture is applied (`performOnSelection`, `run`).
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
  loadForm?: {
    start: string;
    end: string;
    locationId?: string;
    search?: string;
    /** Filter chips (Add filters → Equipment / Tank / Component type). */
    filters?: readonly PickerFilterFixture[];
    /** The no-data notice's "Show all" switch. */
    showNoData?: boolean;
  };
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
  /** Expand the first result row. */
  expandFirst?: boolean;
  /** Perform analysis on the selection (unsaved results over any saved ones, Figma 1:2883). */
  performOnSelection?: boolean;
}

export interface IllFocusFixture {
  module: 'ill';
  screen: 'focus';
  frame?: string;
  /** Opens every scan of the focus well. */
  well: 'focus';
  /** `all` = the All scans tab; otherwise the first scan in that stored analysis state. */
  activeTab: 'all' | StoredAnalysisState;
  /**
   * Run an analysis on the active scan first. A saved scan re-runs with ILL
   * Normal Lower Range 12 (saved 10.500), as Figma 1:8968 shows; an unanalysed
   * scan runs the Default preset.
   */
  run?: boolean;
  popover?: 'scans-legend';
  /** Depth window in inches, [from, to] in axis order (600 → 0). Default: full range. */
  zoom?: readonly [number, number];
}

export type PrototypeFixture = VnvFixture | IllLibraryFixture | IllFocusFixture;

export interface PickerFilterFixture {
  kind: 'equipment' | 'tank' | 'type';
  value: string;
}

/** Component type TI (the temperature components). */
const TI_FILTER: PickerFilterFixture = { kind: 'type', value: 'TI' };

/** The typical case: one component with 6 sensors (Figma header: 241-AN-TMAC-103-TI · 6 sensors). */
const VNV_LOADED = {
  locationId: '241-AN-TMAC-103-TI',
  start: '1/1/2025',
  end: '11/12/2026',
  /** Off: the default daily view (one reading per sensor per day). */
  showAllData: false,
} as const;

/** The most sensors the VNV graph will ever show (40): the stress case. */
const VNV_LOADED_MAX = { ...VNV_LOADED, locationId: '241-AN-WSTA-102-TI' } as const;

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
    loadForm: { ...LOAD_FORM_DATES, locationId: VNV_LOADED.locationId, filters: [TI_FILTER] },
  },
  'vnv-load-form-no-data': {
    module: 'vnv',
    frame: '1:11972',
    loaded: VNV_LOADED,
    view: 'chart',
    popover: 'load-form',
    loadForm: { ...LOAD_FORM_DATES, locationId: VNV_LOADED.locationId, filters: [TI_FILTER], showNoData: true },
  },
  'vnv-load-form-search': {
    module: 'vnv',
    frame: '1:12068',
    loaded: VNV_LOADED,
    view: 'chart',
    popover: 'load-form',
    // Filters are AND-ed name tokens: TI + U3 finds the TMAC U3 sensors (Figma 1:12068).
    loadForm: { ...LOAD_FORM_DATES, search: 'U3', filters: [TI_FILTER] },
  },
  'vnv-chart-40-sensors': { module: 'vnv', loaded: VNV_LOADED_MAX, view: 'chart' },
  'vnv-chart-sensors-hidden': { module: 'vnv', loaded: VNV_LOADED, view: 'chart', hiddenSensorCount: 2 },
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
    expandFirst: true,
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
    performOnSelection: true,
  },
  'ill-library-grouped-expanded': {
    module: 'ill',
    screen: 'library',
    frame: '1:3814',
    query: LIBRARY_QUERY,
    loaded: true,
    groupByWell: true,
    expandFirst: true,
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
  'ill-scan-unsaved-rerun': { module: 'ill', screen: 'focus', well: 'focus', activeTab: 'saved', run: true },
  'ill-scan-no-analysis': { module: 'ill', screen: 'focus', well: 'focus', activeTab: 'none' },
  'ill-scan-first-run-unsaved': { module: 'ill', screen: 'focus', well: 'focus', activeTab: 'none', run: true },
  'ill-scans-popover': {
    module: 'ill',
    screen: 'focus',
    frame: '1:10714',
    well: 'focus',
    activeTab: 'saved',
    run: true,
    popover: 'scans-legend',
  },
} as const satisfies Record<string, PrototypeFixture>;

export type PrototypeStateName = keyof typeof PROTOTYPE_STATES;

export const PROTOTYPE_STATE_NAMES = Object.keys(PROTOTYPE_STATES) as PrototypeStateName[];

export function isPrototypeStateName(value: unknown): value is PrototypeStateName {
  return typeof value === 'string' && value in PROTOTYPE_STATES;
}
