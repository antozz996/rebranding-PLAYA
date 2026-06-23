import os
import re

base_dir = r"c:\Users\virgi\Desktop\REBRANDING PLAYA\frontend"

def move_sections(lang):
    if lang == "it":
        home_path = os.path.join(base_dir, "damai.html")
        eventi_path = os.path.join(base_dir, "damai-eventi.html")
    else:
        home_path = os.path.join(base_dir, "en", "damai.html")
        eventi_path = os.path.join(base_dir, "en", "damai-eventi.html")
        
    with open(home_path, "r", encoding="utf-8") as f:
        home_html = f.read()
        
    # Extract the two sections from Home
    # Starts at <!-- EVENTS DETAILS GRID -->
    # Ends after the second </section> before </main>
    # We will just use regex to match both sections together
    match = re.search(r'(<!-- EVENTS DETAILS GRID -->.*?</section>\s*<!-- EXPERIENCES [^\n]*SECTION -->.*?</section>)', home_html, re.DOTALL)
    if not match:
        print(f"Could not find sections in {home_path}")
        return
        
    sections_html = match.group(1)
    
    # Remove from home_html
    new_home_html = home_html.replace(sections_html, '')
    
    # Now insert into eventi_path
    with open(eventi_path, "r", encoding="utf-8") as f:
        eventi_html = f.read()
        
    # In eventi_path, we want to replace the current events-section
    # It starts with <section class="events-section reveal" ... Scegli il tuo Evento ... </section>
    # Let's find it.
    old_events_match = re.search(r'(<section class="events-section[^>]*>.*?Le Nostre Proposte.*?</section>)', eventi_html, re.DOTALL)
    if not old_events_match:
        old_events_match = re.search(r'(<section class="events-section[^>]*>.*?Our Proposals.*?</section>)', eventi_html, re.DOTALL)
        
    if old_events_match:
        # Replace the old section with the two new sections
        new_eventi_html = eventi_html.replace(old_events_match.group(1), sections_html)
    else:
        print(f"Could not find old events section to replace in {eventi_path}")
        # Append before </main>
        new_eventi_html = eventi_html.replace('</main>', sections_html + '\n</main>')
        
    # Save the files
    with open(home_path, "w", encoding="utf-8") as f:
        f.write(new_home_html)
    with open(eventi_path, "w", encoding="utf-8") as f:
        f.write(new_eventi_html)
        
    print(f"Successfully moved sections for {lang}")

move_sections("it")
move_sections("en")
