import os
from PIL import Image

def generate_thumbnails():
    src_dir = r"C:\Users\virgi\Desktop\REBRANDING PLAYA\Foto video sito Playa"
    dest_dir = r"c:\Users\virgi\Desktop\REBRANDING PLAYA\.tmp\thumbnails"
    os.makedirs(dest_dir, exist_ok=True)
    
    files = [
        "1111.jpg",
        "2F8A0050.jpg",
        "2F8A0242.jpg",
        "2F8A0710.jpg",
        "2F8A3350.jpg",
        "2F8A3359.jpg"
    ]
    
    print("Generating thumbnails...")
    for f in files:
        src_path = os.path.join(src_dir, f)
        dest_path = os.path.join(dest_dir, f)
        
        if os.path.exists(src_path):
            try:
                with Image.open(src_path) as img:
                    img.thumbnail((600, 600), Image.Resampling.LANCZOS)
                    # Convert format to JPEG just in case
                    if img.mode in ("RGBA", "P"):
                        img = img.convert("RGB")
                    img.save(dest_path, "JPEG", quality=80)
                    print(f"Created thumbnail for {f}")
            except Exception as e:
                print(f"Error creating thumbnail for {f}: {e}")
        else:
            print(f"File not found: {src_path}")

if __name__ == "__main__":
    generate_thumbnails()
