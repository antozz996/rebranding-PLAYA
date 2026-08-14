import os
import re
import shutil
import subprocess
from datetime import datetime

from bs4 import BeautifulSoup
from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

app = FastAPI(title="Playa Luna Rebranding Visual Editor")

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.abspath(os.path.join(BACKEND_DIR, "..", ".."))
FRONTEND_DIR = os.path.realpath(os.path.join(BASE_DIR, "frontend"))
EDITOR_FRONTEND_DIR = os.path.realpath(os.path.join(BASE_DIR, "editor", "frontend"))
BACKUPS_DIR = os.path.realpath(os.path.join(FRONTEND_DIR, "backups"))

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov"}
MAX_IMAGE_BYTES = 25 * 1024 * 1024
MAX_VIDEO_BYTES = 100 * 1024 * 1024
UPLOAD_CHUNK_BYTES = 1024 * 1024

os.makedirs(EDITOR_FRONTEND_DIR, exist_ok=True)
os.makedirs(BACKUPS_DIR, exist_ok=True)


def resolve_frontend_path(relative_path: str, *, html_only: bool = False) -> str:
    clean_path = str(relative_path or "").replace("\\", "/").lstrip("/")
    candidate = os.path.realpath(os.path.join(FRONTEND_DIR, clean_path))

    try:
        inside_frontend = os.path.commonpath([FRONTEND_DIR, candidate]) == FRONTEND_DIR
    except ValueError:
        inside_frontend = False

    if not inside_frontend:
        raise HTTPException(status_code=400, detail="Invalid frontend path")

    if html_only and os.path.splitext(candidate)[1].lower() != ".html":
        raise HTTPException(status_code=400, detail="Only HTML pages can be edited")

    return candidate


def sanitize_upload_name(filename: str, allowed_extensions: set[str]) -> str:
    clean_name = re.sub(r"[^a-zA-Z0-9_.-]", "", str(filename or "").replace(" ", "_"))
    extension = os.path.splitext(clean_name)[1].lower()
    if not clean_name or clean_name in {".", ".."} or extension not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Unsupported file type")
    return clean_name


def save_upload_limited(upload: UploadFile, destination: str, max_bytes: int) -> None:
    written = 0
    try:
        with open(destination, "wb") as output:
            while True:
                chunk = upload.file.read(UPLOAD_CHUNK_BYTES)
                if not chunk:
                    break
                written += len(chunk)
                if written > max_bytes:
                    raise HTTPException(status_code=413, detail="Uploaded file is too large")
                output.write(chunk)
    except Exception:
        if os.path.exists(destination):
            os.remove(destination)
        raise


def run_optimizations() -> None:
    if os.environ.get("EDITOR_DISABLE_OPTIMIZATIONS") == "1":
        return

    print("Starting background asset optimizations...")
    try:
        scripts = [
            os.path.join(BASE_DIR, "execution", "optimize_images.py"),
            os.path.join(BASE_DIR, "execution", "optimize_images_mobile.py"),
            os.path.join(BASE_DIR, "execution", "update_html_webp.py"),
        ]
        for script in scripts:
            if os.path.exists(script):
                subprocess.run(["python", script], cwd=BASE_DIR, check=True)
        print("Background asset optimizations completed successfully.")
    except Exception as error:
        print(f"Error running background optimizations: {error}")


class SavePayload(BaseModel):
    html: str


@app.get("/")
def read_root():
    return RedirectResponse(url="/editor/index.html")


@app.get("/api/pages")
def list_pages():
    try:
        html_files = []
        ignored = {"backups", ".vercel", ".git", "scratch"}
        for root, dirs, files in os.walk(FRONTEND_DIR):
            dirs[:] = [directory for directory in dirs if directory not in ignored]
            for filename in files:
                if filename.lower().endswith(".html"):
                    relative = os.path.relpath(os.path.join(root, filename), FRONTEND_DIR)
                    html_files.append(relative.replace("\\", "/"))

        root_files = sorted(page for page in html_files if "/" not in page)
        sub_files = sorted(page for page in html_files if "/" in page)
        if "index.html" in root_files:
            root_files.remove("index.html")
            root_files.insert(0, "index.html")
        return root_files + sub_files
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error


