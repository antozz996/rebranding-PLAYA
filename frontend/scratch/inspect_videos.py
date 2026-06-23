import subprocess
import json
import os

def inspect_video(path):
    cmd = ['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', path]
    try:
        # We inherit os.environ, which will have the correct PATH if set in PowerShell
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode != 0:
            print(f"ffprobe failed for {path} with code {res.returncode}. Stderr: {res.stderr}")
            return None
        info = json.loads(res.stdout)
        video_stream = None
        for stream in info.get('streams', []):
            if stream.get('codec_type') == 'video':
                video_stream = stream
                break
        if not video_stream:
            print(f"No video stream found in {path}")
            return None
        
        duration = float(info['format'].get('duration', 0))
        size_bytes = float(info['format'].get('size', 0))
        width = video_stream.get('width')
        height = video_stream.get('height')
        fps = eval(video_stream.get('r_frame_rate', '0/1'))
        
        return {
            'filename': os.path.basename(path),
            'width': width,
            'height': height,
            'duration_sec': duration,
            'size_mb': size_bytes / 1024 / 1024,
            'fps': fps
        }
    except Exception as e:
        print(f"Error inspecting {path}: {e}")
        return None

def main():
    folder = r"c:\Users\virgi\Desktop\REBRANDING PLAYA\DAMAI"
    videos = [
        "damai_eventgarden.mp4",
        "c851cfc5-ac95-4b4d-bbda-4d1dcc8780cd.mp4",
        "f0bfd778-2f9e-4e5c-a74a-b6fdfb9e9094.mp4"
    ]
    
    for v in videos:
        p = os.path.join(folder, v)
        if os.path.exists(p):
            res = inspect_video(p)
            if res:
                print(f"Video: {res['filename']}")
                print(f"  Resolution: {res['width']}x{res['height']}")
                print(f"  Duration: {res['duration_sec']:.2f} seconds")
                print(f"  Size: {res['size_mb']:.2f} MB")
                print(f"  FPS: {res['fps']:.2f}")
                print("-" * 40)
        else:
            print(f"File not found: {p}")

if __name__ == "__main__":
    main()
