/** Quality indicator. VNV QI is per reading; ILL QI is per scan. */
export type Qi = 'Good' | 'Suspect' | 'Unreviewed' | 'Transcribed';

export const QI_VALUES: readonly Qi[] = ['Good', 'Suspect', 'Unreviewed', 'Transcribed'];

/** The VNV quality filter starts with Suspect off; the other QIs show (Scarlett, 2026-11-17). */
export const DEFAULT_VISIBLE_QI: readonly Qi[] = QI_VALUES.filter((q) => q !== 'Suspect');

export function isQi(value: string): value is Qi {
  return (QI_VALUES as readonly string[]).includes(value);
}
