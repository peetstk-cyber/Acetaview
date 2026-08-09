import os
import sys

def rename_images_in_folder(folder_path):
    """
    Automatically renames image files in a folder to 001.jpg, 002.jpg, 003.jpg...
    """
    if not os.path.exists(folder_path):
        print(f"Folder not found: {folder_path}")
        return

    valid_extensions = ('.jpg', '.jpeg', '.webp', '.png')
    files = [f for f in os.listdir(folder_path) if f.lower().endswith(valid_extensions)]
    files.sort() // Sort naturally

    print(f"Found {len(files)} image frames in '{folder_path}'")

    for index, filename in enumerate(files, start=1):
        ext = os.path.splitext(filename)[1].lower()
        new_name = f"{index:03d}{ext}"
        src = os.path.join(folder_path, filename)
        dst = os.path.join(folder_path, new_name)
        
        # Temp rename to prevent collisions
        temp_dst = os.path.join(folder_path, f"temp_{new_name}")
        os.rename(src, temp_dst)

    # Final rename
    temp_files = [f for f in os.listdir(folder_path) if f.startswith("temp_")]
    temp_files.sort()

    for f in temp_files:
        src = os.path.join(folder_path, f)
        dst = os.path.join(folder_path, f.replace("temp_", ""))
        os.rename(src, dst)

    print(f"✅ Successfully renamed {len(files)} files into 001, 002, 003 format!")

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "./videos/Case01/axial"
    rename_images_in_folder(target)
