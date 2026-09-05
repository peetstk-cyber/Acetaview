---
name: sync-case-frames
description: Scan CT scan and 3D reconstruction image directories across cases (axial, sagittal, coronal, 3d_horizontal, 3d_vertical), count continuous frame sequences, detect gaps or stray files, and synchronize frame counts into js/casesData.js and js/app.js.
---

# AcetaView Case Frame Synchronizer (`sync-case-frames`)

A specialized skill for inspecting CT scan slices and 3D rotational render sequences across clinical research cases, validating sequential image continuity, and automatically updating application state metadata (`casesData.js` and `app.js`).

---

## 1. Directory & File Hierarchy

Frames are stored under `./videos/` with the following structure:

```
videos/
├── Case01/
│   ├── axial/           # ezgif-frame-001.jpg ... ezgif-frame-140.jpg
│   ├── sagittal/        # ezgif-frame-001.jpg ... ezgif-frame-111.jpg
│   ├── coronal/         # ezgif-frame-001.jpg ... ezgif-frame-108.jpg
│   ├── 3d_horizontal/   # ezgif-frame-001.jpg ... ezgif-frame-092.jpg
│   └── 3d_vertical/     # ezgif-frame-001.jpg ... ezgif-frame-108.jpg
├── Case02/
│   └── ...
└── Case10/
```

### Supported Image Formats
- `.jpg`, `.jpeg`, `.webp`, `.png`
- Ignored files: `.DS_Store`, thumbs, temp files, or non-image files.

---

## 2. Synchronization Procedure

When image frames are added, deleted, trimmed, or replaced in any case directory:

### Step 1: Run the Automated Sync Script
Execute the project synchronizer:
```bash
python3 sync_frames.py
```

### Step 2: Validate Sequence Continuity
The script checks for:
- **1-indexed continuous sequence**: e.g., frames `001` to `N` without gaps.
- **Stray / Orphan files**: files with irregular numbering (e.g., non-consecutive frame `090` when count is `27`) or mismatched resolutions.
- **Missing views**: alerts if any of the 5 planes are missing.

### Step 3: Verified Target Files
The script updates:
1. `js/casesData.js`: The global data definition `window.CASES_DATA = [...]`.
2. `js/app.js`: The embedded dataset `window.CASES_DATA = [...]` in the main application logic.

---

## 3. Data Schema Reference

Each entry in `window.CASES_DATA` conforms to:

```javascript
{
  id: "case-01",
  caseNumber: 1,
  title: "Case 01",
  folder: "Case01",
  slices: {
    axial: 140,
    sagittal: 111,
    coronal: 108
  },
  views3d: {
    horizontal: 92,
    vertical: 108
  }
}
```

---

## 4. Troubleshooting & Edge Cases

1. **Slider Range Mismatch**:
   - If UI sliders or slice badges exceed the number of images, verify that `sync_frames.py` has been re-run.
2. **404 Image Requests**:
   - Check if frames were renamed or have numbering gaps.
   - Run `python3 rename_frames.py <folder>` if files need natural re-indexing to `001.jpg`, `002.jpg` format.
3. **Ghost / Stray Frames**:
   - Remove any extraneous screenshots or legacy files before running `sync_frames.py`.
