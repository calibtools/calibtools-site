import { describe, it, expect } from 'vitest';
import { parseCalibrationData, analyzeQuality, type CalibrationData } from './quality';

const goodCalib: CalibrationData = {
  cameraMatrix: [[1000, 0, 960], [0, 1000, 540], [0, 0, 1]],
  distCoeffs: [-0.1, 0.05, 0.001, -0.001, 0.002],
  imageWidth: 1920,
  imageHeight: 1080,
  perViewErrors: [0.15, 0.18, 0.12, 0.20, 0.14, 0.16, 0.13, 0.19, 0.11, 0.17,
                  0.15, 0.14, 0.16, 0.18, 0.13],
  rmsError: 0.155,
  imageCount: 15,
};

const badCalib: CalibrationData = {
  cameraMatrix: [[800, 0, 1100], [0, 810, 700], [0, 0, 1]],
  distCoeffs: [-0.3, 0.15, 0.02, -0.03, 0.01],
  imageWidth: 1920,
  imageHeight: 1080,
  perViewErrors: [0.8, 1.2, 0.5, 2.5, 0.9, 0.6],
  rmsError: 1.15,
  imageCount: 6,
};

describe('parseCalibrationData', () => {
  it('parses direct JSON format', () => {
    const json = JSON.stringify({
      camera_matrix: [[1000, 0, 960], [0, 1000, 540], [0, 0, 1]],
      dist_coeffs: [-0.1, 0.05, 0.001, -0.001],
      image_width: 1920,
      image_height: 1080,
      per_view_errors: [0.15, 0.20],
      rms_error: 0.175,
    });
    const data = parseCalibrationData(json);
    expect(data.cameraMatrix[0][0]).toBe(1000);
    expect(data.distCoeffs[0]).toBe(-0.1);
    expect(data.imageWidth).toBe(1920);
    expect(data.rmsError).toBe(0.175);
  });

  it('parses camelCase format', () => {
    const json = JSON.stringify({
      cameraMatrix: [[500, 0, 320], [0, 500, 240], [0, 0, 1]],
      distCoeffs: [-0.2, 0.1],
      imageWidth: 640,
      imageHeight: 480,
      perViewErrors: [0.3],
      rmsError: 0.3,
    });
    const data = parseCalibrationData(json);
    expect(data.cameraMatrix[0][0]).toBe(500);
    expect(data.imageWidth).toBe(640);
  });

  it('throws on invalid format', () => {
    expect(() => parseCalibrationData('{"foo": "bar"}')).toThrow();
  });
});

describe('analyzeQuality', () => {
  it('good calibration scores high', () => {
    const report = analyzeQuality(goodCalib);
    expect(report.score).toBeGreaterThanOrEqual(70);
    expect(report.grade).toMatch(/excellent|good/);
  });

  it('bad calibration scores low', () => {
    const report = analyzeQuality(badCalib);
    expect(report.score).toBeLessThan(60);
    expect(report.grade).toMatch(/fair|poor/);
  });

  it('detects focal ratio deviation', () => {
    const report = analyzeQuality(badCalib);
    expect(report.intrinsics.focalRatio).toBeCloseTo(800 / 810, 3);
    expect(report.findings.some((f) => f.message.includes('fx/fy'))).toBe(true);
  });

  it('detects principal point offset', () => {
    const report = analyzeQuality(badCalib);
    expect(report.intrinsics.ppOffsetX).toBeCloseTo(1100 - 960, 1);
    expect(report.findings.some((f) => f.message.includes('Principal point'))).toBe(true);
  });

  it('detects high reprojection error', () => {
    const report = analyzeQuality(badCalib);
    expect(report.findings.some((f) => f.severity === 'error' && f.message.includes('RMS'))).toBe(true);
  });

  it('detects outlier images', () => {
    const report = analyzeQuality(badCalib);
    expect(report.reprojection.outlierIndices.length).toBeGreaterThan(0);
  });

  it('warns on low image count', () => {
    const report = analyzeQuality(badCalib);
    expect(report.findings.some((f) => f.message.includes('Only 6 images'))).toBe(true);
  });

  it('identifies barrel distortion', () => {
    const report = analyzeQuality(goodCalib);
    expect(report.distortion.type).toBe('barrel');
    expect(report.distortion.k1).toBe(-0.1);
  });

  it('detects tangential distortion', () => {
    const report = analyzeQuality(badCalib);
    expect(report.findings.some((f) => f.message.includes('Tangential'))).toBe(true);
  });

  it('reprojection stats are correct', () => {
    const report = analyzeQuality(goodCalib);
    expect(report.reprojection.min).toBeCloseTo(0.11, 2);
    expect(report.reprojection.max).toBeCloseTo(0.20, 2);
    expect(report.reprojection.mean).toBeGreaterThan(0);
    expect(report.reprojection.stdDev).toBeGreaterThan(0);
  });
});
