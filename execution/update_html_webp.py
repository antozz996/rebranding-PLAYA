import os
import re

def update_html_files(directory):
    print(f"Aggiornando i file HTML in: {directory}")
    # Regex to find image extensions in common HTML/CSS attributes
    # Examples: src="img.png", url('img.jpg'), srcset="img.jpeg 1x"
    img_ext_pattern = re.compile(r'\.(png|jpg|jpeg)(?=["\'\s)])', re.IGNORECASE)
    
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.lower().endswith('.html'):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    new_content = img_ext_pattern.sub('.webp', content)
                    
                    if new_content != content:
                        with open(file_path, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        print(f"Aggiornato: {file}")
                    else:
                        print(f"Nessuna modifica necessaria: {file}")
                except Exception as e:
                    print(f"Errore nell'aggiornamento di {file}: {e}")

if __name__ == "__main__":
    update_html_files("frontend")
