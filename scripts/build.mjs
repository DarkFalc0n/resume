import { readFileSync, writeFileSync, existsSync, renameSync, unlinkSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";

const SUFFIXES = [
  "", "One", "Two", "Three", "Four", "Five",
  "Six", "Seven", "Eight", "Nine", "Ten",
];

function parsePrivateTex(content) {
  const count = parseInt(content.match(/resumecount.*?\{(\d+)\}/)?.[1] ?? "1");

  const emails = [];
  for (let i = 1; i <= count; i++) {
    const suffix = i < SUFFIXES.length ? SUFFIXES[i] : String(i);
    const match = content.match(new RegExp(`myEmail${suffix}.*?\\{([^}]+)\\}`));
    if (!match) {
      console.error(`ERROR: myEmail${suffix} not found in private.tex`);
      process.exit(1);
    }
    emails.push(match[1]);
  }

  const mobile = content.match(/myMobile.*?\{([^}]+)\}/)?.[1] ?? "+00-0000000000";

  return { count, emails, mobile };
}

function writePrivateTex(path, email, mobile, count) {
  writeFileSync(path,
    `\\providecommand{\\myEmail}{${email}}\n` +
    `\\providecommand{\\myMobile}{${mobile}}\n` +
    `\\providecommand{\\resumecount}{${count}}\n`
  );
}

function run(cmd) {
  return execSync(cmd, { stdio: "pipe" });
}

const date = process.env.DATE || "dev";
const privateTex = "private.tex";
const backup = "private.tex.bak";
const dist = "dist";

if (!existsSync(privateTex)) {
  writeFileSync(privateTex,
    `\\providecommand{\\resumecount}{1}\n` +
    `\\providecommand{\\myEmailOne}{your.email@example.com}\n` +
    `\\providecommand{\\myMobile}{+00-0000000000}\n`
  );
}

writeFileSync(backup, readFileSync(privateTex));
const { count, emails, mobile } = parsePrivateTex(readFileSync(backup, "utf8"));
mkdirSync(dist, { recursive: true });

for (let i = 0; i < emails.length; i++) {
  const email = emails[i];
  writePrivateTex(privateTex, email, mobile, count);

  try {
    run("pdflatex -interaction=nonstopmode main.tex");
  } catch (e) {
    console.error(`ERROR: pdflatex failed for ${email}`);
    console.error(e.stdout?.toString().slice(-3000) ?? "");
    console.error(e.stderr?.toString().slice(-3000) ?? "");
    process.exit(1);
  }

  run("pdflatex -interaction=nonstopmode main.tex");

  const emailPrefix = email.split("@")[0];
  const outputName = `${emailPrefix}_${date}.pdf`;
  renameSync("main.pdf", `${dist}/${outputName}`);

  for (const f of ["main.aux", "main.log", "main.out"]) {
    if (existsSync(f)) unlinkSync(f);
  }
}

renameSync(backup, privateTex);
console.log(`Successfully generated ${emails.length} PDFs.`);
