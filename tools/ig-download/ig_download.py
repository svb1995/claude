#!/usr/bin/env python3
"""Download all photos from an Instagram profile and zip them.

Usage:
    python ig_download.py sebasvanbergen
    python ig_download.py sebasvanbergen --login sebasvanbergen
"""
import argparse
import getpass
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path

try:
    import instaloader
except ImportError:
    sys.exit("instaloader is missing. Install it with: pip install instaloader")


def build_loader(target_dir: Path) -> "instaloader.Instaloader":
    return instaloader.Instaloader(
        dirname_pattern=str(target_dir),
        filename_pattern="{date_utc:%Y-%m-%d_%H-%M-%S}_{shortcode}",
        download_videos=False,
        download_video_thumbnails=False,
        download_geotags=False,
        download_comments=False,
        save_metadata=False,
        compress_json=False,
        post_metadata_txt_pattern="",
    )


def login(loader, username: str) -> None:
    try:
        loader.load_session_from_file(username)
        print(f"Using saved session for {username}")
        return
    except FileNotFoundError:
        pass
    password = getpass.getpass(f"Instagram password for {username}: ")
    try:
        loader.login(username, password)
    except instaloader.TwoFactorAuthRequiredException:
        code = input("Two-factor code: ").strip()
        loader.two_factor_login(code)
    loader.save_session_to_file()
    print("Logged in; session saved for next time.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Download all photos from an Instagram profile into a zip.")
    parser.add_argument("profile", help="Instagram username to download, e.g. sebasvanbergen")
    parser.add_argument("--login", metavar="USER", help="log in as USER (needed if Instagram asks for login)")
    parser.add_argument("-o", "--output", help="zip file to write (default: <profile>_photos.zip)")
    parser.add_argument("--no-profile-pic", action="store_true", help="skip the profile picture")
    args = parser.parse_args()

    out_zip = Path(args.output or f"{args.profile}_photos.zip").resolve()
    work_dir = Path(tempfile.mkdtemp(prefix="ig_"))
    try:
        loader = build_loader(work_dir)
        if args.login:
            login(loader, args.login)

        try:
            profile = instaloader.Profile.from_username(loader.context, args.profile)
        except instaloader.exceptions.InstaloaderException as e:
            sys.exit(f"Could not open profile: {e}\nTry again with --login <your username>.")

        if profile.is_private and not profile.followed_by_viewer:
            sys.exit("This profile is private. Log in with an account that follows it (--login).")

        if not args.no_profile_pic:
            loader.download_profilepic(profile)

        total = profile.mediacount
        for i, post in enumerate(profile.get_posts(), 1):
            print(f"[{i}/{total}] {post.shortcode}")
            loader.download_post(post, target=profile.username)

        photos = sorted(p for p in work_dir.rglob("*") if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp", ".heic"})
        if not photos:
            sys.exit("No photos found.")
        with zipfile.ZipFile(out_zip, "w", zipfile.ZIP_STORED) as zf:
            for p in photos:
                zf.write(p, arcname=p.name)
        print(f"\nDone: {len(photos)} photos -> {out_zip}")
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)


if __name__ == "__main__":
    main()
