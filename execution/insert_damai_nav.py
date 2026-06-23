import os
import re

def update_page(file_path):
    print(f"Checking: {file_path}")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    is_modified = False
    
    # 1. Update Desktop Navbar (nav-left)
    # Check if damai link is already there
    if "damai.html" not in content:
        # Check if it has a <ul class="nav-left">
        if '<ul class="nav-left">' in content:
            # We insert the Damai link as the first item in the ul
            target = '<ul class="nav-left">'
            # Determine if it's English page to match formatting
            if "en/" in file_path.replace("\\", "/"):
                link_to_insert = '\n            <li><a href="damai.html" class="nav-link">Damai</a></li>'
            else:
                link_to_insert = '\n<li><a class="nav-link" href="damai.html">Damai</a></li>'
                
            content = content.replace(target, target + link_to_insert)
            print(" -> Inserted Damai in desktop navbar")
            is_modified = True
            
        # 2. Update Mobile Menu (mobile-nav-links)
        if '<ul class="mobile-nav-links">' in content:
            target = '<ul class="mobile-nav-links">'
            if "en/" in file_path.replace("\\", "/"):
                link_to_insert = '\n            <li><a href="damai.html">Damai</a></li>'
            else:
                link_to_insert = '\n<li><a href="damai.html">Damai</a></li>'
                
            content = content.replace(target, target + link_to_insert)
            print(" -> Inserted Damai in mobile overlay menu")
            is_modified = True
            
    else:
        print(" -> Damai link already present or page is damai.html itself")
        
    if is_modified:
        # Create a backup
        backup_path = file_path + ".bak.nav"
        with open(backup_path, "w", encoding="utf-8") as f:
            f.write(content) # Write backup
            
        # Write modified content back to the original file
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f" -> SAVED: {file_path}")
        
    return is_modified

def main():
    frontend_dir = r"c:\Users\virgi\Desktop\REBRANDING PLAYA\frontend"
    
    modified_count = 0
    for root, dirs, files in os.walk(frontend_dir):
        # Skip backups, scratch, template files, etc.
        if any(ignored in root for ignored in ["backups", "scratch", ".git"]):
            continue
            
        for file in files:
            if file.lower().endswith(".html"):
                # Skip damai.html itself as we manually created it with the correct navbar
                if file.lower() == "damai.html":
                    continue
                file_path = os.path.join(root, file)
                if update_page(file_path):
                    modified_count += 1
                    
    print(f"\nNavbar update complete! Modified {modified_count} pages.")

if __name__ == "__main__":
    main()
