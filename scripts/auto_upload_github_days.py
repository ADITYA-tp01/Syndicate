#!/usr/bin/env python3
"""Auto end-of-day GitHub uploads for Day 0–7.

Rules:
- Parse Docs/Tasks-Days Wise.md.
- For each day (0..7), if all checkbox tasks in that day's section are
  marked [x] (except the End-of-day upload checkbox itself), and the
  End-of-day upload checkbox is currently [ ], then:
    1) (If needed) git add/commit + git push with message "End-of-day upload: Day X"
    2) Mark the upload checkbox as [x] in the markdown and commit+push again.

This script is intended to be run from the repo root.
"""

from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple


MD_PATH = os.path.join("Docs", "Tasks-Days Wise.md")
DAY_HEADING_RE = re.compile(r"^##\s+Day\s+(\d+)\b")
CHECKBOX_RE = re.compile(r"^(-\s+\[(?P<mark>[ xX])\])\s+(?P<text>.*)$")


@dataclass
class DayBlock:
    day: int
    start_idx: int
    end_idx: int
    lines: List[str]


def run(cmd: List[str], dry_run: bool) -> Tuple[int, str]:
    if dry_run:
        return 0, ""
    p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    return p.returncode, p.stdout


def git(args: List[str], dry_run: bool) -> Tuple[int, str]:
    return run(["git", *args], dry_run=dry_run)


def git_porcelain(dry_run: bool) -> str:
    if dry_run:
        return ""
    rc, out = git(["status", "--porcelain"], dry_run=dry_run)
    if rc != 0:
        raise RuntimeError("git status failed")
    return out


def parse_day_blocks(lines: List[str]) -> Dict[int, DayBlock]:
    blocks: Dict[int, DayBlock] = {}
    heading_positions: List[Tuple[int, int]] = []  # (day, line_index)

    for i, line in enumerate(lines):
        m = DAY_HEADING_RE.match(line)
        if m:
            day = int(m.group(1))
            heading_positions.append((day, i))

    for idx, (day, start) in enumerate(heading_positions):
        end = heading_positions[idx + 1][1] if idx + 1 < len(heading_positions) else len(lines)
        block_lines = lines[start:end]
        blocks[day] = DayBlock(day=day, start_idx=start, end_idx=end, lines=block_lines)

    return blocks


def find_upload_checkbox_line(day: int, day_block_lines: List[str]) -> Optional[int]:
    # Example line:
    # - [ ] End-of-day upload: commit + push **Day 0** to GitHub (only after everything above is done)
    needle = f"End-of-day upload: commit + push **Day {day}** to GitHub"
    for i, line in enumerate(day_block_lines):
        if needle in line:
            return i
    return None


def parse_day_completion(day_block: DayBlock, day: int) -> Tuple[bool, bool]:
    """Return (eligible_if_upload_unchecked, upload_already_done)."""

    upload_line_idx = find_upload_checkbox_line(day, day_block.lines)
    upload_mark: Optional[str] = None
    if upload_line_idx is not None:
        m = CHECKBOX_RE.match(day_block.lines[upload_line_idx])
        if m:
            upload_mark = m.group("mark").strip().lower()

    upload_already_done = upload_mark == "x"

    # Consider all checkbox lines except the upload checkbox itself.
    all_checked = True
    for i, line in enumerate(day_block.lines):
        m = CHECKBOX_RE.match(line)
        if not m:
            continue

        mark = m.group("mark").strip().lower()
        text = m.group("text").strip()

        # Skip upload checkbox task itself
        if i == upload_line_idx:
            continue

        # If any other checkbox is unchecked, day is not complete.
        if mark != "x":
            all_checked = False
            break

    return all_checked, upload_already_done


