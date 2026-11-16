/** Quality indicator. VNV QI is per reading; ILL QI is per scan. */
export type Qi = 'Good' | 'Suspect' | 'Unreviewed' | 'Transcribed';

export const QI_VALUES: readonly Qi[] = ['Good', 'Suspect', 'Unreviewed', 'Transcribed'];

export function isQi(value: string): value is Qi {
  return (QI_VALUES as readonly string[]).includes(value);
}
