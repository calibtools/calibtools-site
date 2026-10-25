/**
 * Central icon registry.
 * Every icon used on the site is re-exported from here so the codebase
 * has a single import point and no scattered inline SVGs.
 *
 * Astro pages:  import { SomeIcon } from 'lucide-astro'   (via icons-astro.ts)
 * React islands: import { SomeIcon } from '@/lib/icons'
 */

// ── Why-us section ──────────────────────────────────────────────────
export { Tag, Truck, FileCheck, Files, RotateCcw } from 'lucide-react';

// ── Tool cards / tool page h1s ──────────────────────────────────────
export { Grid2x2 as Grid2X2, ScanLine, ListChecks } from 'lucide-react';
// Also: ArrowLeftRight (converter), ScanSearch (detection check),
//        BarChart3 (quality analyzer), Camera (capture assistant)
export { ArrowLeftRight, ScanSearch, BarChart3, Camera } from 'lucide-react';

// ── Product cards ───────────────────────────────────────────────────
export { Package, Ruler, CircleDot, Plug } from 'lucide-react';

// ── Guide links / arrows ────────────────────────────────────────────
export { ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';

// ── Newsletter ──────────────────────────────────────────────────────
export { Mail } from 'lucide-react';

// ── Footer ──────────────────────────────────────────────────────────
export { Github } from 'lucide-react';

// ── Product page badges ─────────────────────────────────────────────
export { Clock } from 'lucide-react';
// FileCheck already exported above

// ── Product page assurance list ─────────────────────────────────────
export { Check } from 'lucide-react';

// ── Product page accordion summaries ────────────────────────────────
export { HelpCircle, Plus } from 'lucide-react';
// Ruler, Package, Plug, CircleDot, Truck already exported above

// ── Product page sidebar cards ──────────────────────────────────────
export { Download, Wand2, Columns2, MessageSquare } from 'lucide-react';

// ── Product page download rows ──────────────────────────────────────
export { FileText, FileCode } from 'lucide-react';

// ── VariantPicker ───────────────────────────────────────────────────
// Check already exported above

// ── Generator / FovCalculator / Wizard / CaptureAssistant ───────────
export { CircleCheck, TriangleAlert } from 'lucide-react';
// ArrowRight, ArrowUp, ArrowDown, Check already exported above

// ── CartDrawer / CartPage ───────────────────────────────────────────
export { ShoppingCart, X, Trash2, Minus } from 'lucide-react';
// Plus already exported above

// ── Mobile header ───────────────────────────────────────────────────
export { Menu } from 'lucide-react';
// ShoppingCart already exported above

// ── CollectionTabs ──────────────────────────────────────────────────
export { ChevronDown, User } from 'lucide-react';

// ── MobileBottomCluster ─────────────────────────────────────────────
// ShoppingCart already exported above

// ── Misc: image placeholder, download-all, spinner ──────────────────
export { Image, Loader2 } from 'lucide-react';

// ── Reviews ─────────────────────────────────────────────────────────
export { Star, Flag, ThumbsUp } from 'lucide-react';