def replace_upload_checkbox(day_block: DayBlock, day: int, lines: List[str]) -> None:
    """Mutate `lines` in place: set the upload checkbox to [x] for given day."""
    upload_line_idx = find_upload_checkbox_line(day, day_block.lines)
    if upload_line_idx is None:
        raise RuntimeError(f"Could not find upload checkbox for Day {day}")

    abs_idx = day_block.start_idx + upload_line_idx
    line = lines[abs_idx]
    # Replace "- [ ]" with "- [x]" for this specific line.
    if "- [ ]" in line:
        lines[abs_idx] = line.replace("- [ ]", "- [x]", 1)
    elif "- [x]" in line.lower():
        # already done
        return
    else:
        # handle variations like - [X]
        lines[abs_idx] = re.sub(r"-\s*\[\s*[xX]\s*\]", "- [x]", line)
        if "- [x]" not in lines[abs_idx]:
            # fallback hard-set
            lines[abs_idx] = re.sub(r"-\s*\[\s*[^\]]+\s*\]", "- [x]", line)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="Only print what would happen")
    ap.add_argument("--days", default="0,1,2,3,4,5,6,7", help="Comma list of days to check")
    ap.add_argument("--md", default=MD_PATH, help="Path to Tasks-Days Wise.md")
    args = ap.parse_args()

    repo_root = os.getcwd()
    md_path = args.md

    if not os.path.exists(md_path):
        print(f"ERROR: markdown not found: {md_path}", file=sys.stderr)
        sys.exit(2)

    days = [int(x.strip()) for x in args.days.split(",") if x.strip() != ""]

    with open(md_path, "r", encoding="utf-8") as f:
        md_text = f.read()

    lines = md_text.splitlines()
    day_blocks = parse_day_blocks(lines)

    eligible: List[int] = []
    for day in days:
        if day not in day_blocks:
            print(f"WARN: no section for Day {day}")
            continue
        complete, upload_done = parse_day_completion(day_blocks[day], day)
        if not upload_done and complete:
            eligible.append(day)

    print("Dry-run" if args.dry_run else "Running")
    print(f"Eligible days to upload: {eligible}")

    if args.dry_run:
        # Do not touch git or files.
        return

    # Process in order.
    for day in eligible:
        print(f"\n== Day {day}: preparing upload ==")

        # Re-load current md each day step? Keep in-memory; we will mark and commit after pushes.
        block = day_blocks[day]

        # Check if there are staged/unstaged changes.
        porcelain = git_porcelain(dry_run=False)
        has_changes = bool(porcelain.strip())

        if has_changes:
            rc, out = git(["add", "-A"], dry_run=False)
            if rc != 0:
                print(out)
                raise RuntimeError("git add failed")

            msg = f"End-of-day upload: Day {day}"
            rc, out = git(["commit", "-m", msg], dry_run=False)
            if rc != 0:
                # Handle "nothing to commit" gracefully.
                if "nothing to commit" not in out.lower():
                    print(out)
                    raise RuntimeError("git commit failed")
                else:
                    print("No code changes to commit.")
            else:
                print("Committed code changes.")

            rc, out = git(["push"], dry_run=False)
            if rc != 0:
                print(out)
                raise RuntimeError(f"git push failed for Day {day}")
            print("Pushed code commit.")
        else:
            print("No code changes in working tree.")

        # Now mark the upload checkbox as done and push that.
        updated_lines = lines[:]  # copy whole file representation
        # Re-read day block indexes in terms of updated lines (same length changes, but line indices same)
        # Replace checkbox in `updated_lines`.
        replace_upload_checkbox(block, day, updated_lines)

        new_text = "\n".join(updated_lines) + ("\n" if md_text.endswith("\n") else "")
        with open(md_path, "w", encoding="utf-8") as f:
            f.write(new_text)

        rc, out = git(["add", md_path], dry_run=False)
        if rc != 0:
            print(out)
            raise RuntimeError("git add md failed")

        mark_msg = f"Mark Day {day} end-of-day upload complete"
        rc, out = git(["commit", "-m", mark_msg], dry_run=False)
        if rc != 0:
            if "nothing to commit" not in out.lower():
                print(out)
                raise RuntimeError("git commit (mark) failed")
            else:
                print("Upload checkbox already marked or no change.")
        else:
            print("Committed checkbox update.")

        rc, out = git(["push"], dry_run=False)
        if rc != 0:
            print(out)
            raise RuntimeError(f"git push failed for checkbox Day {day}")
        print("Pushed checkbox commit.")

        # Update in-memory markdown so next day sees modified state
        lines = updated_lines
        md_text = new_text


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
