import urllib.request
import sys

def fetch_page():
    url = "https://www.instagram.com/damai_eventgarden/"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
    }
    
    print(f"Fetching {url}")
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as response:
            html = response.read().decode('utf-8')
            
        with open("frontend/scratch/ig_page.html", "w", encoding="utf-8") as f:
            f.write(html)
        print("Page fetched successfully and saved to frontend/scratch/ig_page.html")
        
        # Print first 500 chars and title if found
        import re
        title = re.search(r'<title>(.*?)</title>', html)
        if title:
            print(f"Title: {title.group(1)}")
        else:
            print("No title found.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fetch_page()
