import os
from PIL import Image

def process_image(src_path, dest_desktop, dest_mobile, max_desktop=1920, max_mobile=800, desktop_q=82, mobile_q=80):
    if not os.path.exists(src_path):
        print(f"ERROR: Source file does not exist: {src_path}")
        return False
        
    try:
        with Image.open(src_path) as img:
            orig_w, orig_h = img.size
            print(f"\nProcessing: {os.path.basename(src_path)} ({orig_w}x{orig_h}px)")
            
            # 1. Desktop version
            if orig_w > max_desktop or orig_h > max_desktop:
                if orig_w > orig_h:
                    w = max_desktop
                    h = int((max_desktop / orig_w) * orig_h)
                else:
                    h = max_desktop
                    w = int((max_desktop / orig_h) * orig_w)
            else:
                w, h = orig_w, orig_h
                
            desktop_img = img.resize((w, h), Image.Resampling.LANCZOS)
            desktop_img.save(dest_desktop, "WEBP", quality=desktop_q, method=6)
            print(f" -> Saved Desktop: {dest_desktop} ({os.path.getsize(dest_desktop)/1024:.1f} KB)")
            
            # 2. Mobile version
            if orig_w > max_mobile or orig_h > max_mobile:
                if orig_w > orig_h:
                    wm = max_mobile
                    hm = int((max_mobile / orig_w) * orig_h)
                else:
                    hm = max_mobile
                    wm = int((max_mobile / orig_h) * orig_w)
            else:
                wm, hm = orig_w, orig_h
                
            mobile_img = img.resize((wm, hm), Image.Resampling.LANCZOS)
            mobile_img.save(dest_mobile, "WEBP", quality=mobile_q, method=6)
            print(f" -> Saved Mobile: {dest_mobile} ({os.path.getsize(dest_mobile)/1024:.1f} KB)")
            return True
            
    except Exception as e:
        print(f"Error processing {src_path}: {e}")
        return False

def main():
    img_dest_dir = r"c:\Users\virgi\Desktop\REBRANDING PLAYA\frontend\assets\images"
    os.makedirs(img_dest_dir, exist_ok=True)
    
    # Paths of generated PNGs
    mappings = [
        (
            r"C:\Users\virgi\.gemini\antigravity-ide\brain\1d9fead6-5e02-424b-886b-b010ccc2c41d\hero_damai_1781012658115.png",
            os.path.join(img_dest_dir, "hero-damai.webp"),
            os.path.join(img_dest_dir, "mobile-hero-damai.webp"),
            1920
        ),
        (
            r"C:\Users\virgi\.gemini\antigravity-ide\brain\1d9fead6-5e02-424b-886b-b010ccc2c41d\damai_pool_1781012673760.png",
            os.path.join(img_dest_dir, "damai-pool-sunset.webp"),
            os.path.join(img_dest_dir, "mobile-damai-pool-sunset.webp"),
            1200
        ),
        (
            r"C:\Users\virgi\.gemini\antigravity-ide\brain\1d9fead6-5e02-424b-886b-b010ccc2c41d\damai_details_1781012692502.png",
            os.path.join(img_dest_dir, "damai-garden-details.webp"),
            os.path.join(img_dest_dir, "mobile-damai-garden-details.webp"),
            1200
        )
    ]
    
    for src, desk, mob, max_d in mappings:
        process_image(src, desk, mob, max_desktop=max_d)

if __name__ == "__main__":
    main()
