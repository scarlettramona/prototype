import { DAY_MS, parseUsDate } from '../mock-data/dates';
import type { MockDataConfig } from '../mock-data/mock-data.config';
import { Rng } from '../mock-data/random';
import { analyse, defaultParameters } from './ill-analysis';
import type { Analysis, Scan, ScanPoint, ScanQi, StoredAnalysisState, Well } from './ill.models';
import type { IllSourceScan } from './ill-source';

export interface IllDataset {
  /** Sorted by id. */
  wells: ReadonlyMap<string, Well>;
  scans: ReadonlyMap<string, Scan>;
}

/**
 * Builds the ILL dataset: the real scan untouched, plus scans derived from its
 * profile for the focus well (with the analysis-state spread from the config)
 * and the other wells the Scan library frames show.
 */
export function buildIllDataset(source: IllSourceScan[], config: MockDataConfig): IllDataset {
  const ill = config.ill;
  const seed = config.seed;
  const template = source[0];
  if (!template) throw new Error('ILL source has no scans');

  const scans: Scan[] = [];

  // Real scans, plus extra generated scans on the first real well.
  for (const real of source) {
    scans.push({
      id: `${real.wellId}|${real.datetime}`,
      wellId: real.wellId,
      datetime: real.datetime,
      colorIndex: 0,
      qi: real.qi,
      points: real.points,
      analysis: buildAnalysis('saved', real.points, real.datetime, Rng.for(seed, `ill:analysis:${real.wellId}|real`), config),
      real: true,
    });
  }
  const extraRng = Rng.for(seed, `ill:states:${template.wellId}`);
  const extraStates = Array.from({ length: ill.realWellExtraScans }, () => pickState(extraRng, config));
  scans.push(...generateWell(template.wellId, extraStates, template, config, 'extra'));

  scans.push(...generateWell(ill.focusWell.id, [...ill.focusWell.analysisStates], template, config, 'focus'));

  for (const w of ill.wells) {
    const rng = Rng.for(seed, `ill:states:${w.id}`);
    const states = Array.from({ length: w.scans }, () => pickState(rng, config));
    scans.push(...generateWell(w.id, states, template, config, 'well'));
  }

  // Colour by date order within each well.
  const wells = new Map<string, Well>();
  const byWell = new Map<string, Scan[]>();
  for (const s of scans) byWell.set(s.wellId, [...(byWell.get(s.wellId) ?? []), s]);
  for (const id of [...byWell.keys()].sort()) {
    const list = byWell.get(id)!.sort((a, b) => a.datetime - b.datetime);
    list.forEach((s, i) => (s.colorIndex = i));
    wells.set(id, { id, scanIds: list.map((s) => s.id) });
  }

  return { wells, scans: new Map(scans.map((s) => [s.id, s])) };
}

function generateWell(
  wellId: string,
  states: StoredAnalysisState[],
  template: IllSourceScan,
  config: MockDataConfig,
  kind: string,
): Scan[] {
  const ill = config.ill;
  const rng = Rng.for(config.seed, `ill:well:${kind}:${wellId}`);
  const recentStart = parseUsDate(ill.recentRangeStart);
  const recentEnd = parseUsDate(ill.recentRangeEnd);
  const allStart = parseUsDate(ill.scanRangeStart);
  const allEnd = parseUsDate(ill.scanRangeEnd);

  const dates = states
    .map(() => {
      const recent = rng.chance(ill.recentShare);
      const day = recent ? rng.range(recentStart, recentEnd + DAY_MS) : rng.range(allStart, allEnd + DAY_MS);
      const d = new Date(day);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate(), rng.int(7, 16), rng.int(0, 59)).getTime();
    })
    .sort((a, b) => a - b);

  return states.map((state, i) => {
    const datetime = dates[i];
    const id = `${wellId}|${datetime}`;
    const scanRng = Rng.for(config.seed, `ill:scan:${id}`);
    const points = deriveProfile(template.points, scanRng, config);
    const qiRoll = scanRng.next();
    const qi: ScanQi = qiRoll < ill.qiMix.Good ? 'Good' : qiRoll < ill.qiMix.Good + ill.qiMix.Suspect ? 'Suspect' : null;
    return {
      id,
      wellId,
      datetime,
      colorIndex: 0,
      qi,
      scanComment: scanRng.chance(0.4) ? scanRng.pick(config.comments) : undefined,
      vnvComment: scanRng.chance(0.2) ? scanRng.pick(config.comments) : undefined,
      points,
      analysis: buildAnalysis(state, points, datetime, scanRng, config),
      real: false,
    };
  });
}

/**
 * A new profile from the real one: counts scaled and offset, the drop and the
 * rise each shifted 1–2 in, and fresh counting noise.
 */
export function deriveProfile(real: readonly ScanPoint[], rng: Rng, config: MockDataConfig): ScanPoint[] {
  const ill = config.ill;
  const gain = 1 + rng.range(-ill.countGain, ill.countGain);
  const offset = rng.range(-ill.countOffset, ill.countOffset);
  const dropShift = rng.sign() * rng.range(ill.depthShiftIn.min, ill.depthShiftIn.max);
  const riseShift = rng.sign() * rng.range(ill.depthShiftIn.min, ill.depthShiftIn.max);

  return real.map((p) => {
    const shift = p.depthIn > 300 ? dropShift : riseShift;
    const level = p.counts * gain + offset * Math.min(1, p.counts / 100);
    const counts = Math.max(0, level + rng.normal() * ill.noise * Math.sqrt(Math.max(p.counts, 1)));
    return { depthIn: round3(p.depthIn + shift), counts: round3(counts) };
  });
}

/**
 * Stored data is saved or none: unsaved results only appear once someone
 * performs or runs an analysis (they are blue until saved).
 */
function buildAnalysis(state: StoredAnalysisState, points: ScanPoint[], datetime: number, rng: Rng, config: MockDataConfig): Analysis {
  const savedBy = rng.pick(config.people);
  if (state === 'none') return {};

  const parameters = defaultParameters();
  parameters.miscellaneous.markerDepth = round3(418.8 + rng.range(-1.5, 1.5));
  const savedAt = datetime + rng.int(1, 20) * DAY_MS;
  return { saved: { parameters, results: analyse(points, parameters, datetime), savedAt, savedBy } };
}

function pickState(rng: Rng, config: MockDataConfig): StoredAnalysisState {
  const mix = config.ill.analysisMix;
  let roll = rng.next();
  for (const state of Object.keys(mix) as StoredAnalysisState[]) {
    roll -= mix[state];
    if (roll < 0) return state;
  }
  return 'saved';
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
