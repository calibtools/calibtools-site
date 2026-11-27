"""Reads the facts the guide states about Kalibr out of Kalibr's own source and wiki, at fixed commits. Kalibr itself is not
run. Run: python kalibr_facts.py   (needs network access to raw.githubusercontent.com)"""
import json, re, urllib.request
SRC = "1f60227442d25e36365ef5f72cd80b9666d73467"          # ethz-asl/kalibr
WIKI = "73a2ba7e134dded9d3472e053c51c6f2d29133a4"          # ethz-asl/kalibr.wiki, the newest revision when this was run
def get(url): return urllib.request.urlopen(url, timeout=60).read().decode()
def src(path): return get(f"https://raw.githubusercontent.com/ethz-asl/kalibr/{SRC}/{path}")
def wiki(page): return get(f"https://raw.githubusercontent.com/wiki/ethz-asl/kalibr/{page}.md")   # raw wiki pages are served at their newest revision only

imucam = src("aslam_offline_calibration/kalibr/python/kalibr_calibrate_imu_camera")
cams = src("aslam_offline_calibration/kalibr/python/kalibr_calibrate_cameras")
grid = src("aslam_cv/aslam_cameras_april/src/GridCalibrationTargetAprilgrid.cpp")
flags = lambda text: sorted(set(re.findall(r"add_argument\('(--[a-z-]+)'", text)))
default = lambda text, flag: re.search(rf"add_argument\('{flag}'[^\n]*?default=([0-9.e-]+)", text).group(1)
outputs = lambda text: re.findall(r'bagtag \+ "(-[a-z0-9-]+\.[a-z]+)"', text)
w_imucam, w_noise, w_yaml, w_targets, w_multi, w_ros2 = (wiki(p) for p in ("Camera-IMU-calibration", "IMU-Noise-Model", "Yaml-formats", "Calibration-targets", "Multiple-camera-calibration", "ROS2-Calibration-Using-Kalibr"))
def has(text, phrase): return phrase in text
facts = dict(
    source_commit=SRC, wiki_commit=WIKI,
    imu_camera_flags=flags(imucam), camera_flags=flags(cams),
    timeoffset_padding_help=re.search(r"'--timeoffset-padding'[^\n]*help='([^'\[]+)", imucam).group(1).strip(),
    no_time_calibration_help=re.search(r"'--no-time-calibration'[^\n]*help='([^']+)'", imucam).group(1),
    timeoffset_padding_s=float(default(imucam, "--timeoffset-padding")), max_iter=int(default(imucam, "--max-iter")),
    imu_camera_outputs=outputs(imucam), camera_outputs=outputs(cams),
    camera_models=re.findall(r"'([a-z]+-[a-z]+)':\s+acvb\.", cams),
    aprilgrid_point_formula=has(grid, "point(0) = (int) (c / 2) * (1 + _tagSpacing) * _tagSize"),
    aprilgrid_tag1_bottom_left=bool(re.search(r"y\s+\| TAG 1 \|  \| TAG 2 \|\n///   \^\s+0-------1  2-------3", grid)),
    wiki=dict(
        rates=has(w_imucam, "Good results have been obtained by using a camera rate of 20 Hz and an IMU rate of 200 Hz."),
        excite_all_axes=has(w_imucam, "try to excite all IMU axes (rotation and translation)"),
        avoid_shocks=has(w_imucam, "avoid shocks, especially at the beginning/end when you pick up the sensor"),
        t_cam_imu=has(w_yaml, "IMU extrinsics: transformation from IMU to camera coordinates (T_c_i)"),
        timeshift=has(w_yaml, "timeshift between camera and IMU timestamps in seconds (t_imu = t_cam + shift)"),
        noise_example=[has(w_yaml, s) for s in ("accelerometer_noise_density: 1.86e-03", "accelerometer_random_walk:   4.33e-04", "gyroscope_noise_density:     1.87e-04", "gyroscope_random_walk:       2.66e-05")],
        white_noise_at_1s=has(w_noise, r"correspond to the values at $AD(\tau=1s)$"),
        random_walk_at_3s=has(w_noise, r'(fitted) "random walk" diagonal at an integration time of $\tau=3s$'),
        factor_10=has(w_noise, "for lowest-cost sensors, increasing the noise model parameters by a factor of 10x or more may be necessary"),
        allan_tool=has(w_noise, "ori-drs/allan_variance_ros"),
        aprilgrid_recommended=has(w_targets, "It is recommended to use the Aprilgrid") and has(w_targets, "Partially visible Aprilgrid targets can be detected without problems."),
        tag_size_edge_to_edge=has(w_targets, "tagSize: 0.088           #size of apriltag, edge to edge [m]"),
        tag_spacing_ratio=has(w_targets, "tagSpacing: 0.3          #ratio of space between tags to tagSize"),
        camera_4hz=has(w_multi, "lower the frequency of the camera streams to around 4 Hz"),
        short_shutter=has(w_imucam, "keep the camera shutter times low"),
        ros1_required=has(w_ros2, "Kalibr requires ROS1 to run."), rosbags_convert=has(w_ros2, "rosbags-convert <ros2_bag_folder> --dst calib_01.bag")))
# two frameworks that read the result: which way round they want the transform
ov = get("https://raw.githubusercontent.com/rpng/open_vins/master/config/euroc_mav/kalibr_imucam_chain.yaml")
vf = get("https://raw.githubusercontent.com/HKUST-Aerial-Robotics/VINS-Fusion/master/config/euroc/euroc_mono_imu_config.yaml")
facts["downstream"] = dict(openvins_T_imu_cam=has(ov, "T_imu_cam: #rotation from camera to IMU R_CtoI, position of camera in IMU p_CinI"),
                           vins_body_T_cam0=has(vf, "body_T_cam0:") and has(vf, "imu^R_cam"),
                           vins_td=has(vf, "readed image clock + td = real image clock (IMU clock)"))
json.dump(facts, open("results/kalibr_facts.json", "w"), indent=1)
print(json.dumps(facts, indent=1))
