import glob
import os

# Process files in 'en/' directory
for f in glob.glob('en/*.html'):
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # 1. Update language switcher
    content = content.replace('<a href="#" class="active">IT</a> | <a href="#">EN</a>', 
                              '<a href="../index.html">IT</a> | <a href="#" class="active">EN</a>')
    
    # 2. Update asset paths
    content = content.replace('href="assets/', 'href="../assets/')
    content = content.replace('src="assets/', 'src="../assets/')
    
    # 3. Update internal links
    content = content.replace('href="index.html"', 'href="index.html"') # stays within en folder
    content = content.replace('href="beach.html"', 'href="beach.html"')
    content = content.replace('href="ristorante.html"', 'href="ristorante.html"')
    content = content.replace('href="eventi.html"', 'href="eventi.html"')
    content = content.replace('href="contatti.html"', 'href="contatti.html"')
    content = content.replace('href="network.html"', 'href="network.html"')

    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)

print("EN files updated.")
