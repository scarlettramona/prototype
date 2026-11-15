import { APP_PATHS } from './app-paths';

const components = `/${APP_PATHS.components.base}`;
const kitchenSink = `${components}/${APP_PATHS.components.kitchenSink.base}`;

/**
 * encode a value for safe use as a single URL path segment. Only the
 * characters that would otherwise be interpreted by the router are
 * escaped so ordinary IDs stay readable fingers crossed lol
 */
export function encodePathSegment(value: string): string {
  return value.replace(/[/?#%;]/g, encodeURIComponent);
}

/**
 * Absolute URLs for navigation between areas. Anything that links or routes to
 * another feature reads from here; helpers that take an ID should run it
 * through `encodePathSegment` so a value containing `/` or `#` cannot break
 * out of its segment.
 */
export const ROUTES = {
  home: `/${APP_PATHS.home}`,

  components: {
    root: components,
    buttons: `${components}/${APP_PATHS.components.buttons}`,
    notifications: `${components}/${APP_PATHS.components.notifications}`,
    lozenges: `${components}/${APP_PATHS.components.lozenges}`,

    kitchenSink: {
      root: kitchenSink,
      formControls: `${kitchenSink}/${APP_PATHS.components.kitchenSink.formControls}`,
      selectionControls: `${kitchenSink}/${APP_PATHS.components.kitchenSink.selectionControls}`,
      pickers: `${kitchenSink}/${APP_PATHS.components.kitchenSink.pickers}`,
      cardsChips: `${kitchenSink}/${APP_PATHS.components.kitchenSink.cardsChips}`,
      layoutNav: `${kitchenSink}/${APP_PATHS.components.kitchenSink.layoutNav}`,
      overlays: `${kitchenSink}/${APP_PATHS.components.kitchenSink.overlays}`,
    },
  },
} as const;
