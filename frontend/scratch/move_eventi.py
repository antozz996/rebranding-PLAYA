import os
import re

files = [
    "c:/Users/virgi/Desktop/REBRANDING PLAYA/frontend/damai.html",
    "c:/Users/virgi/Desktop/REBRANDING PLAYA/frontend/damai-eventi.html",
    "c:/Users/virgi/Desktop/REBRANDING PLAYA/frontend/damai-contatti.html",
    "c:/Users/virgi/Desktop/REBRANDING PLAYA/frontend/en/damai.html",
    "c:/Users/virgi/Desktop/REBRANDING PLAYA/frontend/en/damai-eventi.html",
    "c:/Users/virgi/Desktop/REBRANDING PLAYA/frontend/en/damai-contatti.html"
]

for filepath in files:
    if not os.path.exists(filepath):
        print(f"Not found: {filepath}")
        continue
    
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Extract the Eventi / Events link from nav-left
    eventi_match = re.search(r'<li><a class="nav-link" href="damai-eventi.html"[^>]*>(?:Eventi|Events)</a></li>', content)
    if not eventi_match:
        print(f"Eventi link not found in {filepath}")
        continue
        
    eventi_html = eventi_match.group(0)
    
    # Remove it from nav-left
    content = content.replace(eventi_html, '')
    # Clean up empty lines in nav-left
    content = re.sub(r'<ul class="nav-left">\s*<li><a class="nav-link" href="(../)?damai.html">Home</a></li>\s*</ul>', r'<ul class="nav-left">\n            <li><a class="nav-link" href="\1damai.html">Home</a></li>\n        </ul>', content)
    
    # Insert it into nav-right before Contatti / Contact
    # Match Contatti link
    contatti_match = re.search(r'<li><a class="nav-link" href="damai-contatti.html"[^>]*>(?:Contatti|Contact)</a></li>', content)
    if contatti_match:
        contatti_html = contatti_match.group(0)
        # Replace the contatti HTML with eventi + contatti
        content = content.replace(contatti_html, f'{eventi_html}\n            {contatti_html}')
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
        
    print(f"Updated {filepath}")
