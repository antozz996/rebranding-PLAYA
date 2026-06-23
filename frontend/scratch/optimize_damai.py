import os
import subprocess
from PIL import Image

def process_image(src_path, dest_desktop, dest_mobile, max_desktop=1600, max_mobile=800, desktop_q=82, mobile_q=80):
    if not os.path.exists(src_path):
        print(f"ERROR: Source file does not exist: {src_path}")
        return False
        
    try:
        with Image.open(src_path) as img:
            orig_w, orig_h = img.size
            print(f"\nProcessing image: {os.path.basename(src_path)} ({orig_w}x{orig_h}px)")
            
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
        print(f"Error processing image {src_path}: {e}")
        return False

def compress_video(src_path, dest_path, width, crf=30):
    if not os.path.exists(src_path):
        print(f"ERROR: Source video does not exist: {src_path}")
        return False
        
    ffmpeg_path = r"C:\Users\virgi\AppData\Local\Microsoft\WinGet\Links\ffmpeg.exe"
    if not os.path.exists(ffmpeg_path):
        # Fallback to PATH search
        ffmpeg_path = "ffmpeg"
        
    print(f"\nCompressing video: {os.path.basename(src_path)}")
    print(f" -> Target width: {width}px, CRF: {crf}")
    
    cmd = [
        ffmpeg_path,
        "-i", src_path,
        "-vcodec", "libx264",
        "-crf", str(crf),
        "-preset", "fast",
        "-vf", f"scale={width}:-2",
        "-an",
        "-movflags", "+faststart",
        dest_path,
        "-y"
    ]
    
    try:
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode != 0:
            print(f"FFmpeg failed with code {res.returncode}")
            print(f"Stderr: {res.stderr}")
            return False
            
        print(f" -> Saved Video: {dest_path} ({os.path.getsize(dest_path)/1024/1024:.2f} MB)")
        return True
    except Exception as e:
        print(f"Error running FFmpeg on {src_path}: {e}")
        return False

def main():
    src_dir = r"c:\Users\virgi\Desktop\REBRANDING PLAYA\DAMAI"
    dest_dir = r"c:\Users\virgi\Desktop\REBRANDING PLAYA\frontend\assets\images"
    os.makedirs(dest_dir, exist_ok=True)
    
    # 1. Image Mappings (source file -> (desktop output, mobile output, max desktop size))
    image_mappings = [
        ("2c51b13c-eecb-4430-8b57-ffda56fc44a8.jpg", "damai-boho-tables.webp", "mobile-damai-boho-tables.webp", 1600),
        ("90550a32-85e7-481a-9692-97c042ce6114.jpg", "damai-shisha-lounge.webp", "mobile-damai-shisha-lounge.webp", 1200),
        ("cdd11d34-3adc-49df-839f-6e0e08ff104f.jpg", "damai-sushi-station.webp", "mobile-damai-sushi-station.webp", 1200),
        ("e10d797a-e062-4e82-94cd-695d4c732655.jpg", "damai-cocktail-bar.webp", "mobile-damai-cocktail-bar.webp", 1200)
    ]
    
    print("--- STARTING IMAGE OPTIMIZATION ---")
    for src, desk, mob, max_d in image_mappings:
        src_path = os.path.join(src_dir, src)
        dest_desk = os.path.join(dest_dir, desk)
        dest_mob = os.path.join(dest_dir, mob)
        process_image(src_path, dest_desk, dest_mob, max_desktop=max_d)
        
    # 2. Video Mappings (source file -> output file, target width, crf)
    video_mappings = [
        ("damai_eventgarden.mp4", "damai-hero-web.mp4", 1280, 30),
        ("f0bfd778-2f9e-4e5c-a74a-b6fdfb9e9094.mp4", "mobile-damai-hero-web.mp4", 540, 30)
    ]
    
    print("\n--- STARTING VIDEO OPTIMIZATION ---")
    for src, out, width, crf in video_mappings:
        src_path = os.path.join(src_dir, src)
        dest_path = os.path.join(dest_dir, out)
        compress_video(src_path, dest_path, width, crf)
        
    print("\n--- OPTIMIZATION COMPLETE! ---")

if __name__ == "__main__":
    main()
