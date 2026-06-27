import argparse
import os
from pathlib import Path

try:
    from PIL import Image
except ModuleNotFoundError:
    Image = None


REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUTPUT_DIR = REPO_ROOT / "frontend" / "assets" / "images"
DEFAULT_SOURCE_DIR = Path(
    os.environ.get("ANTIGRAVITY_BRAIN_DIR", REPO_ROOT / "antigravity-assets")
)

MAPPINGS = [
    {
        "source_name": "hero_damai_1781012658115.png",
        "desktop_name": "hero-damai.webp",
        "mobile_name": "mobile-hero-damai.webp",
        "max_desktop": 1920,
    },
    {
        "source_name": "damai_pool_1781012673760.png",
        "desktop_name": "damai-pool-sunset.webp",
        "mobile_name": "mobile-damai-pool-sunset.webp",
        "max_desktop": 1200,
    },
    {
        "source_name": "damai_details_1781012692502.png",
        "desktop_name": "damai-garden-details.webp",
        "mobile_name": "mobile-damai-garden-details.webp",
        "max_desktop": 1200,
    },
]


def process_image(src_path, dest_desktop, dest_mobile, max_desktop=1920, max_mobile=800, desktop_q=82, mobile_q=80):
    if Image is None:
        print("ERROR: Pillow non e installato. Esegui `pip install pillow` nell'ambiente che usera questo script.")
        return False

    if not src_path.exists():
        print(f"WARNING: Source file does not exist: {src_path}")
        return False

    try:
        with Image.open(src_path) as img:
            orig_w, orig_h = img.size
            print(f"\nProcessing: {src_path.name} ({orig_w}x{orig_h}px)")

            if orig_w > max_desktop or orig_h > max_desktop:
                if orig_w > orig_h:
                    desktop_w = max_desktop
                    desktop_h = int((max_desktop / orig_w) * orig_h)
                else:
                    desktop_h = max_desktop
                    desktop_w = int((max_desktop / orig_h) * orig_w)
            else:
                desktop_w, desktop_h = orig_w, orig_h

            desktop_img = img.resize((desktop_w, desktop_h), Image.Resampling.LANCZOS)
            desktop_img.save(dest_desktop, "WEBP", quality=desktop_q, method=6)
            print(f" -> Saved Desktop: {dest_desktop} ({dest_desktop.stat().st_size / 1024:.1f} KB)")

            if orig_w > max_mobile or orig_h > max_mobile:
                if orig_w > orig_h:
                    mobile_w = max_mobile
                    mobile_h = int((max_mobile / orig_w) * orig_h)
                else:
                    mobile_h = max_mobile
                    mobile_w = int((max_mobile / orig_h) * orig_w)
            else:
                mobile_w, mobile_h = orig_w, orig_h

            mobile_img = img.resize((mobile_w, mobile_h), Image.Resampling.LANCZOS)
            mobile_img.save(dest_mobile, "WEBP", quality=mobile_q, method=6)
            print(f" -> Saved Mobile: {dest_mobile} ({dest_mobile.stat().st_size / 1024:.1f} KB)")
            return True

    except Exception as exc:
        print(f"Error processing {src_path}: {exc}")
        return False


def parse_args():
    parser = argparse.ArgumentParser(
        description="Convert Antigravity-generated Damai PNG assets into desktop/mobile WebP files."
    )
    parser.add_argument(
        "--source-dir",
        type=Path,
        default=DEFAULT_SOURCE_DIR,
        help="Directory containing the Antigravity PNG exports.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help="Directory where the optimized WebP assets will be written.",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Using source directory: {args.source_dir}")
    print(f"Using output directory: {args.output_dir}")

    processed = 0
    for mapping in MAPPINGS:
        source_path = args.source_dir / mapping["source_name"]
        desktop_path = args.output_dir / mapping["desktop_name"]
        mobile_path = args.output_dir / mapping["mobile_name"]

        if process_image(
            source_path,
            desktop_path,
            mobile_path,
            max_desktop=mapping["max_desktop"],
        ):
            processed += 1

    print(f"\nCompleted: {processed}/{len(MAPPINGS)} assets processed.")


if __name__ == "__main__":
    main()
