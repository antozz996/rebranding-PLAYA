import os
import re
import shutil
import subprocess
from datetime import datetime
from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from bs4 import BeautifulSoup

app = FastAPI(title="Playa Luna Rebranding Visual Editor")

# Absolute path calculations based on script location
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.abspath(os.path.join(BACKEND_DIR, "..", ".."))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
EDITOR_FRONTEND_DIR = os.path.join(BASE_DIR, "editor", "frontend")
BACKUPS_DIR = os.path.join(FRONTEND_DIR, "backups")

# Create folders if not existing
os.makedirs(EDITOR_FRONTEND_DIR, exist_ok=True)
os.makedirs(BACKUPS_DIR, exist_ok=True)

# Run optimization scripts in the background
def run_optimizations():
    print("Starting background asset optimizations...")
    try:
        opt_script = os.path.join(BASE_DIR, "execution", "optimize_images.py")
        opt_mobile_script = os.path.join(BASE_DIR, "execution", "optimize_images_mobile.py")
        update_webp_script = os.path.join(BASE_DIR, "execution", "update_html_webp.py")
        
        if os.path.exists(opt_script):
            subprocess.run(["python", opt_script], cwd=BASE_DIR, check=True)
        if os.path.exists(opt_mobile_script):
            subprocess.run(["python", opt_mobile_script], cwd=BASE_DIR, check=True)
        if os.path.exists(update_webp_script):
            subprocess.run(["python", update_webp_script], cwd=BASE_DIR, check=True)
        print("Background asset optimizations completed successfully.")
    except Exception as e:
        print(f"Error running background optimizations: {e}")

class SavePayload(BaseModel):
    html: str

@app.get("/")
def read_root():
    return RedirectResponse(url="/editor/index.html")

# Get list of editable HTML pages (including English pages in en/)
@app.get("/api/pages")
def list_pages():
    try:
        html_files = []
        for root, dirs, files in os.walk(FRONTEND_DIR):
            # Skip backups and any other ignored dirs
            if any(ignored in root for ignored in ["backups", ".vercel", ".git", "scratch"]):
                continue
            for file in files:
                if file.lower().endswith(".html"):
                    # Get relative path from FRONTEND_DIR
                    rel_path = os.path.relpath(os.path.join(root, file), FRONTEND_DIR)
                    # Use forward slashes
                    rel_path = rel_path.replace("\\", "/")
                    html_files.append(rel_path)
        
        # Sort files: root index.html first, then other root files, then subdirectories
        root_files = [f for f in html_files if "/" not in f]
        sub_files = [f for f in html_files if "/" in f]
        
        if "index.html" in root_files:
            root_files.remove("index.html")
            root_files = ["index.html"] + sorted(root_files)
        else:
            root_files = sorted(root_files)
            
        return root_files + sorted(sub_files)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Load a page and inject base tag + editor helper script
@app.get("/preview/{name:path}", response_class=HTMLResponse)
def get_preview(name: str):
    file_path = os.path.join(FRONTEND_DIR, name)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Page not found")
        
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            html_content = f.read()
            
        soup = BeautifulSoup(html_content, "html.parser")
        
        # Calculate base href dynamically depending on page directory
        dir_name = os.path.dirname(name)
        base_href = "/site/"
        if dir_name:
            base_href += dir_name.replace("\\", "/").strip("/") + "/"
            
        # Inject <base href="..."> to resolve relative paths (CSS, images, etc.)
        if soup.head:
            # Check if base tag already exists, remove it
            for b in soup.find_all("base"):
                b.decompose()
            base_tag = soup.new_tag("base", href=base_href)
            soup.head.insert(0, base_tag)
            
        # Inject our editor helper script at the end of the body
        if soup.body:
            # Check if script already exists, remove it
            for s in soup.find_all("script", src="/editor/editor_helper.js"):
                s.decompose()
            helper_script = soup.new_tag("script", src="/editor/editor_helper.js")
            soup.body.append(helper_script)
            
        return str(soup)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Save edited HTML
@app.post("/api/pages/{name:path}")
def save_page(name: str, payload: SavePayload, background_tasks: BackgroundTasks):
    file_path = os.path.join(FRONTEND_DIR, name)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Page not found")
        
    try:
        # 1. Create a backup of the current file
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        # Replace slashes in filename to prevent directory copy errors
        safe_name = name.replace("/", "_").replace("\\", "_")
        backup_name = f"{timestamp}-{safe_name}.bak.html"
        backup_path = os.path.join(BACKUPS_DIR, backup_name)
        shutil.copy2(file_path, backup_path)
        
        # 2. Clean up the received HTML content
        clean_html = payload.html
        
        # Use regex to strip the injected tags just to be completely safe
        # Remove <base href="/site/..."> or <base href="/site/..."/>
        clean_html = re.sub(r'<base\s+href=["\']/site/[^"\']*["\']\s*/?>', '', clean_html, flags=re.IGNORECASE)
        # Remove <script src="/editor/editor_helper.js"></script>
        clean_html = re.sub(r'<script\s+src=["\']/editor/editor_helper.js["\']\s*></script>', '', clean_html, flags=re.IGNORECASE)
        # Remove any stray contenteditable attributes
        clean_html = clean_html.replace(' contenteditable="true"', '')
        clean_html = clean_html.replace(' contenteditable="false"', '')
        clean_html = clean_html.replace(' data-editor-selected="true"', '')
        
        # Parse and pretty-format to keep structure clean
        soup = BeautifulSoup(clean_html, "html.parser")
        
        # 3. Write back to frontend file
        with open(file_path, "w", encoding="utf-8") as f:
            html_out = str(soup)
            # Prepend doctype if it is not present in BeautifulSoup's output
            if not html_out.strip().lower().startswith("<!doctype"):
                f.write("<!DOCTYPE html>\n")
            f.write(html_out)
            
        # 4. Trigger optimizations in background
        background_tasks.add_task(run_optimizations)
            
        return {
            "status": "success", 
            "message": f"Pagina '{name}' salvata con successo.",
            "backup": backup_name
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Upload Image API
@app.post("/api/upload/image")
def upload_image(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    images_dir = os.path.join(FRONTEND_DIR, "assets", "images")
    os.makedirs(images_dir, exist_ok=True)
    
    filename = file.filename
    # Clean filename
    filename = re.sub(r'[^a-zA-Z0-9_.-]', '', filename.replace(' ', '_'))
    dest_path = os.path.join(images_dir, filename)
    
    try:
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Run image optimization script in background
        background_tasks.add_task(run_optimizations)
        
        # Return webp path since the optimizer will convert it
        name, _ = os.path.splitext(filename)
        webp_url = f"assets/images/{name}.webp"
        
        return {
            "status": "success",
            "url": webp_url,
            "original_filename": filename
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Upload Video API
@app.post("/api/upload/video")
def upload_video(file: UploadFile = File(...)):
    videos_dir = os.path.join(FRONTEND_DIR, "assets", "videos")
    os.makedirs(videos_dir, exist_ok=True)
    
    filename = file.filename
    # Clean filename
    filename = re.sub(r'[^a-zA-Z0-9_.-]', '', filename.replace(' ', '_'))
    dest_path = os.path.join(videos_dir, filename)
    
    try:
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return {
            "status": "success",
            "url": f"assets/videos/{filename}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Mount Editor frontend under /editor
app.mount("/editor", StaticFiles(directory=EDITOR_FRONTEND_DIR), name="editor")

# Mount static site under /site
app.mount("/site", StaticFiles(directory=FRONTEND_DIR), name="site")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
