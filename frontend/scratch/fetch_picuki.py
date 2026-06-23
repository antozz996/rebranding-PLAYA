import urllib.request
import re
import os

def fetch_picuki_photos(username):
    url = f"https://www.picuki.com/profile/{username}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    }
    
    print(f"Fetching from Picuki: {url}")
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as response:
            html = response.read().decode('utf-8')
            
        print("HTML loaded. Searching for image links...")
        
        # Look for images on Picuki: they are usually in the src or data-src of post images
        # Picuki posts have images with class like "post-image" or similar
        # Let's extract all jpg URLs
        img_urls = re.findall(r'https?://[^"\']+\.jpg', html)
        # Filter for instagram CDN or picuki CDN links that represent posts
        # Picuki uses CDN links like scontent.cdninstagram.com or similar
        filtered_urls = []
        for img_url in img_urls:
            if "scontent" in img_url or "instagram" in img_url or "picuki" in img_url:
                if img_url not in filtered_urls:
                    filtered_urls.append(img_url)
                    
        print(f"Found {len(filtered_urls)} candidate image URLs.")
        for idx, img_url in enumerate(filtered_urls[:10]):
            print(f"{idx+1}: {img_url}")
            
        return filtered_urls
        
    except Exception as e:
        print(f"Error fetching from Picuki: {e}")
        return []

if __name__ == "__main__":
    fetch_picuki_photos("damai_eventgarden")
