/** Browser downloads for the prototype's exports (CSV data, chart images). */

/** Downloads `href` (an object URL or a data URL) as `fileName`. */
export function downloadUrl(document: Document, href: string, fileName: string): void {
  const a = document.createElement('a');
  a.href = href;
  a.download = fileName;
  a.click();
}

/** Downloads `text` as a file; CSV unless `type` says otherwise. */
export function downloadText(document: Document, text: string, fileName: string, type = 'text/csv'): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  downloadUrl(document, url, fileName);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
