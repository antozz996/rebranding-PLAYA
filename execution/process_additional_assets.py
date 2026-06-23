import os
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
    
    os.makedirs(img_dest_dir, exist_ok=True)
    
    mappings = {
        "1111.jpg": ("ristorante-terrazza-giorno.webp", "mobile-ristorante-terrazza-giorno.webp", 1920),
        "2F8A0050.jpg": ("piatto-pasta.webp", "mobile-piatto-pasta.webp", 1200),
        "2F8A0242.jpg": ("bartender.webp", "mobile-bartender.webp", 1200),
        "2F8A0710.jpg": ("playground-children.webp", "mobile-playground-children.webp", 1200),
        "2F8A3350.jpg": ("piatto-crudo.webp", "mobile-piatto-crudo.webp", 1200),
        "2F8A3359.jpg": ("lido-panoramica.webp", "mobile-lido-panoramica.webp", 1920),
    }
    
    print("Inizio elaborazione delle immagini addizionali...")
    for src_name, (dest_desk_name, dest_mob_name, max_desk) in mappings.items():
        src_path = os.path.join(src_dir, src_name)
        dest_desk = os.path.join(img_dest_dir, dest_desk_name)
        dest_mob = os.path.join(img_dest_dir, dest_mob_name)
        process_image(src_path, dest_desk, dest_mob, max_desktop=max_desk)
        
    print("\nElaborazione completata!")

if __name__ == "__main__":
    main()
