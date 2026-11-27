# Kalibr camera-IMU calibration: what matters?

Scripts and saved results behind `src/content/guides/kalibr-camera-imu-calibration.md`.
`src/lib/cameraImuGuide.test.ts` checks every number and every Kalibr fact in the guide against the files in `results/`.

Kalibr itself was not run. The guide rests on three things:

| File | What it does | Result file |
|---|---|---|
| `kalibr_facts.py` | Downloads Kalibr's two calibration scripts and its AprilGrid source at commit `1f60227`, its wiki pages, and one example configuration file each of OpenVINS and VINS-Fusion, and extracts the options, defaults, output file names, camera models and the sentences the guide quotes. Needs network access. | `results/kalibr_facts.json` |
| `lab.py` | A simulated rig (camera at 20 Hz, IMU at 200 Hz, 69 mm apart, moved in front of a grid) and a small estimator of the camera-IMU transform and time offset: splines through the camera poses, then least squares against the IMU samples. Not Kalibr's estimator. numpy, scipy and OpenCV. | |
| `run.py` | 17 cases of 30 recordings: pace, missing rotation or translation, length, time offset estimated or ignored, late camera stamps, IMU samples in bursts, a wrong grid size, a jolt, more corner noise. About 15 minutes on two cores. | `results/recordings.json` |
| `motion_stats.py` | How fast the simulated rig turns and accelerates at each pace. | `results/motion_stats.json` |
| `allan.py` | A simulated gyroscope standing still for 6 minutes to 5 hours, 40 recordings each: Allan deviation, white noise at 1 s, random walk from the fitted line at 3 s, and the raw curve at 3 s. | `results/allan.json` |
| `check_imu_stamps.py`, `invert.py` | The two scripts printed in the guide. | `results/stamps_steady.txt`, `results/stamps_bursts.txt`, `results/invert.txt` |
| `examples.py` | Writes the files those two scripts were run on to `/tmp`; the camchain file is also kept as `results/camchain_example.yaml`. | |

Made with opencv-python-headless 5.1.0.95, numpy 2, scipy and pyyaml.

    python kalibr_facts.py
    python run.py 0 2 & python run.py 1 2 ; wait ; python run.py merge
    python motion_stats.py
    python allan.py
    python examples.py
    python check_imu_stamps.py /tmp/imu_stamps_steady.txt > results/stamps_steady.txt
    python check_imu_stamps.py /tmp/imu_stamps_bursts.txt > results/stamps_bursts.txt
    python invert.py /tmp/dynamic-camchain-imucam.yaml > results/invert.txt

Raw wiki pages are served at their newest revision only; `kalibr_facts.json` records the wiki revision at the time of the run.

All of it is simulation or reading. No camera, IMU or ROS installation was used.
