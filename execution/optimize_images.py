import os
from PIL import Image

def convert_to_webp(directory):
    print(f"Scansionando la directory: {directory}")
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.lower().endswith(('.png', '.jpg', '.jpeg')):
                file_path = os.path.join(root, file)
                # Skip if already a webp version exists (optional, but let's overwrite to be sure)
                output_path = os.path.splitext(file_path)[0] + ".webp"
                
                try:
                    with Image.open(file_path) as img:
                        # Convert to RGB if saving as JPG-like WebP or keep RGBA
                        img.save(output_path, "WEBP", quality=80)
                        print(f"Convertito: {file} -> {os.path.basename(output_path)}")
                except Exception as e:
                    print(f"Errore nella conversione di {file}: {e}")

if __name__ == "__main__":
    assets_dir = "frontend/assets"
    images_dir = os.path.join(assets_dir, "images")
    logos_dir = os.path.join(assets_dir, "logos")
    
    if os.path.exists(images_dir):
        convert_to_webp(images_dir)
    if os.path.exists(logos_dir):
        convert_to_webp(logos_dir)
    
    print("\nConversione completata!")
