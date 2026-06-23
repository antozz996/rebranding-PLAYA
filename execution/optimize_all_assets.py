import os
import shutil
from PIL import Image

def process_image(src, dest_desktop, dest_mobile, max_desktop=1920, max_mobile=800, desktop_q=82, mobile_q=80):
    if not os.path.exists(src):
        print(f"SORGENTE MANCANTE: {src}")
        return False
        
    try:
        with Image.open(src) as img:
            orig_w, orig_h = img.size
            print(f"\nElaborando: {os.path.basename(src)} ({orig_w}x{orig_h}px)")
            
            # 1. Versione Desktop
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
            print(f" -> Desktop: {dest_desktop} ({os.path.getsize(dest_desktop)/1024:.1f} KB)")
            
            # 2. Versione Mobile
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
            print(f" -> Mobile: {dest_mobile} ({os.path.getsize(dest_mobile)/1024:.1f} KB)")
            return True
    except Exception as e:
        print(f"Errore durante l'elaborazione di {src}: {e}")
        return False

def main():
    src_dir = r"C:\Users\virgi\Desktop\REBRANDING PLAYA\Foto video sito Playa"
    img_dest_dir = r"c:\Users\virgi\Desktop\REBRANDING PLAYA\frontend\assets\images"
    video_dest_dir = r"c:\Users\virgi\Desktop\REBRANDING PLAYA\frontend\assets\videos"
    
    os.makedirs(img_dest_dir, exist_ok=True)
    os.makedirs(video_dest_dir, exist_ok=True)
    
    # 1. Copia Video Hero Home
    video_src = os.path.join(src_dir, "Hero home page.mp4")
    video_dest = os.path.join(video_dest_dir, "hero_home.mp4")
    if os.path.exists(video_src):
        print(f"Copia del video hero: {video_src} -> {video_dest}")
        shutil.copy2(video_src, video_dest)
        print(f"Video copiato con successo! ({os.path.getsize(video_dest)/1024/1024:.1f} MB)")
    else:
        print(f"SORGENTE VIDEO MANCANTE: {video_src}")
        
    # Mappatura delle immagini descrittive da ottimizzare
    # (Nome file sorgente in Foto video sito Playa -> (Nome desktop dest, Nome mobile dest))
    image_mappings = {
        "card un pranzo vista mare pagina risto.jpg": ("about-home.webp", "mobile-about-home.webp"),
        "card 2 un pranzo vista mare pagina risto.jpg": ("terrazza-ristorante.webp", "mobile-terrazza-ristorante.webp"),
        "ristorante sezione card home.jpg": ("card-ristorante-home.webp", "mobile-card-ristorante-home.webp"),
        "spiaggia sezione card home.jpg": ("card-beach-home.webp", "mobile-card-beach-home.webp"),
        "eventi sezione card home.jpg": ("card-eventi-home.webp", "mobile-card-eventi-home.webp"),
        "prima card sezione eventi .jpg": ("card-eventi-wedding.webp", "mobile-card-eventi-wedding.webp"),
        "seconda card sezione eventi.jpg": ("card-eventi-birthday.webp", "mobile-card-eventi-birthday.webp"),
        "terza card sezione eventi.jpg": ("card-eventi-corporate.webp", "mobile-card-eventi-corporate.webp"),
    }
    
    for src_name, (dest_desktop_name, dest_mobile_name) in image_mappings.items():
        src_path = os.path.join(src_dir, src_name)
        dest_desktop = os.path.join(img_dest_dir, dest_desktop_name)
        dest_mobile = os.path.join(img_dest_dir, dest_mobile_name)
        
        # Le card possono avere dimensioni desktop max leggermente inferiori (es. 1200px) per risparmiare ulteriore banda
        max_desk = 1200 if "card" in dest_desktop_name else 1920
        process_image(src_path, dest_desktop, dest_mobile, max_desktop=max_desk)

if __name__ == "__main__":
    main()
