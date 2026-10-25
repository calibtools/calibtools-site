/**
 * CT-CSV  Corner coordinate file builder.
 *
 * Writes a CSV with columns: id, row, col, x_nom, y_nom, x_meas, y_meas, dx_um, dy_um
 * All values in mm unless the column name says otherwise (dx_um, dy_um are µm).
 */

import { writeFileSync } from 'node:fs';
import type { Coord } from './ct-ir';

export function buildCSV(coords: Coord[], outPath: string): void {
  const header = 'id,row,col,x_nom,y_nom,x_meas,y_meas,dx_um,dy_um';
  const rows = coords.map(
    (c) =>
      `${c.id},${c.row},${c.col},${c.x_nom.toFixed(3)},${c.y_nom.toFixed(3)},${c.x_meas.toFixed(4)},${c.y_meas.toFixed(4)},${c.dx_um.toFixed(1)},${c.dy_um.toFixed(1)}`,
  );
  writeFileSync(outPath, [header, ...rows].join('\n') + '\n');
}
