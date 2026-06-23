import os
from PIL import Image

def resize_images(directory, target_width=800):
    print(f"Resizing images in: {directory} to max width {target_width}")
    
    # Supported formats
    valid_extensions = ('.webp', '.jpg', '.jpeg', '.png')
    
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.lower().endswith(valid_extensions) and not file.startswith('mobile-'):
                file_path = os.path.join(root, file)
                try:
                    with Image.open(file_path) as img:
                        width, height = img.size
                        if width > target_width:
                            # Calculate new height to maintain aspect ratio
                            new_height = int((target_width / width) * height)
                            resized_img = img.resize((target_width, new_height), Image.Resampling.LANCZOS)
                            
                            # Save as a new mobile version
                            name, ext = os.path.splitext(file)
                            mobile_name = f"mobile-{name}{ext}"
                            mobile_path = os.path.join(root, mobile_name)
                            
                            # Save with optimization
                            if ext.lower() == '.webp':
                                resized_img.save(mobile_path, 'WEBP', quality=80)
                            else:
                                resized_img.save(mobile_path, optimize=True, quality=80)
                                
                            print(f"Created: {mobile_name} ({target_width}px wide)")
                except Exception as e:
                    print(f"Error processing {file}: {e}")

if __name__ == "__main__":
    # Target common image directories
    paths = [
        "frontend/assets/images",
        "frontend/assets/images/social",
        "frontend/assets/logos"
    ]
    for p in paths:
        if os.path.exists(p):
            resize_images(p, target_width=800)
