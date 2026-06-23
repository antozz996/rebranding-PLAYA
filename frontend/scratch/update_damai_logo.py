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

    # 1. Replace logo source
    content = content.replace('src="assets/logos/logo-playaluna.webp"', 'src="assets/logos/logo-damai.webp"')
    content = content.replace('src="../assets/logos/logo-playaluna.webp"', 'src="../assets/logos/logo-damai.webp"')
    
    # 2. Update CSS sizes for .logo to make it "bello grande"
    # Search for: .logo { height: 160px; width: auto; transition: 0.5s; filter: brightness(0) invert(1); }
    content = re.sub(
        r'\.logo\s*\{\s*height:\s*160px;',
        r'.logo { height: 240px;',
        content
    )
    
    # Search for: .navbar.scrolled .logo { height: 110px; filter: none; }
    content = re.sub(
        r'\.navbar\.scrolled\s*\.logo\s*\{\s*height:\s*110px;',
        r'.navbar.scrolled .logo { height: 160px;',
        content
    )
    
    # Update mobile logo sizes
    content = re.sub(
        r'\.navbar\s*\.logo\s*\{\s*height:\s*90px\s*!important;',
        r'.navbar .logo { height: 120px !important;',
        content
    )

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
        
    print(f"Updated {filepath}")
