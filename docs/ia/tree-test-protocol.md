# Tree Test Protocol

## Overview

A remote, unmoderated tree test to validate the proposed navigation structure before
implementation changes are deployed.

## Participants

- **Count:** 5-8 engineers (vision, robotics, or manufacturing background preferred)
- **Recruitment:** Internal team + friendly contacts; no prior exposure to calib.tools nav redesign

## Setup

1. Open `docs/ia/tree-test.html` in a browser (local file, no server needed)
2. Participant enters their name or initials
3. Click "Start test"

## Procedure

- 10 tasks presented in random order (shuffled per participant)
- For each task, participant clicks the nav item where they would first look
- They can open dropdown groups and click sub-items
- First click and full click path are recorded automatically
- No time limit per task; total session ~10 minutes

## Tasks

See `docs/ia/tasks.md` for the 10 tasks and their expected targets.

## Metrics

| Metric | Definition | Pass bar |
|---|---|---|
| Task success rate | Participant lands on a correct target page | >= 80% across all participants |
| First-click accuracy | First click is on the correct header group | >= 70% across all participants |

## Data Collection

Each session produces a JSON export with:
- Participant identifier
- Task presentation order
- Per-task: first click, full click path, selected destination, correctness
- Summary: first-click accuracy %, task success %

## Analysis

1. Aggregate all JSON exports
2. Per-task success rate — identify tasks below 60% (navigation confusion)
3. Per-group first-click heat map — identify misleading labels
4. If pass bar is met: proceed with implementation
5. If not: revise labels/grouping based on confusion patterns, re-test

## Timeline

- **Build:** 2026-10-28 (done)
- **Test window:** 2026-10-29 to 2026-11-01
- **Analysis + revision:** 2026-11-02
