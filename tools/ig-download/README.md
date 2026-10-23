# Instagram photo downloader

Downloads every photo from an Instagram profile (posts, carousels, and the
profile picture) and puts them in one zip file. Videos are skipped.

Run it on your own computer: Instagram blocks most cloud/datacenter IPs.

## Setup

```bash
pip install instaloader
```

## Use

```bash
python ig_download.py sebasvanbergen
```

If Instagram redirects to the login page or says "Please wait a few minutes",
log in (the password is typed into your terminal and never stored; only a
session file is saved so you don't have to log in again):

```bash
python ig_download.py sebasvanbergen --login sebasvanbergen
```

Options:

- `-o my_pics.zip` – choose the zip filename (default `<profile>_photos.zip`)
- `--no-profile-pic` – skip the profile picture
