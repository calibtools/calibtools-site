# USAF 1951 lp/mm table: how sure is a reading?

Scripts and saved results behind `src/content/guides/usaf-1951-lp-mm-table.md`.
`src/lib/usafGuide.test.ts` recomputes the two lookup tables from the formula and every number about readings from
`results/looks.json`, and checks that the script and the output printed in the guide are the files here.

| File | What it does | Result file |
|---|---|---|
| `lab.py` | One USAF element seen by a camera, in one dimension across the bars: Gaussian lens blur, square pixels, a random position against the pixel grid, optional noise. A rule counts the dark bars. | |
| `run.py` | 18 cases of 500 looks at 22 elements from 0.18 to 2 times Nyquist: six lens blurs, five thresholds for the rule at two blurs, two noise levels, two chart contrasts. | `results/looks.json` |
| `summary.py` | Prints the readings, the system MTF at the reading and the share of looks that disagree. | `results/summary.txt` |
| `usaf.py` | The script printed in the guide: group and element to lp/mm, bar width in pixels and share of Nyquist. | `results/usaf_5_1.txt`, `results/usaf_7_1.txt` |

Made with numpy 2 and scipy. Run from this folder:

    python run.py
    python summary.py > results/summary.txt
    python usaf.py 5 1 3.45 0.5 > results/usaf_5_1.txt
    python usaf.py 7 1 3.45 1 > results/usaf_7_1.txt

All of it is simulation. No lens, no sensor and no person were used. The rule that counts bars stands in for a reader
and is not a model of the eye; noise above 3 % of full scale and low-contrast charts with noise were tried and left
out, because the rule then counts grain as bars.
