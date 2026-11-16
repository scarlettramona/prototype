/** ILL scan QI is per scan (depth points carry none). The library calls `null` "Not set". */
export type ScanQi = 'Good' | 'Suspect' | null;

export interface ScanPoint {
  /** Corrected depth, inches from the bottom of the tank. */
  depthIn: number;
  /** Corrected counts. */
  counts: number;
}

export type IllMethod = 'Intercept' | 'None';

/** The editable analysis parameters, grouped as the focus view shows them. */
export interface AnalysisParameters {
  /** Preset name shown in the select, e.g. `Default`. */
  preset: string;
  calculationBaseline: {
    /** in */
    baselineValue: number;
    /** in/yr */
    baselineSlopeRate: number;
    baselineStartDate: number;
  };
  miscellaneous: {
    /** in */
    markerDepth: number;
    /** in */
    reviewTolerance: number;
    /** in */
    overallCorrectionOffset: number;
    /** in */
    lowDepth: number;
    parameterComment: string;
  };
  illMethod: {
    method: IllMethod;
    /** in */
    normalUpperRange: number;
    /** in */
    normalLowerRange: number;
    normalTargetCounts: number;
    /** in */
    upperRange: number;
    /** in */
    lowerRange: number;
    counts: number;
  };
  markerMethod: {
    method: IllMethod;
    /** in */
    normalUpperRange: number;
    /** in */
    normalLowerRange: number;
    normalTargetCounts: number;
    /** in */
    upperRange: number;
    /** in */
    lowerRange: number;
    counts: number;
  };
}

/** One set of analysis results. Units follow the Scan details panel. */
export interface AnalysisResults {
  /** in */
  calculatedIll: number;
  /** in */
  depthCorrection: number;
  /** in */
  baseline: number;
  /** cps */
  stdDeviation: number;
  inTolerance: boolean;
  outliers: number;
  /** cps */
  rawMarkers: number;
  /** in */
  rawIll: number;
}

export interface SavedAnalysis {
  parameters: AnalysisParameters;
  results: AnalysisResults;
  savedAt: number;
  savedBy: string;
}

export interface UnsavedAnalysis {
  parameters: AnalysisParameters;
  results: AnalysisResults;
  runAt: number;
}

/**
 * Saved, unsaved, both, or neither. Unsaved results only exist after someone
 * performs or runs an analysis in this session; the stored data is saved or none.
 * The library's Analyst is the saved analysis's `savedBy`.
 */
export interface Analysis {
  saved?: SavedAnalysis;
  unsaved?: UnsavedAnalysis;
}

/** A named parameter set (the preset select). It always has a saved on / by. */
export interface ParameterPreset {
  parameters: AnalysisParameters;
  savedAt: number;
  savedBy: string;
}

export type AnalysisState = 'none' | 'saved' | 'unsaved' | 'saved+unsaved';

/** What the stored (generated) data holds before anyone runs an analysis. */
export type StoredAnalysisState = 'none' | 'saved';

export function analysisState(a: Analysis): AnalysisState {
  if (a.saved && a.unsaved) return 'saved+unsaved';
  if (a.saved) return 'saved';
  if (a.unsaved) return 'unsaved';
  return 'none';
}

export interface Well {
  /** Riser id, e.g. `B105 R05 N 20571`. */
  id: string;
  scanIds: string[];
}

export interface Scan {
  /** Stable id: `<wellId>|<scan_datetime as exported>`. */
  id: string;
  wellId: string;
  /** Local timestamp (ms). */
  datetime: number;
  /** Index into the series palette, unique within the well. */
  colorIndex: number;
  qi: ScanQi;
  scanComment?: string;
  vnvComment?: string;
  /** Descending depth, as exported. */
  points: ScanPoint[];
  analysis: Analysis;
  /** True for the scan from the real export. */
  real: boolean;
}

/** A scan without its depth points: what the Scan library lists. */
export type ScanSummary = Omit<Scan, 'points'>;

export type QiFilter = 'Any' | 'Good' | 'Suspect' | 'Not set';
export type AnalysisFilter = 'Any' | 'Saved' | 'Unsaved';

/** The Load scans form. */
export interface ScanQuery {
  start: number;
  end: number;
  /** Empty = All wells. */
  wellIds: string[];
  qi: QiFilter;
  analysis: AnalysisFilter;
}

export interface ScanReviewRequest {
  scanIds: string[];
  qi: ScanQi;
  scanComment?: string;
  vnvComment?: string;
}
