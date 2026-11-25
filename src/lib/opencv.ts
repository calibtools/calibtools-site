/**
 * OpenCV.js loader for the detection check.
 *
 * The file is served from calib.tools itself (public/vendor/, copied from the @techstark/opencv-js package by
 * scripts/copy-opencv.mjs in prebuild), so nothing is fetched from another host. About 11 MB, loaded on the
 * first check only and cached by the browser after that.
 *
 * What this build has, read from the module itself on 2026-11-26: cv.aruco_ArucoDetector,
 * cv.aruco_CharucoDetector, cv.aruco_CharucoBoard, cv.getPredefinedDictionary and the DICT_* constants.
 * It has no findChessboardCorners, findChessboardCornersSB or findCirclesGrid, so the detection check reads
 * patterns with markers only (see ./detect.ts).
 */

/** OpenCV version of the build in public/vendor/. scripts/copy-opencv.mjs stops the build if the package differs. */
export const OPENCV_VERSION = '4.12.0';
export const OPENCV_URL = `/vendor/opencv-${OPENCV_VERSION}.js`;

let cvPromise: Promise<{ cv: any }> | null = null;

/**
 * The module is "thenable": it has a then() of its own that hands back the same module. Returning it from a
 * promise, or awaiting it, makes the promise machinery call then() again and again without end. So then() is
 * taken off once the module is ready, and the module travels inside an object.
 */
function ready(mod: any): { cv: any } {
  try { delete mod.then; } catch { /* a build without then() */ }
  return { cv: mod };
}

/**
 * Load OpenCV.js and return the `cv` module. Safe to call more than once: the same load is reused.
 */
export function loadOpenCv(onProgress?: (status: string) => void): Promise<any> {
  if (!cvPromise) {
    cvPromise = new Promise<{ cv: any }>((resolve, reject) => {
      const g = globalThis as any;
      if (g.cv && typeof g.cv.Mat === 'function') { resolve(ready(g.cv)); return; }

      onProgress?.('Loading the detector (about 11 MB, first time only)…');
      const script = document.createElement('script');
      script.src = OPENCV_URL;
      script.async = true;
      script.onload = () => {
        onProgress?.('Starting the detector…');
        const mod = g.cv;
        if (!mod) { cvPromise = null; reject(new Error('The detector did not start. Reload the page and try again.')); return; }
        if (typeof mod.Mat === 'function') { resolve(ready(mod)); return; }
        if (typeof mod.then === 'function') {
          mod.then((m: any) => { g.cv = m; resolve(ready(m)); });
        } else {
          mod.onRuntimeInitialized = () => resolve(ready(g.cv));
        }
      };
      script.onerror = () => {
        cvPromise = null;
        reject(new Error('The detector could not be loaded. Check your connection and try again.'));
      };
      document.head.appendChild(script);
    });
  }
  return cvPromise.then((r) => r.cv);
}

/** Check if OpenCV.js is already loaded and ready. */
export function isOpenCvReady(): boolean {
  const cv = (globalThis as any).cv;
  return !!cv && typeof cv.Mat === 'function';
}
