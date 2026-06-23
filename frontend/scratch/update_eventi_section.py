import os
import re

base_dir = r"c:\Users\virgi\Desktop\REBRANDING PLAYA\frontend"

def process_file(filepath, is_en=False):
    if not os.path.exists(filepath):
        print(f"Not found: {filepath}")
        return

    with open(filepath, "r", encoding="utf-8") as f:
        html = f.read()

    # 1. Replace hero image with video 3.mp4
    img_src = "../assets/images/damai-boho-tables.webp" if is_en else "assets/images/damai-boho-tables.webp"
    vid_src = "../assets/images/3.mp4" if is_en else "assets/images/3.mp4"
    
    # We look for <img src="..." class="hero-bg" ...>
    hero_pattern = re.compile(rf'<img[^>]*src="[^"]*damai-boho-tables\.webp"[^>]*>', re.IGNORECASE)
    
    html = hero_pattern.sub(f'<video src="{vid_src}" autoplay muted loop playsinline class="hero-bg" style="object-fit: cover; opacity: 0.6;"></video>', html)

    # 2. Update events-section background and remove video/gradient
    # The section starts with <section class="events-section...
    section_pattern = re.compile(
        r'<section class="events-section[^>]*style="position: relative; overflow: hidden; background: transparent; padding: 8rem var\(--slide-padding\);"[^>]*>.*?<video id="eventsVideo"[^>]*>.*?</video>.*?<div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient[^>]*>.*?</div>.*?<div style="position: relative; z-index: 3;">', 
        re.DOTALL
    )
    html = section_pattern.sub('<section class="events-section reveal visible" style="background-color: #124e54; padding: 8rem var(--slide-padding);">\n<div>', html)
    
    # Also fix the </div> closing tag that matched the removed <div style="position: relative; z-index: 3;">.
    # Wait, the structure was:
    # <section>
    #   <video>
    #   <gradient>
    #   <div relative>
    #       <header>
    #       <grid>
    #   </div>
    # </section>
    # Since I'm replacing <video>, <gradient> and <div relative> with just <div>, the closing </div> structure remains correct!
    
    # 3. Update the section header text colors
    header_pattern = re.compile(r'<div class="events-header">\s*<span[^>]*>(.*?)</span>\s*<h2[^>]*>(.*?)</h2>', re.DOTALL | re.IGNORECASE)
    
    def header_repl(match):
        span_text = match.group(1)
        h2_text = match.group(2)
        # We only want to apply this to the first events-header inside the ottanio section
        # We know it's "Allestimenti Personalizzati" or "Tailored Sceneries"
        if "Allestimenti" in span_text or "Tailored" in span_text:
            return f'<div class="events-header">\n<span style="color: var(--gold);">{span_text}</span>\n<h2 style="color: var(--white);">{h2_text}</h2>'
        return match.group(0)

    html = header_pattern.sub(header_repl, html)

    # 4. Update the event cards to have solid white background
    card_pattern = re.compile(r'<div class="event-card"[^>]*rgba\(255, 255, 255, 0\.82\)[^>]*>')
    html = card_pattern.sub('<div class="event-card" style="background: var(--white); border-radius: 12px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);">', html)

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"Updated {filepath}")


process_file(os.path.join(base_dir, "damai-eventi.html"), is_en=False)
process_file(os.path.join(base_dir, "en", "damai-eventi.html"), is_en=True)
