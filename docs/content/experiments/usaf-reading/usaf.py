"""What a USAF 1951 reading means on your sensor.
Usage: python usaf.py GROUP ELEMENT PIXEL_UM MAGNIFICATION     e.g.  python usaf.py 5 1 3.45 0.5"""
import sys

group, element = int(sys.argv[1]), int(sys.argv[2])
pixel_um, magnification = float(sys.argv[3]), float(sys.argv[4])

chart_lp_mm = 2 ** (group + (element - 1) / 6)
bar_um = 1000 / (2 * chart_lp_mm)
sensor_lp_mm = chart_lp_mm / magnification
bar_px = bar_um * magnification / pixel_um
nyquist = 1000 / (2 * pixel_um)

print(f"group {group}, element {element} on the chart: {chart_lp_mm:.3g} lp/mm, bars {bar_um:.3g} um wide")
print(f"on the sensor at {magnification:g}x: {sensor_lp_mm:.3g} lp/mm, bars {bar_px:.2f} px wide")
print(f"that is {sensor_lp_mm / nyquist:.2f} of the sensor's Nyquist limit ({nyquist:.4g} lp/mm)")
if bar_px < 1.3:
    print("bars under 1.3 px: move the chart a little and read again, this reading can change by itself")
else:
    print("bars over 1.3 px: the lens or the focus sets this reading, not the pixels")
