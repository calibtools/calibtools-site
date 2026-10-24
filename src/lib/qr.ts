/**
 * Minimal QR code generator — byte mode, error correction level L.
 * Supports versions 1–6 (up to 134 bytes). No external dependencies.
 *
 * Returns a boolean[][] matrix (true = dark module).
 */

// Version capacities (byte mode, EC level L): data codewords
const VERSION_DATA_CODEWORDS = [0, 19, 34, 55, 80, 108, 136]; // index = version
const VERSION_TOTAL_CODEWORDS = [0, 26, 44, 70, 100, 134, 172];
const VERSION_EC_CODEWORDS = [0, 7, 10, 15, 20, 26, 36]; // per block
const VERSION_BLOCKS = [0, 1, 1, 1, 1, 1, 2]; // number of EC blocks

/** Generate QR code matrix for a UTF-8 string. */
export function generateQR(text: string): boolean[][] {
  const data = new TextEncoder().encode(text);
  if (data.length > 134) throw new Error(`QR data too long: ${data.length} bytes (max 134)`);

  // Pick smallest version
  let version = 1;
  for (let v = 1; v <= 6; v++) {
    if (data.length <= VERSION_DATA_CODEWORDS[v]) { version = v; break; }
  }

  const size = 17 + version * 4;
  const totalCodewords = VERSION_TOTAL_CODEWORDS[version];
  const dataCodewords = VERSION_DATA_CODEWORDS[version];
  const ecCodewordsPerBlock = VERSION_EC_CODEWORDS[version];
  const numBlocks = VERSION_BLOCKS[version];

  // Encode data: mode indicator (0100 = byte) + char count + data + terminator + padding
  const bits: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
  };

  pushBits(0b0100, 4); // byte mode
  pushBits(data.length, version <= 9 ? 8 : 16); // character count
  for (const b of data) pushBits(b, 8);

  // Terminator (up to 4 zero bits)
  const dataBits = dataCodewords * 8;
  const termLen = Math.min(4, dataBits - bits.length);
  for (let i = 0; i < termLen; i++) bits.push(0);

  // Pad to byte boundary
  while (bits.length % 8 !== 0) bits.push(0);

  // Pad bytes 0xEC, 0x11
  const padBytes = [0xEC, 0x11];
  let padIdx = 0;
  while (bits.length < dataBits) {
    pushBits(padBytes[padIdx % 2], 8);
    padIdx++;
  }

  // Convert to codeword array
  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | (bits[i + j] ?? 0);
    codewords.push(byte);
  }

  // Split into blocks and compute EC
  const blockSize = Math.floor(dataCodewords / numBlocks);
  const extraBlocks = dataCodewords % numBlocks;
  const dataBlocks: number[][] = [];
  const ecBlocks: number[][] = [];
  let offset = 0;
  for (let b = 0; b < numBlocks; b++) {
    const bSize = blockSize + (b >= numBlocks - extraBlocks ? 1 : 0);
    const block = codewords.slice(offset, offset + bSize);
    offset += bSize;
    dataBlocks.push(block);
    ecBlocks.push(reedSolomonEC(block, ecCodewordsPerBlock));
  }

  // Interleave data blocks then EC blocks
  const finalCodewords: number[] = [];
  const maxDataLen = Math.max(...dataBlocks.map(b => b.length));
  for (let i = 0; i < maxDataLen; i++) {
    for (const block of dataBlocks) {
      if (i < block.length) finalCodewords.push(block[i]);
    }
  }
  for (let i = 0; i < ecCodewordsPerBlock; i++) {
    for (const block of ecBlocks) {
      if (i < block.length) finalCodewords.push(block[i]);
    }
  }

  // Build matrix
  const matrix = Array.from({ length: size }, () => Array(size).fill(false));
  const reserved = Array.from({ length: size }, () => Array(size).fill(false));

  // Place finder patterns
  placeFinder(matrix, reserved, 0, 0);
  placeFinder(matrix, reserved, size - 7, 0);
  placeFinder(matrix, reserved, 0, size - 7);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    reserved[6][i] = true;
    matrix[i][6] = i % 2 === 0;
    reserved[i][6] = true;
  }

  // Alignment pattern (version ≥ 2)
  if (version >= 2) {
    const pos = alignmentPositions(version);
    for (const r of pos) {
      for (const c of pos) {
        if (reserved[r]?.[c]) continue; // skip if overlaps finder
        placeAlignment(matrix, reserved, r, c);
      }
    }
  }

  // Dark module
  matrix[size - 8][8] = true;
  reserved[size - 8][8] = true;

  // Reserve format info areas
  for (let i = 0; i < 9; i++) {
    if (i < size) reserved[8][i] = true;
    if (i < size) reserved[i][8] = true;
    if (size - 1 - i >= 0) reserved[8][size - 1 - i] = true;
    if (size - 1 - i >= 0) reserved[size - 1 - i][8] = true;
  }

  // Place data bits (upward/downward columns, right to left, skipping col 6)
  const allBits: number[] = [];
  for (const cw of finalCodewords) {
    for (let i = 7; i >= 0; i--) allBits.push((cw >> i) & 1);
  }
  // Remainder bits
  const remainderBits = [0, 0, 7, 7, 7, 7, 7][version];
  for (let i = 0; i < remainderBits; i++) allBits.push(0);

  let bitIdx = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5; // skip timing column
    for (let vert = 0; vert < size; vert++) {
      for (const dx of [0, -1]) {
        const col = right + dx;
        const row = ((Math.floor((size - 1 - right + (right < 6 ? 1 : 0)) / 2)) % 2 === 0)
          ? size - 1 - vert
          : vert;
        if (row < 0 || row >= size || col < 0 || col >= size) continue;
        if (reserved[row][col]) continue;
        matrix[row][col] = bitIdx < allBits.length ? allBits[bitIdx] === 1 : false;
        bitIdx++;
      }
    }
  }

  // Apply mask 0 (checkerboard: (row+col)%2==0) and evaluate
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!reserved[r][c] && (r + c) % 2 === 0) {
        matrix[r][c] = !matrix[r][c];
      }
    }
  }

  // Place format info (mask 0, EC level L)
  // L = 01, mask 0 = 000, format bits = 01000, after BCH: 011010101011111 (reversed for placement)
  const formatBits = 0b111110101010110; // format info for L + mask 0 (XOR masked)
  placeFormatInfo(matrix, size, formatBits);

  return matrix;
}

