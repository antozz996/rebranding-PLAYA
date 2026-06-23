import os
import re

base_dir = r"c:\Users\virgi\Desktop\REBRANDING PLAYA\frontend"

def apply_glassmorphism(filepath):
    if not os.path.exists(filepath):
        return

    with open(filepath, "r", encoding="utf-8") as f:
        html = f.read()

    # Find the cards in the "Celebra i Tuoi Momenti" section.
    # The section starts with: <section class="events-section reveal visible" style="background-color: #124e54; padding: 8rem var(--slide-padding);">
    # We will just replace the card styles directly.
    # Currently: <div class="event-card" style="background: var(--white); border-radius: 12px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);">
    card_pattern = re.compile(r'<div class="event-card" style="background: var\(--white\); border-radius: 12px; box-shadow: 0 10px 30px rgba\(0, 0, 0, 0\.2\);">')
    new_card_style = '<div class="event-card" style="background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 12px; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);">'
    html = card_pattern.sub(new_card_style, html)

    # Now update the text colors inside these cards from var(--damai-green) to var(--gold)
    # and var(--text-light) to rgba(255,255,255,0.75).
    # Since these are the only cards that were modified this way in this section, we can match their h3 and p.
    # Wait, the h3 has: <h3 class="" style="color: var(--damai-green); font-size: 1.8rem; margin-bottom: 1.2rem;">
    # Let's be safe and replace it specifically within the event-card-text block
    
    html = re.sub(
        r'<h3([^>]*)style="color: var\(--damai-green\);\s*(font-size: 1\.8rem;\s*margin-bottom: 1\.2rem;)"',
        r'<h3\1style="color: var(--gold); \2"',
        html
    )
    
    html = re.sub(
        r'<p([^>]*)style="color: var\(--text-light\);\s*(font-size: 1rem;\s*line-height: 1\.7;)"',
        r'<p\1style="color: rgba(255,255,255,0.85); \2"',
        html
    )

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"Updated {filepath}")

apply_glassmorphism(os.path.join(base_dir, "damai-eventi.html"))
apply_glassmorphism(os.path.join(base_dir, "en", "damai-eventi.html"))
