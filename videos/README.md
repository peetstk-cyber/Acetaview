# 📁 Video Storage Structure for Acetabulum Research Platform

Place video files inside subfolders named `case01` through `case10` under `/videos/`.

## Folder Hierarchy:
```
videos/
├── case01/
│   ├── axial.mp4
│   ├── sagittal.mp4
│   ├── coronal.mp4
│   ├── 3d_horizontal.mp4
│   └── 3d_vertical.mp4
├── case02/
│   ├── axial.mp4
│   ...
└── case10/
```

---

## 🎬 FFmpeg Encoding Recommendation for 30 Concurrent iPad Users

To achieve **instant frame scrubbing** without video lag when 30 iPad users scrub CT slices simultaneously, encode MP4 files with a dense Keyframe Interval (GOP = 1 or GOP = 5):

```bash
# 2D Slices Video Encoding (Axial / Sagittal / Coronal)
ffmpeg -i input_axial_slices/ -c:v libx264 -pix_fmt yuv420p -g 1 -crf 20 -preset fast axial.mp4

# 3D Rotation Video Encoding
ffmpeg -i input_3d_frames/ -c:v libx264 -pix_fmt yuv420p -g 5 -crf 22 -preset fast 3d_horizontal.mp4
```

> **Note:** If video files are missing, the web app automatically renders realistic synthetic CT slices and interactive 3D bone renders on HTML5 Canvas so you can test the platform immediately.
