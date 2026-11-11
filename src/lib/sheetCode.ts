/** Page code for the title-block footer: "/" → CT-WEB-HOME, "/targets/charuco-composite/" → CT-WEB-TARGETS-CHARUCO-COMPOSITE. */
export function sheetCode(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean).map((p) => p.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, ''));
  return `CT-WEB-${parts.length ? parts.join('-') : 'HOME'}`.slice(0, 48);
}
