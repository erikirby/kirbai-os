#!/usr/bin/env python3
"""Generic CLI for editing KIRBAI YouTube video metadata via the Data API.

Run with: /Users/erikhenry2/Desktop/Projects/youtube-automation/.venv/bin/python3

Examples:
  kirbai_youtube.py list --status private
  kirbai_youtube.py get "love island"
  kirbai_youtube.py update "love island" --description-file desc.txt --tags "KIRBAI,Pokemon"
  kirbai_youtube.py schedule "love island" --publish-at 2026-08-20T22:00:00Z
  kirbai_youtube.py publish-now "love island"
  kirbai_youtube.py upload video.mp4 --title "..." --description-file desc.txt --tags "KIRBAI,Pokemon"

Note: uploads from an API project that hasn't passed Google's audit are
locked to private by YouTube. Check the printed privacy status after upload.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

CLIENT_SECRETS = Path("/Users/erikhenry2/Desktop/Projects/youtube-automation/client_secrets.json")
TOKEN_FILE = Path("/Users/erikhenry2/Desktop/Projects/kirbai-os/.env.youtube-kirbai-token.json")
SCOPES = ["https://www.googleapis.com/auth/youtube"]
EXPECTED_CHANNEL_ID = "UCciaqiM7vAzYN4Paaoffi0Q"


def get_youtube():
    creds = None
    if TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT_SECRETS), SCOPES)
            creds = flow.run_local_server(port=0, prompt="select_account")
        TOKEN_FILE.write_text(creds.to_json(), encoding="utf-8")
    return build("youtube", "v3", credentials=creds)


def get_channel(youtube):
    response = youtube.channels().list(part="snippet,contentDetails", mine=True).execute()
    items = response.get("items", [])
    if len(items) != 1:
        raise RuntimeError(f"Expected one authenticated channel, found {len(items)}")
    channel = items[0]
    if channel["id"] != EXPECTED_CHANNEL_ID:
        raise RuntimeError(
            f"Wrong channel: {channel['snippet']['title']} ({channel['id']}). "
            f"Expected KIRBAI ({EXPECTED_CHANNEL_ID})."
        )
    return channel


def recent_uploads(youtube, channel, max_results=50):
    uploads_id = channel["contentDetails"]["relatedPlaylists"]["uploads"]
    items = []
    page_token = None
    while len(items) < max_results:
        response = youtube.playlistItems().list(
            part="contentDetails",
            playlistId=uploads_id,
            maxResults=min(50, max_results - len(items)),
            pageToken=page_token,
        ).execute()
        items.extend(response.get("items", []))
        page_token = response.get("nextPageToken")
        if not page_token:
            break
    ids = [item["contentDetails"]["videoId"] for item in items]
    videos = []
    for i in range(0, len(ids), 50):
        chunk = ids[i : i + 50]
        resp = youtube.videos().list(part="snippet,status", id=",".join(chunk)).execute()
        videos.extend(resp.get("items", []))
    return videos


def resolve_video(youtube, channel, query: str):
    """query is a video ID (11 chars, no spaces) or a case-insensitive title substring."""
    if len(query) == 11 and " " not in query:
        resp = youtube.videos().list(part="snippet,status", id=query).execute()
        items = resp.get("items", [])
        if items:
            return items[0]
    videos = recent_uploads(youtube, channel)
    matches = [v for v in videos if query.lower() in v["snippet"]["title"].lower()]
    if len(matches) == 0:
        raise RuntimeError(f"No recent upload matched '{query}'")
    if len(matches) > 1:
        listing = "\n".join(f"  {v['id']}  {v['snippet']['title']}" for v in matches)
        raise RuntimeError(f"Multiple uploads matched '{query}':\n{listing}\nUse the exact video ID instead.")
    return matches[0]


def cmd_list(youtube, channel, args):
    videos = recent_uploads(youtube, channel, max_results=args.max)
    for v in videos:
        status = v["status"].get("privacyStatus")
        if args.status and status != args.status:
            continue
        print(f"{v['id']}  [{status:<7}]  {v['snippet']['title']}")


def cmd_get(youtube, channel, args):
    video = resolve_video(youtube, channel, args.query)
    snippet, status = video["snippet"], video["status"]
    print(f"ID: {video['id']}")
    print(f"Title: {snippet.get('title')}")
    print(f"Privacy: {status.get('privacyStatus')}  publishAt: {status.get('publishAt')}")
    print(f"Tags: {snippet.get('tags')}")
    print(f"Description:\n{snippet.get('description')}")


def cmd_update(youtube, channel, args):
    video = resolve_video(youtube, channel, args.query)
    video_id = video["id"]
    snippet = video["snippet"]

    title = args.title or snippet.get("title")
    description = snippet.get("description")
    if args.description_file:
        description = Path(args.description_file).read_text(encoding="utf-8")
    elif args.description is not None:
        description = args.description

    tags = snippet.get("tags", [])
    if args.tags is not None:
        tags = [t.strip() for t in args.tags.split(",") if t.strip()]

    youtube.videos().update(
        part="snippet",
        body={
            "id": video_id,
            "snippet": {
                "title": title,
                "description": description,
                "tags": tags,
                "categoryId": snippet.get("categoryId", "10"),
            },
        },
    ).execute()
    print(f"Updated snippet for {video_id}: https://youtu.be/{video_id}")


def cmd_schedule(youtube, channel, args):
    video = resolve_video(youtube, channel, args.query)
    video_id = video["id"]
    status = video["status"]

    youtube.videos().update(
        part="status",
        body={
            "id": video_id,
            "status": {
                "privacyStatus": "private",
                "publishAt": args.publish_at,
                "license": status.get("license", "youtube"),
                "embeddable": status.get("embeddable", True),
                "publicStatsViewable": status.get("publicStatsViewable", True),
                "selfDeclaredMadeForKids": status.get("selfDeclaredMadeForKids", False),
                "containsSyntheticMedia": status.get("containsSyntheticMedia", True),
            },
        },
    ).execute()
    print(f"Scheduled {video_id} for {args.publish_at}: https://youtu.be/{video_id}")


def cmd_publish_now(youtube, channel, args):
    video = resolve_video(youtube, channel, args.query)
    video_id = video["id"]
    status = video["status"]

    youtube.videos().update(
        part="status",
        body={
            "id": video_id,
            "status": {
                "privacyStatus": "public",
                "license": status.get("license", "youtube"),
                "embeddable": status.get("embeddable", True),
                "publicStatsViewable": status.get("publicStatsViewable", True),
                "selfDeclaredMadeForKids": status.get("selfDeclaredMadeForKids", False),
                "containsSyntheticMedia": status.get("containsSyntheticMedia", True),
            },
        },
    ).execute()
    print(f"Published {video_id} now: https://youtu.be/{video_id}")


def cmd_upload(youtube, channel, args):
    description = Path(args.description_file).read_text(encoding="utf-8") if args.description_file else (args.description or "")
    tags = [t.strip() for t in (args.tags or "").split(",") if t.strip()]
    body = {
        "snippet": {
            "title": args.title,
            "description": description,
            "tags": tags,
            "categoryId": "10",  # Music
        },
        "status": {
            "privacyStatus": "private",
            "selfDeclaredMadeForKids": False,
            "containsSyntheticMedia": True,
            "embeddable": True,
            "publicStatsViewable": True,
        },
    }
    media = MediaFileUpload(args.file, chunksize=16 * 1024 * 1024, resumable=True)
    request = youtube.videos().insert(part="snippet,status", body=body, media_body=media)
    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            print(f"  uploaded {int(status.progress() * 100)}%", flush=True)
    video_id = response["id"]
    # Re-read: YouTube may lock unaudited-API uploads to private.
    check = youtube.videos().list(part="status", id=video_id).execute()["items"][0]["status"]
    print(f"Uploaded {video_id}: https://youtu.be/{video_id}")
    print(f"Privacy: {check.get('privacyStatus')}  uploadStatus: {check.get('uploadStatus')}  madeForKids: {check.get('madeForKids')}")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)

    p_list = sub.add_parser("list", help="List recent uploads")
    p_list.add_argument("--status", choices=["private", "public", "unlisted"], default=None)
    p_list.add_argument("--max", type=int, default=50)
    p_list.set_defaults(func=cmd_list)

    p_get = sub.add_parser("get", help="Show a video's current metadata")
    p_get.add_argument("query", help="Video ID or title substring")
    p_get.set_defaults(func=cmd_get)

    p_update = sub.add_parser("update", help="Update title/description/tags")
    p_update.add_argument("query", help="Video ID or title substring")
    p_update.add_argument("--title")
    p_update.add_argument("--description")
    p_update.add_argument("--description-file")
    p_update.add_argument("--tags", help="Comma-separated tag list")
    p_update.set_defaults(func=cmd_update)

    p_schedule = sub.add_parser("schedule", help="Set privacy=private with a future publishAt")
    p_schedule.add_argument("query", help="Video ID or title substring")
    p_schedule.add_argument("--publish-at", required=True, help="ISO 8601 UTC timestamp, e.g. 2026-08-20T22:00:00Z")
    p_schedule.set_defaults(func=cmd_schedule)

    p_publish = sub.add_parser("publish-now", help="Set privacy=public immediately")
    p_publish.add_argument("query", help="Video ID or title substring")
    p_publish.set_defaults(func=cmd_publish_now)

    p_upload = sub.add_parser("upload", help="Upload a video as private (Music, not made for kids)")
    p_upload.add_argument("file", help="Path to the video file")
    p_upload.add_argument("--title", required=True)
    p_upload.add_argument("--description")
    p_upload.add_argument("--description-file")
    p_upload.add_argument("--tags", help="Comma-separated tag list")
    p_upload.set_defaults(func=cmd_upload)

    args = parser.parse_args()
    youtube = get_youtube()
    channel = get_channel(youtube)
    args.func(youtube, channel, args)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
