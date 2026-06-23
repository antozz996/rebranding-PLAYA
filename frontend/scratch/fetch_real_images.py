import urllib.request
import re
import os
import sys

def download_real_damai_photos():
    # Search query for the actual venue
    query = "Damai+Exclusive+Garden+Varcaturo"
    url = f"https://www.google.com/search?q={query}&tbm=isch"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    }
    
    print(f"Searching Google Images for: {query}")
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as response:
            html = response.read().decode('utf-8')
            
        print("Search results loaded. Parsing image URLs...")
        
        # Google Images has image URLs inside the HTML. We look for patterns like:
        # ["https://...", width, height] or simply absolute URLs in img tags
        # Let's extract URLs of actual images
        # The actual high-res URLs are often in data-src or inside json-like scripts
        urls = re.findall(r'https?://[^"\']+\.(?:jpg|jpeg|png)', html)
        
        # Filter for relevant images (excluding icons, search layout images, Google logo etc.)
        filtered = []
        for u in urls:
            if "google" not in u and "gstatic" not in u and "icon" not in u:
                if u not in filtered:
                    filtered.append(u)
                    
        print(f"Found {len(filtered)} potential venue images.")
        
        # Destination directory
        dest_dir = r"c:\Users\virgi\Desktop\REBRANDING PLAYA\frontend\assets\images"
        os.makedirs(dest_dir, exist_ok=True)
        
        # Download top 4 images
        downloaded = 0
        names = ["hero-damai-real", "damai-pool-real", "damai-details-real", "damai-dining-real"]
        
        for u in filtered:
            if downloaded >= len(names):
                break
                
            try:
                dest_name = f"{names[downloaded]}.jpg"
                dest_path = os.path.join(dest_dir, dest_name)
                print(f"Downloading image {downloaded+1}: {u} -> {dest_path}")
                
                # Fetch image data with headers to avoid user-agent blocks
                img_req = urllib.request.Request(u, headers=headers)
                with urllib.request.urlopen(img_req) as img_resp:
                    with open(dest_path, "wb") as f:
                        f.write(img_resp.read())
                        
                print(f"Successfully downloaded: {dest_name}")
                downloaded += 1
            except Exception as e:
                print(f"Failed to download image {u}: {e}")
                
        print(f"\nDownload process complete. Downloaded {downloaded} real images.")
        
    except Exception as e:
        print(f"Error scraping Google Images: {e}")

if __name__ == "__main__":
    download_real_damai_photos()
