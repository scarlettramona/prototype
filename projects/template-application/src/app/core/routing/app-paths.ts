/** Route segments, shared by the routes files, the header nav and the state fixtures. */
export const APP_PATHS = {
  ill: 'ill',
  /** `/ill/focus/:wellId` */
  illFocus: 'focus',
  vnv: 'vnv',
  /** Dev-only pages, e.g. `/dev/data`. */
  dev: 'dev',
} as const;
