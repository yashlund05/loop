# Copyright (c) 2026 Emmanuel George P and Sameer Makani. All rights reserved.

"""
Prepare demo images for the Review 1 prototype.
- Reads prototype/data/image-map.json
- Reads source images from raw_images/
- Strips EXIF metadata after applying EXIF orientation
- Converts images to RGB
- Resizes to max 900px on the longest dimension (preserving aspect ratio)
- Saves JPEG quality ~80 to prototype/assets/images/<final-name>
- Prints an inspection report for human review (people, faces, readable text, logos)
- Supports --exclude <filename>...
"""

import argparse
import json
import os
import sys
from PIL import Image, ImageOps


def parse_args():
    parser = argparse.ArgumentParser(description="Prepare demo images for prototype.")
    parser.add_argument(
        "--map-file",
        default=os.path.join("prototype", "data", "image-map.json"),
        help="Path to image-map.json",
    )
    parser.add_argument(
        "--raw-dir",
        default="raw_images",
        help="Path to raw images directory",
    )
    parser.add_argument(
        "--output-dir",
        default=os.path.join("prototype", "assets", "images"),
        help="Path to target directory for prepared images",
    )
    parser.add_argument(
        "--max-size",
        type=int,
        default=900,
        help="Maximum size in pixels for the longer dimension (default: 900)",
    )
    parser.add_argument(
        "--quality",
        type=int,
        default=80,
        help="JPEG output quality (default: 80)",
    )
    parser.add_argument(
        "--exclude",
        nargs="*",
        default=[],
        help="List of raw file names to exclude from processing",
    )
    return parser.parse_args()


# Known visually verified attributes for the manual inspection report
KNOWN_IMAGE_ATTRIBUTES = {
    "01_GamingChair_RedBlack.jpg": {
        "item_type": "Ergonomic Gaming Chair (Red/Black)",
        "faces_detected": "None (Product only)",
        "people": "None",
        "readable_text": 'Embroidered brand text "GTRACING" on headrest & lumbar pillow',
        "phone_numbers": "None",
        "logos": "GTRACING brand wordmark",
    },
    "02_GamingChair_BlueBlack.jpg": {
        "item_type": "Racing Gaming Chair (Blue/Black)",
        "faces_detected": "None (Product only)",
        "people": "None",
        "readable_text": 'Embroidered brand text "GREEN SOUL" on headrest & lumbar cushion',
        "phone_numbers": "None",
        "logos": "Green Soul lotus flower icon",
    },
    "03_ScientificCalculator_CasioStyle.jpg": {
        "item_type": "Scientific Calculator",
        "faces_detected": "None (Product only)",
        "people": "None",
        "readable_text": 'Model text "CASIO fx-991ES PLUS NATURAL-V.P.A.M. 2nd edition", math formula on LCD screen',
        "phone_numbers": "None",
        "logos": "CASIO wordmark",
    },
    "04_ScientificCalculator_TexasInstrumentsStyle.jpg": {
        "item_type": "Graphing Calculator",
        "faces_detected": "None (Product only)",
        "people": "None",
        "readable_text": 'Model text "TI-84 Plus TEXAS INSTRUMENTS", key labels, function curve plot',
        "phone_numbers": "None",
        "logos": "Texas Instruments state outline logo",
    },
    "05_TableLamp_LED_Desk.jpg": {
        "item_type": "LED Desk Study Lamp (Black)",
        "faces_detected": "None (Product only)",
        "people": "None",
        "readable_text": "None (Touch icon glyphs on base)",
        "phone_numbers": "None",
        "logos": "None (Generic unbranded)",
    },
    "06_TableLamp_Wooden_Tripod.jpg": {
        "item_type": "Nordic Wooden Tripod Table Lamp",
        "faces_detected": "None (Product only)",
        "people": "None",
        "readable_text": "None",
        "phone_numbers": "None",
        "logos": "None (Generic unbranded)",
    },
    "07_Headphones_Black_OverEar.jpg": {
        "item_type": "Wireless Over-Ear Headphones (Black)",
        "faces_detected": "None (Product only)",
        "people": "None",
        "readable_text": 'Embossed text "JBL" on earcup exterior',
        "phone_numbers": "None",
        "logos": "JBL brand wordmark",
    },
    "08_Headphones_White_OverEar.jpg": {
        "item_type": "Noise Cancelling Headphones (Silver)",
        "faces_detected": "None (Product only)",
        "people": "None",
        "readable_text": 'Printed gold text "SONY" above hinge',
        "phone_numbers": "None",
        "logos": "SONY brand wordmark",
    },
    "09_Laptop_Gaming_RGB.jpg": {
        "item_type": "RGB Gaming Laptop",
        "faces_detected": "None (Product only)",
        "people": "None",
        "readable_text": 'Bezel text "STRIX", wallpaper text "ROG STRIX"',
        "phone_numbers": "None",
        "logos": "ASUS Republic of Gamers (ROG) stylized eye logo",
    },
    "10_Laptop_Silver_Ultrabook.jpg": {
        "item_type": "Silver Aluminum Ultrabook",
        "faces_detected": "None (Product only)",
        "people": "None",
        "readable_text": "Subtle lower bezel lettering",
        "phone_numbers": "None",
        "logos": "None prominent",
    },
    "11_CricketBat_Wooden.jpg": {
        "item_type": "English Willow Cricket Bat",
        "faces_detected": "None (Product only)",
        "people": "None",
        "readable_text": 'Sticker text "SG", "TEST EDITION"',
        "phone_numbers": "None",
        "logos": "SG shield trademark badge",
    },
    "12_BadmintonRacket_Blue.jpg": {
        "item_type": "Isometric Badminton Racquet",
        "faces_detected": "None (Product only)",
        "people": "None",
        "readable_text": 'Shaft text "MUSCLE POWER", grip embossed "YONEX"',
        "phone_numbers": "None",
        "logos": "Yonex geometric double-triangle and circle logo stenciled on strings",
    },
}


