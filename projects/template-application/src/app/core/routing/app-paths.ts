/** Route segments, shared by the routes files, the header nav and the state fixtures. */
export const APP_PATHS = {
  ill: 'ill',
  /** `/ill/focus/:wellId` */
  illFocus: 'focus',
  vnv: 'vnv',
  /** Stub for the page being built next. */
  baseline: 'baseline',
  /** Dev-only pages, e.g. `/dev/gallery`. */
  dev: 'dev',
} as const;
