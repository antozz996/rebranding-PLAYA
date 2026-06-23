import os

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
        continue
    
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Change the background of dark-theme to ottanio
    new_content = content.replace(
        '.content-section.dark-theme { background: var(--damai-green); color: var(--white); }',
        '.content-section.dark-theme { background: #124e54; color: var(--white); }'
    )
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(new_content)
