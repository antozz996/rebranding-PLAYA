import os
from PIL import Image

def process_hero_image():
    source_path = r"C:\Users\virgi\Desktop\REBRANDING PLAYA\Foto video sito Playa\hero pagina ristorante.jpg"
    dest_dir = r"c:\Users\virgi\Desktop\REBRANDING PLAYA\frontend\assets\images"
    
    desktop_dest = os.path.join(dest_dir, "hero-ristorante.webp")
    mobile_dest = os.path.join(dest_dir, "mobile-hero-ristorante.webp")
    
    print(f"Verifica dell'immagine sorgente: {source_path}")
    if not os.path.exists(source_path):
        print(f"ERRORE: L'immagine sorgente non esiste in {source_path}")
        return
        
    print(f"Cartella di destinazione: {dest_dir}")
    os.makedirs(dest_dir, exist_ok=True)
    
    try:
        # Apri l'immagine originale
        with Image.open(source_path) as img:
            orig_width, orig_height = img.size
            print(f"Dimensioni originali: {orig_width}x{orig_height}px")
            
            # --- 1. Genera Versione Desktop (Max 1920px) ---
            max_desktop_dim = 1920
            if orig_width > max_desktop_dim or orig_height > max_desktop_dim:
                if orig_width > orig_height:
                    new_width = max_desktop_dim
                    new_height = int((max_desktop_dim / orig_width) * orig_height)
                else:
                    new_height = max_desktop_dim
                    new_width = int((max_desktop_dim / orig_height) * orig_width)
            else:
                new_width, new_height = orig_width, orig_height
                
            print(f"Ridimensionamento Desktop a: {new_width}x{new_height}px")
            desktop_img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # Salva in formato WebP
            desktop_img.save(desktop_dest, "WEBP", quality=82, method=6)
            desktop_size = os.path.getsize(desktop_dest) / 1024
            print(f"Salvato: {desktop_dest} ({desktop_size:.2f} KB)")
            
            # --- 2. Genera Versione Mobile (Max 800px) ---
            max_mobile_dim = 800
            if orig_width > max_mobile_dim or orig_height > max_mobile_dim:
                if orig_width > orig_height:
                    new_width_m = max_mobile_dim
                    new_height_m = int((max_mobile_dim / orig_width) * orig_height)
                else:
                    new_height_m = max_mobile_dim
                    new_width_m = int((max_mobile_dim / orig_height) * orig_width)
            else:
                new_width_m, new_height_m = orig_width, orig_height
                
            print(f"Ridimensionamento Mobile a: {new_width_m}x{new_height_m}px")
            mobile_img = img.resize((new_width_m, new_height_m), Image.Resampling.LANCZOS)
            
            # Salva in formato WebP
            mobile_img.save(mobile_dest, "WEBP", quality=80, method=6)
            mobile_size = os.path.getsize(mobile_dest) / 1024
            print(f"Salvato: {mobile_dest} ({mobile_size:.2f} KB)")
            
            print("\nAggiornamento Hero completato con successo!")
            
    except Exception as e:
        print(f"Si è verificato un errore durante l'elaborazione dell'immagine: {e}")

if __name__ == "__main__":
    process_hero_image()
