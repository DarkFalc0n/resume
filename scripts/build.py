import re
import subprocess
import sys
import os
from pathlib import Path

SUFFIXES = [
    "", "One", "Two", "Three", "Four", "Five",
    "Six", "Seven", "Eight", "Nine", "Ten",
]


def parse_private_tex(path: Path) -> dict:
    content = path.read_text()
    data = {}

    m = re.search(r"resumecount.*?\{(\d+)\}", content)
    data["count"] = int(m.group(1)) if m else 1

    data["emails"] = []
    for i in range(1, data["count"] + 1):
        suffix = SUFFIXES[i] if i < len(SUFFIXES) else str(i)
        m = re.search(rf"myEmail{suffix}.*?\{{([^}}]+)\}}", content)
        if not m:
            print(f"ERROR: myEmail{suffix} not found in {path}")
            sys.exit(1)
        data["emails"].append(m.group(1))

    m = re.search(r"myMobile.*?\{([^}]+)\}", content)
    data["mobile"] = m.group(1) if m else "+00-0000000000"

    return data


def write_private_tex(path: Path, email: str, mobile: str, count: int):
    path.write_text(
        f"\\providecommand{{\\myEmail}}{{{email}}}\n"
        f"\\providecommand{{\\myMobile}}{{{mobile}}}\n"
        f"\\providecommand{{\\resumecount}}{{{count}}}\n"
    )


def main():
    date = os.environ.get("DATE", "dev")
    private_tex = Path("private.tex")
    backup = Path("private.tex.bak")
    dist = Path("dist")

    if not private_tex.exists():
        private_tex.write_text(
            "\\providecommand{\\resumecount}{1}\n"
            "\\providecommand{\\myEmailOne}{your.email@example.com}\n"
            "\\providecommand{\\myMobile}{+00-0000000000}\n"
        )

    backup.write_text(private_tex.read_text())
    data = parse_private_tex(backup)
    dist.mkdir(exist_ok=True)

    for i, email in enumerate(data["emails"], start=1):
        write_private_tex(private_tex, email, data["mobile"], data["count"])

        result = subprocess.run(
            ["pdflatex", "-interaction=nonstopmode", "main.tex"],
            capture_output=True,
        )
        if result.returncode != 0:
            print(f"ERROR: pdflatex failed for {email}")
            print(result.stdout.decode()[-2000:])
            print(result.stderr.decode()[-2000:])
            sys.exit(1)

        # second pass for references
        subprocess.run(
            ["pdflatex", "-interaction=nonstopmode", "main.tex"],
            capture_output=True,
        )

        email_prefix = email.split("@")[0]
        output_name = f"{email_prefix}_{date}.pdf"
        os.replace("main.pdf", str(dist / output_name))

        for f in ["main.aux", "main.log", "main.out"]:
            if os.path.exists(f):
                os.remove(f)

    backup.rename(private_tex)
    print(f"Successfully generated {len(data['emails'])} PDFs.")


if __name__ == "__main__":
    main()
