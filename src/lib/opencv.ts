/**
 * OpenCV.js dynamic loader.
 * Loads the WASM build from jsDelivr CDN on first use. ~8 MB download,
 * cached by the browser after first load.
 *
 * Reason for runtime dependency: T5 detection check and T7 capture assistant
 * need cv.findChessboardCorners / cv.aruco.detectMarkers in the browser.
 */

/** OpenCV.js version to load. */
const OPENCV_VERSION = '4.10.0';
const OPENCV_CDN = `https://cdn.jsdelivr.net/npm/opencv.js@${OPENCV_VERSION}/opencv.js`;

let cvPromise: Promise<any> | null = null;

/**
 * Load OpenCV.js and return the `cv` module.
 * Safe to call multiple times — returns the same promise.
 */
export function loadOpenCv(onProgress?: (status: string) => void): Promise<any> {
  if (cvPromise) return cvPromise;

  cvPromise = new Promise((resolve, reject) => {
    // Check if already loaded (e.g. via <script> tag)
    if (typeof (globalThis as any).cv !== 'undefined' && (globalThis as any).cv.Mat) {
      resolve((globalThis as any).cv);
      return;
    }

    onProgress?.('Downloading OpenCV.js (~8 MB)…');

    const script = document.createElement('script');
    script.src = OPENCV_CDN;
    script.async = true;

    script.onload = () => {
      onProgress?.('Initializing WASM…');
      // opencv.js sets window.cv as a factory; it may need Module.onRuntimeInitialized
      const cv = (globalThis as any).cv;
      if (cv && typeof cv.then === 'function') {
        // opencv.js 4.x returns a promise-like
        cv.then((readyCv: any) => {
          (globalThis as any).cv = readyCv;
          onProgress?.('Ready');
          resolve(readyCv);
        });
      } else if (cv && cv.Mat) {
        onProgress?.('Ready');
        resolve(cv);
      } else {
        // Wait for onRuntimeInitialized
        const mod = cv || {};
        mod['onRuntimeInitialized'] = () => {
          onProgress?.('Ready');
          resolve((globalThis as any).cv);
        };
        (globalThis as any).cv = mod;
      }
    };

    script.onerror = () => {
      cvPromise = null;
      reject(new Error('Failed to load OpenCV.js from CDN'));
    };

    document.head.appendChild(script);
  });

  return cvPromise;
}

/**
 * Check if OpenCV.js is already loaded and ready.
 */
export function isOpenCvReady(): boolean {
  const cv = (globalThis as any).cv;
  return cv && typeof cv.Mat === 'function';
}
