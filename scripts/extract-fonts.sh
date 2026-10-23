#!/usr/bin/env bash
# Extract static TTF fonts from the geist npm package.
# These are used for PDF generation via pdf-lib (which cannot use variable fonts).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FONTS_DIR="$PROJECT_ROOT/src/assets/fonts"
WORK_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

echo "Working in: $WORK_DIR"
cd "$WORK_DIR"

echo "Packing geist package..."
npm pack geist --quiet

TARBALL=$(ls geist-*.tgz)
echo "Extracting from: $TARBALL"

tar -xzf "$TARBALL" \
  "package/dist/fonts/geist-sans/Geist-Regular.ttf" \
  "package/dist/fonts/geist-sans/Geist-SemiBold.ttf" \
  "package/dist/fonts/geist-mono/GeistMono-Regular.ttf"

cp "package/dist/fonts/geist-sans/Geist-Regular.ttf"   "$FONTS_DIR/Geist-Regular.ttf"
cp "package/dist/fonts/geist-sans/Geist-SemiBold.ttf"  "$FONTS_DIR/Geist-SemiBold.ttf"
cp "package/dist/fonts/geist-mono/GeistMono-Regular.ttf" "$FONTS_DIR/GeistMono-Regular.ttf"

echo "Done. Fonts written to $FONTS_DIR:"
ls -lh "$FONTS_DIR"