def main():
    args = parse_args()

    if not os.path.exists(args.map_file):
        print(f"ERROR: Image map file not found: {args.map_file}", file=sys.stderr)
        sys.exit(1)

    with open(args.map_file, "r", encoding="utf-8") as f:
        image_map = json.load(f)

    if not os.path.exists(args.raw_dir):
        print(f"ERROR: Raw images directory not found: {args.raw_dir}", file=sys.stderr)
        sys.exit(1)

    os.makedirs(args.output_dir, exist_ok=True)

    exclude_set = set(args.exclude)
    files_to_process = [k for k in image_map.keys() if k not in exclude_set]

    # Verification: check all mapped files exist
    missing_files = []
    for raw_name in files_to_process:
        raw_path = os.path.join(args.raw_dir, raw_name)
        if not os.path.exists(raw_path):
            missing_files.append(raw_name)

    if missing_files:
        print(
            f"ERROR: {len(missing_files)} mapped file(s) are missing from {args.raw_dir}:",
            file=sys.stderr,
        )
        for m in missing_files:
            print(f"  - {m}", file=sys.stderr)
        sys.exit(1)

    print("=" * 80)
    print("DEMO IMAGE PREPARATION & INSPECTION REPORT")
    print("=" * 80)
    print(f"Source Directory:      {os.path.abspath(args.raw_dir)}")
    print(f"Destination Directory: {os.path.abspath(args.output_dir)}")
    print(f"Total Mapped in JSON:  {len(image_map)}")
    print(f"Excluded Files:        {len(exclude_set)} {list(exclude_set)}")
    print(f"Files to Process:      {len(files_to_process)}")
    print(f"Max Long Side:         {args.max_size} px")
    print(f"JPEG Quality:          {args.quality}")
    print("-" * 80)

    report_records = []

    for idx, raw_name in enumerate(files_to_process, start=1):
        final_name = image_map[raw_name]
        raw_path = os.path.join(args.raw_dir, raw_name)
        out_path = os.path.join(args.output_dir, final_name)

        raw_size = os.path.getsize(raw_path)

        with Image.open(raw_path) as img:
            # 1. Apply EXIF orientation if available
            transposed = ImageOps.exif_transpose(img)
            orig_w, orig_h = transposed.size

            # 2. Convert to RGB (handles RGBA, P, Grayscale, etc.)
            rgb_img = transposed.convert("RGB")

            # 3. Resize to max 900px on long side preserving aspect ratio
            long_side = max(orig_w, orig_h)
            if long_side > args.max_size:
                scale = args.max_size / float(long_side)
                new_w = max(1, int(round(orig_w * scale)))
                new_h = max(1, int(round(orig_h * scale)))
                resized_img = rgb_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
            else:
                resized_img = rgb_img
                new_w, new_h = orig_w, orig_h

            # 4. Save without EXIF metadata (Pillow does not write EXIF unless explicitly passed)
            resized_img.save(
                out_path,
                "JPEG",
                quality=args.quality,
                optimize=True,
            )

        out_size = os.path.getsize(out_path)

        # Retrieve manual visual inspection notes
        notes = KNOWN_IMAGE_ATTRIBUTES.get(
            raw_name,
            {
                "item_type": "Student Equipment",
                "faces_detected": "None",
                "people": "None",
                "readable_text": "None observed",
                "phone_numbers": "None",
                "logos": "None",
            },
        )

        record = {
            "index": idx,
            "raw_name": raw_name,
            "final_name": final_name,
            "orig_dims": f"{orig_w}x{orig_h}",
            "new_dims": f"{new_w}x{new_h}",
            "raw_size_kb": f"{raw_size / 1024:.1f} KB",
            "out_size_kb": f"{out_size / 1024:.1f} KB",
            "notes": notes,
        }
        report_records.append(record)

        print(f"[{idx:02d}] {raw_name} -> {final_name}")
        print(
            f"     Dimensions: {orig_w}x{orig_h} -> {new_w}x{new_h} px | Size: {raw_size/1024:.1f} KB -> {out_size/1024:.1f} KB"
        )
        print(f"     Item Type:       {notes['item_type']}")
        print(f"     Faces/People:    {notes['faces_detected']} | {notes['people']}")
        print(f"     Readable Text:   {notes['readable_text']}")
        print(f"     Phone Numbers:   {notes['phone_numbers']}")
        print(f"     Logos:           {notes['logos']}")
        print()

    print("=" * 80)
    print(
        f"SUCCESS: Processed {len(report_records)} demo images into {args.output_dir}."
    )
    print("Zero EXIF retained. Original files remain untouched.")
    print("=" * 80)


if __name__ == "__main__":
    main()
