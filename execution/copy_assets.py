import os
import shutil
from PIL import Image

# Path definitions
BASE_PATH = r"c:\Users\virgi\Desktop\REBRANDING PLAYA"
SOURCE_MATERIAL = r"c:\Users\virgi\Desktop\LANDING PAGE\materiale"
DESKTOP_PATH = r"c:\Users\virgi\Desktop"
OUTPUT_ASSETS = os.path.join(BASE_PATH, "frontend", "assets")
IMAGES_PATH = os.path.join(OUTPUT_ASSETS, "images")
LOGOS_PATH = os.path.join(OUTPUT_ASSETS, "logos")

# Create directories
os.makedirs(IMAGES_PATH, exist_ok=True)
os.makedirs(LOGOS_PATH, exist_ok=True)

def optimize_image(source, destination, max_dim=1920, quality=85):
    try:
        with Image.open(source) as img:
            # Convert to RGB if necessary
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            
            # Resize
            img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
            
            # Save
            img.save(destination, "JPEG", quality=quality, optimize=True)
            print(f"Optimized: {os.path.basename(destination)}")
    except Exception as e:
        print(f"Error optimizing {source}: {e}")

def copy_logo(source, destination):
    try:
        shutil.copy2(source, destination)
        print(f"Copied Logo: {os.path.basename(destination)}")
    except Exception as e:
        print(f"Error copying logo {source}: {e}")

# Mapping for the new structure
mapping = {
    # HERO & ABOUT
    os.path.join(SOURCE_MATERIAL, "Playa Luna", "Foto Location", "PlayaLocation1.jpg"): "hero-home.jpg",
    os.path.join(SOURCE_MATERIAL, "Playa Luna", "PlayaFood", "PlayaFood4.jpg"): "about-home.jpg",
    os.path.join(DESKTOP_PATH, "TRAMONTO.JPG"): "booking-bg.jpg",
    
    # ECOSYSTEM
    os.path.join(SOURCE_MATERIAL, "Culto", "Foto Location", "25.4 Dav-7786.JPG"): "culto-eco.jpg",
    os.path.join(SOURCE_MATERIAL, "Fiordacqua", "Foto Location", "GioMePhXfiordacqua-17.jpg"): "fiordacqua-eco.jpg",
    os.path.join(SOURCE_MATERIAL, "Naturale", "Foto Location", "NaturaleLocation1.jpg"): "naturale-eco.jpg",
    os.path.join(SOURCE_MATERIAL, "Damai", "Foto Location", "GioMePhXraffydf-150.jpg"): "damai-eco.jpg",
    os.path.join(SOURCE_MATERIAL, "Key Beach", "Foto Location", "KeyLocation1.jpg"): "keybeach-eco.jpg",
}

logos_mapping = {
    os.path.join(SOURCE_MATERIAL, "Joia - Forma", "Logo Joia", "Joia.png"): "joia.png",
    os.path.join(SOURCE_MATERIAL, "Varcadoro", "Logo Varcadoro", "Varcadoro.png"): "varcadoro.png",
    os.path.join(SOURCE_MATERIAL, "La Costiera", "Logo La Costiera", "La Costiera.png"): "la-costiera.png",
    os.path.join(SOURCE_MATERIAL, "Culto", "Logo Culto", "Culto.png"): "culto.png",
    os.path.join(SOURCE_MATERIAL, "Fiordacqua", "Logo Fiordacqua", "Fiordacqua.png"): "fiordacqua.png",
    os.path.join(SOURCE_MATERIAL, "Damai", "Logo Damai", "Damai.png"): "damai.png",
    os.path.join(SOURCE_MATERIAL, "Naturale", "Logo Naturale", "Naturale.png"): "naturale.png",
}

print("--- Optimizing Images ---")
for src, dest_name in mapping.items():
    if os.path.exists(src):
        optimize_image(src, os.path.join(IMAGES_PATH, dest_name))
    else:
        print(f"MISSING: {src}")

print("\n--- Copying Logos ---")
for src, dest_name in logos_mapping.items():
    if os.path.exists(src):
        copy_logo(src, os.path.join(LOGOS_PATH, dest_name))
    else:
        print(f"MISSING LOGO: {src}")

print("\n--- Asset Preparation Complete ---")
