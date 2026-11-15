import { AccentColor, LozengeAppearance, LozengeColor, SemanticColor, ThemeAppearance } from './lozenge.models';

export const SEMANTIC_COLORS: readonly SemanticColor[] = ['success', 'warning', 'danger', 'information', 'neutral'];

export const ACCENT_COLORS: readonly AccentColor[] = [
  'accent-red',
  'accent-orange',
  'accent-yellow',
  'accent-lime',
  'accent-green',
  'accent-teal',
  'accent-blue',
  'accent-purple',
  'accent-magenta',
  'accent-gray',
];

const LEGACY_APPEARANCE_TO_SEMANTIC: Record<ThemeAppearance | SemanticColor, SemanticColor> = {
  default: 'neutral',
  neutral: 'neutral',
  inprogress: 'information',
  information: 'information',
  moved: 'warning',
  warning: 'warning',
  removed: 'danger',
  danger: 'danger',
  success: 'success',
};

export function isAccentColor(value: string | undefined | null): value is AccentColor {
  return !!value && ACCENT_COLORS.includes(value as AccentColor);
}

export function isSemanticColor(value: string | undefined | null): value is SemanticColor {
  return !!value && SEMANTIC_COLORS.includes(value as SemanticColor);
}

export function resolveLozengeColor(appearance: LozengeAppearance | undefined | null): LozengeColor {
  if (isAccentColor(appearance)) {
    return appearance;
  }
  // hasOwnProperty.call avoids matching inherited Object.prototype keys.
  if (appearance != null && Object.prototype.hasOwnProperty.call(LEGACY_APPEARANCE_TO_SEMANTIC, appearance)) {
    return LEGACY_APPEARANCE_TO_SEMANTIC[appearance as ThemeAppearance | SemanticColor];
  }
  return 'neutral';
}

export function getThemeStyles(resolvedColor: LozengeColor): { category: 'accent' | 'semantic'; key: string } {
  if (isAccentColor(resolvedColor)) {
    return { category: 'accent', key: resolvedColor.replace('accent-', '') };
  }
  return { category: 'semantic', key: resolvedColor };
}

export function normalizeMaxWidth(maxWidth: number | string | undefined): {
  value: string;
  isPercent: boolean;
} {
  if (maxWidth == null) {
    return { value: '200px', isPercent: false };
  }
  if (typeof maxWidth === 'number') {
    return { value: `${maxWidth}px`, isPercent: false };
  }
  return { value: maxWidth, isPercent: /%\s*$/.test(maxWidth) };
}
