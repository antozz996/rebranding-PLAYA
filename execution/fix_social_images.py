import os

def fix_social_images(directory):
    print(f"Fixing social images in: {directory}")
    
    # Path to social images
    social_dir = os.path.join(directory, "assets", "images", "social")
    
    if os.path.exists(social_dir):
        # Map of what the HTML expects vs what we have
        # HTML expects lido-1.webp, we have eventi-1.webp
        # We'll create copies or renames. Copies are safer if other files expect eventi-1
        files = os.listdir(social_dir)
        for f in files:
            if f.startswith("eventi-") and f.endswith(".webp"):
                num = f.split("-")[1]
                new_name = f"lido-{num}"
                new_path = os.path.join(social_dir, new_name)
                old_path = os.path.join(social_dir, f)
                if not os.path.exists(new_path):
                    import shutil
                    shutil.copy2(old_path, new_path)
                    print(f"Copied: {f} -> {new_name}")

if __name__ == "__main__":
    fix_social_images("frontend")