function placeFinder(matrix: boolean[][], reserved: boolean[][], row: number, col: number) {
  for (let r = -1; r <= 7; r++) {
    for (let c = -1; c <= 7; c++) {
      const mr = row + r, mc = col + c;
      if (mr < 0 || mr >= matrix.length || mc < 0 || mc >= matrix.length) continue;
      const inOuter = r === 0 || r === 6 || c === 0 || c === 6;
      const inInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      matrix[mr][mc] = inOuter || inInner;
      reserved[mr][mc] = true;
    }
  }
}

function placeAlignment(matrix: boolean[][], reserved: boolean[][], row: number, col: number) {
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const mr = row + r, mc = col + c;
      if (mr < 0 || mr >= matrix.length || mc < 0 || mc >= matrix.length) continue;
      const isEdge = Math.abs(r) === 2 || Math.abs(c) === 2;
      const isCenter = r === 0 && c === 0;
      matrix[mr][mc] = isEdge || isCenter;
      reserved[mr][mc] = true;
    }
  }
}

function alignmentPositions(version: number): number[] {
  if (version === 1) return [];
  const positions: number[][] = [
    [], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
  ];
  return positions[version] ?? [];
}

function placeFormatInfo(matrix: boolean[][], size: number, bits: number) {
  // Around top-left finder
  const positions1 = [
    [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [7, 8], [8, 8],
    [8, 7], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  ];
  for (let i = 0; i < 15; i++) {
    const [r, c] = positions1[i];
    matrix[r][c] = ((bits >> i) & 1) === 1;
  }
  // Around other finders
  const positions2 = [
    [8, size - 1], [8, size - 2], [8, size - 3], [8, size - 4],
    [8, size - 5], [8, size - 6], [8, size - 7], [8, size - 8],
    [size - 7, 8], [size - 6, 8], [size - 5, 8], [size - 4, 8],
    [size - 3, 8], [size - 2, 8], [size - 1, 8],
  ];
  for (let i = 0; i < 15; i++) {
    const [r, c] = positions2[i];
    matrix[r][c] = ((bits >> i) & 1) === 1;
  }
}

// --- Reed-Solomon error correction (GF(2^8), primitive polynomial 0x11D) ---

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x = (x << 1) ^ (x >= 128 ? 0x11D : 0);
    x &= 0xFF;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function reedSolomonEC(data: number[], ecCount: number): number[] {
  // Build generator polynomial
  let gen = [1];
  for (let i = 0; i < ecCount; i++) {
    const factor = [1, GF_EXP[i]];
    const newGen = new Array(gen.length + 1).fill(0);
    for (let j = 0; j < gen.length; j++) {
      for (let k = 0; k < factor.length; k++) {
        newGen[j + k] ^= gfMul(gen[j], factor[k]);
      }
    }
    gen = newGen;
  }

  // Polynomial division
  const result = new Array(ecCount).fill(0);
  const msg = [...data, ...result];
  for (let i = 0; i < data.length; i++) {
    const coef = msg[i];
    if (coef !== 0) {
      for (let j = 1; j < gen.length; j++) {
        msg[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return msg.slice(data.length);
}
