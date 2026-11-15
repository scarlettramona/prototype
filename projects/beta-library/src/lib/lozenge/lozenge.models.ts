export type ThemeAppearance = 'default' | 'inprogress' | 'moved' | 'removed' | 'success';

export type SemanticColor = 'success' | 'warning' | 'danger' | 'information' | 'neutral';

export type AccentColor =
  | 'accent-red'
  | 'accent-orange'
  | 'accent-yellow'
  | 'accent-lime'
  | 'accent-green'
  | 'accent-teal'
  | 'accent-blue'
  | 'accent-purple'
  | 'accent-magenta'
  | 'accent-gray';

export type LozengeColor = SemanticColor | AccentColor;

export type LozengeAppearance = ThemeAppearance | SemanticColor | AccentColor;

/** `default` is 20px tall, `spacious` is 32px. */
export type LozengeSpacing = 'default' | 'spacious';

export type LozengeStyleOverride = {
  backgroundColor?: string;
  color?: string;
};
