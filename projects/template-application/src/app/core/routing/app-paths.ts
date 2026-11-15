/**
 * Route segments for everything reachable across architecture areas.
 *
 * Cross-feature navigation must not use literal path strings, and the layout
 * may not import feature code, so the segments live here and both sides read
 * them from `core/`. Segments used only *inside* one feature belong in that
 * feature's own constants file instead.
 */
export const APP_PATHS = {
  home: '',

  components: {
    base: 'components',
    buttons: 'buttons',
    notifications: 'notifications',
    lozenges: 'lozenges',

    kitchenSink: {
      base: 'kitchen-sink',
      formControls: 'form-controls',
      selectionControls: 'selection-controls',
      pickers: 'pickers',
      cardsChips: 'cards-chips',
      layoutNav: 'layout-nav',
      overlays: 'overlays',
    },
  },
} as const;
