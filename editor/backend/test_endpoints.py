import os
import shutil
from datetime import datetime
from fastapi.testclient import TestClient
from main import app, FRONTEND_DIR, BACKUPS_DIR

client = TestClient(app)

def test_api():
    print("--- INIZIO TEST DI INTEGRAZIONE API ---")
    
    # 1. Crea file temporanei per i test
    test_root_path = os.path.join(FRONTEND_DIR, "test_page_temp.html")
    test_sub_dir = os.path.join(FRONTEND_DIR, "en")
    os.makedirs(test_sub_dir, exist_ok=True)
    test_sub_path = os.path.join(test_sub_dir, "test_page_temp.html")
    
    # Scrivi HTML iniziale con doctype
    initial_html = "<!DOCTYPE html>\n<html><head><title>Test Page</title></head><body><h1>Hello World</h1></body></html>"
    with open(test_root_path, "w", encoding="utf-8") as f:
        f.write(initial_html)
    with open(test_sub_path, "w", encoding="utf-8") as f:
        f.write(initial_html)
        
    try:
        # 2. Test GET /api/pages (scansione ricorsiva)
        print("\n[TEST] GET /api/pages")
        res = client.get("/api/pages")
        assert res.status_code == 200, f"Status code errato: {res.status_code}"
        pages = res.json()
        print(f"Pagine rilevate: {pages}")
        assert "test_page_temp.html" in pages, "test_page_temp.html non presente in root"
        assert "en/test_page_temp.html" in pages, "en/test_page_temp.html non presente in sotto-cartella"
        print("-> [OK] Scansione ricorsiva corretta.")

        # 3. Test GET /preview/test_page_temp.html (base href root)
        print("\n[TEST] GET /preview/test_page_temp.html (Root Page Preview)")
        res = client.get("/preview/test_page_temp.html")
        assert res.status_code == 200, f"Status code errato: {res.status_code}"
        html_out = res.text
        assert '<base href="/site/"/>' in html_out or '<base href="/site/">' in html_out, "Tag base non iniettato correttamente per root page"
        assert 'src="/editor/editor_helper.js"' in html_out, "Helper JS non iniettato"
        print("-> [OK] Preview root page corretta.")

        # 4. Test GET /preview/en/test_page_temp.html (base href subfolder)
        print("\n[TEST] GET /preview/en/test_page_temp.html (Subfolder Page Preview)")
        res = client.get("/preview/en/test_page_temp.html")
        assert res.status_code == 200, f"Status code errato: {res.status_code}"
        html_out = res.text
        assert '<base href="/site/en/"/>' in html_out or '<base href="/site/en/">' in html_out, "Tag base non iniettato dinamicamente per subfolder page"
        assert 'src="/editor/editor_helper.js"' in html_out, "Helper JS non iniettato"
        print("-> [OK] Preview subfolder page corretta (Risolto bug base tag!).")

        # 5. Test POST /api/pages/en/test_page_temp.html (Salvataggio, Doctype e Backup)
        print("\n[TEST] POST /api/pages/en/test_page_temp.html (Save and Doctype Restore)")
        edited_html_no_doctype = '<html><head><base href="/site/en/"><title>Test Modificato</title></head><body><h1>Hello World Modificato</h1><script src="/editor/editor_helper.js"></script></body></html>'
        
        # Effettua chiamata di salvataggio
        res = client.post("/api/pages/en/test_page_temp.html", json={"html": edited_html_no_doctype})
        assert res.status_code == 200, f"Status code errato in salvataggio: {res.status_code}"
        res_data = res.json()
        assert res_data["status"] == "success", "Salvataggio fallito"
        print(f"Risposta server: {res_data}")
        
        # Verifica che il backup sia stato creato correttamente nel percorso corretto
        backup_name = res_data["backup"]
        assert "en_test_page_temp.html" in backup_name, "Il nome del backup non è normalizzato ed ha mantenuto le barre"
        backup_path = os.path.join(BACKUPS_DIR, backup_name)
        assert os.path.exists(backup_path), f"File di backup non trovato a {backup_path}"
        print("-> [OK] Backup generato correttamente e senza creare cartelle inesistenti.")

        # Verifica che il file salvato contenga il DOCTYPE (che era stato omesso nel payload)
        with open(test_sub_path, "r", encoding="utf-8") as f:
            content_saved = f.read()
        
        assert content_saved.strip().lower().startswith("<!doctype html>"), "DOCTYPE non ripristinato"
        assert '<base href="/site/en/">' not in content_saved, "Il tag base temporaneo non è stato rimosso"
        assert 'editor_helper.js' not in content_saved, "Lo script helper non è stato rimosso"
        print("-> [OK] Doctype ripristinato con successo e tag iniettati rimossi.")

    finally:
        # Pulizia file temporanei di test
        print("\nPulizia file temporanei...")
        if os.path.exists(test_root_path):
            os.remove(test_root_path)
        if os.path.exists(test_sub_path):
            os.remove(test_sub_path)
        print("--- TEST COMPLETATI CON SUCCESSO ---")

if __name__ == "__main__":
    test_api()
