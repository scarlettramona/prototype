/** A tank farm in the Load sensors Farm select. */
export interface TankFarm {
  /** The farm's id in the data, e.g. `AN`. */
  id: string;
  /** As the legacy app lists it, e.g. `241-AN`. */
  label: string;
}

/**
 * Every tank farm, in the legacy app's order (Scarlett, 2026-11-17). Only the
 * farm in the mock data (AN) has equipment; the others are listed, disabled.
 */
export const TANK_FARMS: readonly TankFarm[] = [
  ...['A', 'AN', 'AP', 'AW', 'AX', 'AY', 'AZ', 'B', 'BX', 'BY', 'C', 'S', 'SX', 'SY', 'T', 'TX', 'TY', 'U'].map((id) => ({ id, label: `241-${id}` })),
  { id: 'MISC', label: 'Miscellaneous' },
];