@app.get("/preview/{name:path}", response_class=HTMLResponse)
def get_preview(name: str):
    file_path = resolve_frontend_path(name, html_only=True)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="Page not found")

    try:
        with open(file_path, "r", encoding="utf-8") as source:
            soup = BeautifulSoup(source.read(), "html.parser")

        directory = os.path.dirname(str(name or "")).replace("\\", "/").strip("/")
        base_href = "/site/" + (directory + "/" if directory else "")

        if soup.head:
            for tag in soup.find_all("base"):
                tag.decompose()
            soup.head.insert(0, soup.new_tag("base", href=base_href))

        if soup.body:
            for script in soup.find_all("script", src="/editor/editor_helper.js"):
                script.decompose()
            soup.body.append(soup.new_tag("script", src="/editor/editor_helper.js"))

        return str(soup)
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error


@app.post("/api/pages/{name:path}")
def save_page(name: str, payload: SavePayload, background_tasks: BackgroundTasks):
    file_path = resolve_frontend_path(name, html_only=True)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="Page not found")

    try:
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        safe_name = str(name).replace("/", "_").replace("\\", "_")
        backup_name = f"{timestamp}-{safe_name}.bak.html"
        shutil.copy2(file_path, os.path.join(BACKUPS_DIR, backup_name))

        clean_html = re.sub(
            r'<base\s+href=["\']/site/[^"\']*["\']\s*/?>',
            "",
            payload.html,
            flags=re.IGNORECASE,
        )
        clean_html = re.sub(
            r'<script\s+src=["\']/editor/editor_helper.js["\']\s*></script>',
            "",
            clean_html,
            flags=re.IGNORECASE,
        )
        clean_html = clean_html.replace(' contenteditable="true"', "")
        clean_html = clean_html.replace(' contenteditable="false"', "")
        clean_html = clean_html.replace(' data-editor-selected="true"', "")

        html_output = str(BeautifulSoup(clean_html, "html.parser"))
        with open(file_path, "w", encoding="utf-8") as destination:
            if not html_output.strip().lower().startswith("<!doctype"):
                destination.write("<!DOCTYPE html>\n")
            destination.write(html_output)

        background_tasks.add_task(run_optimizations)
        return {
            "status": "success",
            "message": f"Pagina '{name}' salvata con successo.",
            "backup": backup_name,
        }
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error


@app.post("/api/upload/image")
def upload_image(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    filename = sanitize_upload_name(file.filename, IMAGE_EXTENSIONS)
    images_dir = resolve_frontend_path("assets/images")
    os.makedirs(images_dir, exist_ok=True)
    destination = os.path.realpath(os.path.join(images_dir, filename))
    if os.path.commonpath([images_dir, destination]) != images_dir:
        raise HTTPException(status_code=400, detail="Invalid upload path")

    save_upload_limited(file, destination, MAX_IMAGE_BYTES)
    background_tasks.add_task(run_optimizations)
    name, _ = os.path.splitext(filename)
    return {
        "status": "success",
        "url": f"assets/images/{name}.webp",
        "original_filename": filename,
    }


@app.post("/api/upload/video")
def upload_video(file: UploadFile = File(...)):
    filename = sanitize_upload_name(file.filename, VIDEO_EXTENSIONS)
    videos_dir = resolve_frontend_path("assets/videos")
    os.makedirs(videos_dir, exist_ok=True)
    destination = os.path.realpath(os.path.join(videos_dir, filename))
    if os.path.commonpath([videos_dir, destination]) != videos_dir:
        raise HTTPException(status_code=400, detail="Invalid upload path")

    save_upload_limited(file, destination, MAX_VIDEO_BYTES)
    return {"status": "success", "url": f"assets/videos/{filename}"}


app.mount("/editor", StaticFiles(directory=EDITOR_FRONTEND_DIR), name="editor")
app.mount("/site", StaticFiles(directory=FRONTEND_DIR), name="site")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
