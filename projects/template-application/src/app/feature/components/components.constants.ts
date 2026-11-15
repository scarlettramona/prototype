/** Route segments for the components showcase and its kitchen-sink sub-feature. */
export const COMPONENTS_PATHS = {
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
} as const;
