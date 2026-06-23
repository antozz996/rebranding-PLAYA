import instaloader
import os
import shutil
from datetime import datetime

def scrape_ig(profile_name, target_folder, prefix, count=15):
    L = instaloader.Instaloader(
        download_videos=False, 
        download_video_thumbnails=False,
        download_geotags=False, 
        download_comments=False,
        save_metadata=False, 
        compress_json=False
    )
    
    print(f"Inizio download da: {profile_name}...")
    
    try:
        profile = instaloader.Profile.from_username(L.context, profile_name)
        
        # Crea cartella temporanea per instaloader
        tmp_dir = f"temp_{profile_name}"
        if not os.path.exists(tmp_dir):
            os.makedirs(tmp_dir)
            
        i = 1
        for post in profile.get_posts():
            if i > count:
                break
            
            if not post.is_video:
                # Download post
                L.download_post(post, target=tmp_dir)
                
                # Trova il file scaricato (instaloader salva con timestamp)
                files = [f for f in os.listdir(tmp_dir) if f.endswith('.jpg')]
                # Prendi l'ultimo file scaricato (quello del post corrente)
                files.sort(key=lambda x: os.path.getmtime(os.path.join(tmp_dir, x)), reverse=True)
                
                if files:
                    src = os.path.join(tmp_dir, files[0])
                    dest = os.path.join(target_folder, f"{prefix}-{i}.jpg")
                    shutil.copy(src, dest)
                    print(f"Salvato: {dest}")
                    i += 1
        
        # Pulisci
        shutil.rmtree(tmp_dir)
        print(f"Completato {profile_name}!")
        
    except Exception as e:
        print(f"Errore durante lo scraping di {profile_name}: {e}")

if __name__ == "__main__":
    social_dir = "frontend/assets/images/social"
    if not os.path.exists(social_dir):
        os.makedirs(social_dir)
        
    # Scrape Lido Playa Luna (main profile) - 8 posts
    scrape_ig("lidoplayaluna", social_dir, "lido", count=8)
    
    # Scrape Playa Luna Eventi - 15 posts
    scrape_ig("playalunaeventi", social_dir, "eventi", count=15)
