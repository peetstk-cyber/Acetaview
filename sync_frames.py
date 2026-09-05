#!/usr/bin/env python3
"""
sync_frames.py - Exact Frame Counter & Synchronizer for AcetaView

Scans all case directories under ./videos/
Counts continuous image frames across all 5 planes:
  - axial
  - sagittal
  - coronal
  - 3d_horizontal
  - 3d_vertical
And synchronizes the frame counts into:
  - js/casesData.js
  - js/app.js
"""

import os
import re
import json
import sys

VALID_EXTENSIONS = ('.jpg', '.jpeg', '.webp', '.png')
VIEWS_2D = ['axial', 'sagittal', 'coronal']
VIEWS_3D = ['3d_horizontal', '3d_vertical']
ALL_VIEWS = VIEWS_2D + VIEWS_3D

def scan_case_frames(base_dir="./videos"):
    if not os.path.exists(base_dir):
        print(f"Error: Base directory '{base_dir}' not found.")
        sys.exit(1)

    case_dirs = sorted([
        d for d in os.listdir(base_dir)
        if d.startswith("Case") and os.path.isdir(os.path.join(base_dir, d))
    ])

    if not case_dirs:
        print(f"No Case folders found in '{base_dir}'.")
        sys.exit(1)

    cases_data = []

    print(f"\n🔍 Scanning {len(case_dirs)} cases in '{base_dir}'...\n")
    print(f"{'Case':<10} | {'Axial':<6} | {'Sagittal':<8} | {'Coronal':<7} | {'3D-Horiz':<8} | {'3D-Vert':<7} | Status")
    print("-" * 75)

    for idx, case_name in enumerate(case_dirs, start=1):
        case_path = os.path.join(base_dir, case_name)
        case_id = f"case-{idx:02d}"
        case_title = f"Case {idx:02d}"

        slices = {}
        views3d = {}
        warnings = []

        for view in ALL_VIEWS:
            v_path = os.path.join(case_path, view)
            if not os.path.exists(v_path):
                warnings.append(f"Missing '{view}'")
                count = 0
            else:
                files = [f for f in os.listdir(v_path) if f.lower().endswith(VALID_EXTENSIONS)]
                nums = []
                for f in files:
                    m = re.findall(r'\d+', f)
                    if m:
                        nums.append(int(m[-1]))
                nums.sort()
                count = len(files)

                # Check continuity
                if nums and nums != list(range(1, count + 1)):
                    missing = sorted(list(set(range(1, max(nums) + 1)) - set(nums)))
                    if missing:
                        warnings.append(f"{view}: missing {missing[:3]}")

            if view in VIEWS_2D:
                slices[view] = count
            else:
                plane_name = view.replace("3d_", "")
                views3d[plane_name] = count

        status = "✅ OK" if not warnings else "⚠️ " + ", ".join(warnings)
        print(f"{case_name:<10} | {slices.get('axial', 0):<6} | {slices.get('sagittal', 0):<8} | {slices.get('coronal', 0):<7} | {views3d.get('horizontal', 0):<8} | {views3d.get('vertical', 0):<7} | {status}")

        cases_data.append({
            "id": case_id,
            "caseNumber": idx,
            "title": case_title,
            "folder": case_name,
            "slices": slices,
            "views3d": views3d
        })

    return cases_data


def generate_js_array_string(cases_data):
    lines = ["window.CASES_DATA = ["]
    for i, c in enumerate(cases_data):
        comma = "," if i < len(cases_data) - 1 else ""
        slices_str = f"axial: {c['slices']['axial']}, sagittal: {c['slices']['sagittal']}, coronal: {c['slices']['coronal']}"
        views3d_str = f"horizontal: {c['views3d']['horizontal']}, vertical: {c['views3d']['vertical']}"
        line = f'  {{ id: "{c["id"]}", caseNumber: {c["caseNumber"]}, title: "{c["title"]}", folder: "{c["folder"]}", slices: {{ {slices_str} }}, views3d: {{ {views3d_str} }} }}{comma}'
        lines.append(line)
    lines.append("];")
    return "\n".join(lines)


def update_target_file(file_path, new_js_code):
    if not os.path.exists(file_path):
        print(f"Warning: File {file_path} not found.")
        return False

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    pattern = r"window\.CASES_DATA\s*=\s*\[[\s\S]*?\];"
    if not re.search(pattern, content):
        print(f"Warning: 'window.CASES_DATA = [...]' pattern not found in {file_path}")
        return False

    updated_content = re.sub(pattern, new_js_code, content, count=1)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(updated_content)

    print(f"💾 Updated: {file_path}")
    return True


def main():
    base_dir = "./videos"
    cases_data = scan_case_frames(base_dir)
    new_js_code = generate_js_array_string(cases_data)

    print("\n" + "=" * 75)
    update_target_file("./js/casesData.js", new_js_code)
    update_target_file("./js/app.js", new_js_code)
    print("=" * 75)
    print("✨ Frame synchronization complete!\n")


if __name__ == "__main__":
    main()
