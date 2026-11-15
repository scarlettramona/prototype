import { computed, Directive, input } from '@angular/core';

import { LozengeAppearance, LozengeSpacing, LozengeStyleOverride } from './lozenge.models';
import { getThemeStyles, normalizeMaxWidth, resolveLozengeColor } from './lozenge.utils';

/** Internal base for `LozengeComponent` and `LozengeDropdownTriggerComponent`. */
@Directive()
export abstract class LozengeBase {
  readonly appearance = input<LozengeAppearance, LozengeAppearance | undefined | null>('neutral', {
    transform: (value) => value ?? 'neutral',
  });

  readonly spacing = input<LozengeSpacing, LozengeSpacing | undefined | null>('default', {
    transform: (value) => value ?? 'default',
  });

  /** A `number` is treated as pixels; strings pass through verbatim. */
  readonly maxWidth = input<number | string, number | string | undefined | null>(200, {
    transform: (value) => value ?? 200,
  });

  readonly styleOverride = input<LozengeStyleOverride | null, LozengeStyleOverride | undefined | null>(null, {
    transform: (value) => value ?? null,
  });

  readonly testId = input<string>();

  protected readonly resolvedColor = computed(() => resolveLozengeColor(this.appearance()));
  protected readonly themeStyles = computed(() => getThemeStyles(this.resolvedColor()));
  protected readonly resolvedMaxWidth = computed(() => normalizeMaxWidth(this.maxWidth()));

  protected readonly textMaxWidth = computed(() => {
    const { value, isPercent } = this.resolvedMaxWidth();
    return isPercent ? null : `calc(${value} - var(--lozenge-text-inset, 8px))`;
  });

  protected readonly textTestId = computed(() => {
    const id = this.testId();
    return id ? `${id}--text` : null;
  });
}
