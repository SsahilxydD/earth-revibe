#!/usr/bin/env node
"use strict";

/**
 * NanoClaw v2 — Zero-dependency interactive AI agent REPL
 * with persistent markdown session history.
 *
 * Usage:
 *   node scripts/claw.js
 *   CLAW_SESSION=storefront node scripts/claw.js
 *
 * Environment:
 *   CLAW_SESSION  — session name (default: "default")
 *   CLAW_DIR      — session storage dir (default: ~/.claude/claw)
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { execSync } = require("child_process");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

// Accept session name from: CLI arg > env var > "default"
const SESSION_NAME = (process.argv[2] || process.env.CLAW_SESSION || "default").replace(
  /[^a-zA-Z0-9_-]/g,
  "-"
);
const CLAW_DIR =
  process.env.CLAW_DIR ||
  path.join(process.env.USERPROFILE || process.env.HOME || ".", ".claude", "claw");
const SESSION_FILE = path.join(CLAW_DIR, `${SESSION_NAME}.md`);
const MAX_RECENT_TURNS = 40;

// ---------------------------------------------------------------------------
// Session store
// ---------------------------------------------------------------------------

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadSession() {
  if (fs.existsSync(SESSION_FILE)) {
    return fs.readFileSync(SESSION_FILE, "utf-8");
  }
  return "";
}

function appendToSession(role, content) {
  ensureDir(CLAW_DIR);
  const timestamp = new Date().toISOString();
  const entry = `\n### ${role} [${timestamp}]\n\n${content}\n`;
  fs.appendFileSync(SESSION_FILE, entry, "utf-8");
}

function saveSession(content) {
  ensureDir(CLAW_DIR);
  fs.writeFileSync(SESSION_FILE, content, "utf-8");
}

// ---------------------------------------------------------------------------
// Turn parser
// ---------------------------------------------------------------------------

function parseTurns(raw) {
  const turns = [];
  const lines = raw.split("\n");
  let current = null;

  for (const line of lines) {
    const match = line.match(/^### (user|assistant|system|compaction) \[(.+)\]$/);
    if (match) {
      if (current) turns.push(current);
      current = { role: match[1], timestamp: match[2], lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) turns.push(current);
  return turns.map((t) => ({
    role: t.role,
    timestamp: t.timestamp,
    content: t.lines.join("\n").trim(),
  }));
}

// ---------------------------------------------------------------------------
// REPL commands
// ---------------------------------------------------------------------------

function cmdHelp() {
  console.log(`
  NanoClaw v2 — Commands
  ──────────────────────────────────────
  /help                   Show this help
  /clear                  Clear current session
  /history                Print full conversation
  /sessions               List saved sessions
  /branch <name>          Branch current session
  /search <query>         Search across sessions
  /compact                Compact old turns
  /export <md|json|txt>   Export session
  /metrics                Show session metrics
  /info                   Current session info
  exit                    Quit
  ──────────────────────────────────────
  `);
}

function cmdClear() {
  if (fs.existsSync(SESSION_FILE)) fs.unlinkSync(SESSION_FILE);
  console.log(`Session "${SESSION_NAME}" cleared.`);
}

function cmdHistory() {
  const raw = loadSession();
  if (!raw.trim()) {
    console.log("(empty session)");
    return;
  }
  console.log(raw);
}

function cmdSessions() {
  ensureDir(CLAW_DIR);
  const files = fs
    .readdirSync(CLAW_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();
  if (files.length === 0) {
    console.log("No saved sessions.");
    return;
  }
  console.log("\n  Saved sessions:");
  for (const f of files) {
    const name = f.replace(/\.md$/, "");
    const stat = fs.statSync(path.join(CLAW_DIR, f));
    const size = (stat.size / 1024).toFixed(1);
    const active = name === SESSION_NAME ? " <-- active" : "";
    console.log(`    ${name} (${size} KB, ${stat.mtime.toLocaleDateString()})${active}`);
  }
  console.log();
}

function cmdBranch(name) {
  if (!name) {
    console.log("Usage: /branch <session-name>");
    return;
  }
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "-");
  const dest = path.join(CLAW_DIR, `${safeName}.md`);
  if (fs.existsSync(dest)) {
    console.log(`Session "${safeName}" already exists. Pick a different name.`);
    return;
  }
  ensureDir(CLAW_DIR);
  const content = loadSession();
  fs.writeFileSync(dest, content, "utf-8");
  console.log(`Branched "${SESSION_NAME}" -> "${safeName}"`);
  console.log(`Switch with: CLAW_SESSION=${safeName} node scripts/claw.js`);
}

function cmdSearch(query) {
  if (!query) {
    console.log("Usage: /search <query>");
    return;
  }
  ensureDir(CLAW_DIR);
  const files = fs.readdirSync(CLAW_DIR).filter((f) => f.endsWith(".md"));
  const lowerQ = query.toLowerCase();
  let found = 0;

  for (const f of files) {
    const content = fs.readFileSync(path.join(CLAW_DIR, f), "utf-8");
    const lines = content.split("\n");
    const matches = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(lowerQ)) {
        matches.push({ line: i + 1, text: lines[i].trim().slice(0, 120) });
      }
    }
    if (matches.length > 0) {
      const name = f.replace(/\.md$/, "");
      console.log(`\n  [${name}] — ${matches.length} match(es)`);
      for (const m of matches.slice(0, 5)) {
        console.log(`    L${m.line}: ${m.text}`);
      }
      if (matches.length > 5) console.log(`    ... and ${matches.length - 5} more`);
      found += matches.length;
    }
  }
  if (found === 0) console.log(`No matches for "${query}".`);
  else console.log(`\n  Total: ${found} match(es) across sessions.\n`);
}

function cmdCompact() {
  const raw = loadSession();
  const turns = parseTurns(raw);
  if (turns.length <= MAX_RECENT_TURNS) {
    console.log(`Only ${turns.length} turns — nothing to compact.`);
    return;
  }

  const keep = turns.slice(-MAX_RECENT_TURNS);
  const dropped = turns.length - MAX_RECENT_TURNS;
  const header = `### compaction [${new Date().toISOString()}]\n\n_Compacted ${dropped} earlier turns. Keeping ${keep.length} most recent._\n`;

  let content = header;
  for (const t of keep) {
    content += `\n### ${t.role} [${t.timestamp}]\n\n${t.content}\n`;
  }
  saveSession(content);
  console.log(`Compacted: dropped ${dropped} old turns, kept ${keep.length}.`);
}

function cmdExport(format) {
  const raw = loadSession();
  if (!raw.trim()) {
    console.log("Nothing to export.");
    return;
  }

  const turns = parseTurns(raw);
  let output;
  let ext;

  switch (format) {
    case "json":
      output = JSON.stringify(turns, null, 2);
      ext = "json";
      break;
    case "txt":
      output = turns.map((t) => `[${t.role}] ${t.content}`).join("\n\n---\n\n");
      ext = "txt";
      break;
    case "md":
    default:
      output = raw;
      ext = "md";
      break;
  }

  const outFile = path.join(
    process.cwd(),
    `claw-export-${SESSION_NAME}-${Date.now()}.${ext}`
  );
  fs.writeFileSync(outFile, output, "utf-8");
  console.log(`Exported to: ${outFile}`);
}

function cmdMetrics() {
  const raw = loadSession();
  const turns = parseTurns(raw);
  const userTurns = turns.filter((t) => t.role === "user");
  const assistantTurns = turns.filter((t) => t.role === "assistant");
  const totalChars = turns.reduce((sum, t) => sum + t.content.length, 0);
  const first = turns[0]?.timestamp || "n/a";
  const last = turns[turns.length - 1]?.timestamp || "n/a";
  const fileSize = fs.existsSync(SESSION_FILE)
    ? (fs.statSync(SESSION_FILE).size / 1024).toFixed(1) + " KB"
    : "0 KB";

  console.log(`
  Session: ${SESSION_NAME}
  ──────────────────────────
  Total turns:     ${turns.length}
  User turns:      ${userTurns.length}
  Assistant turns: ${assistantTurns.length}
  Total chars:     ${totalChars.toLocaleString()}
  File size:       ${fileSize}
  First entry:     ${first}
  Last entry:      ${last}
  `);
}

function cmdInfo() {
  console.log(`
  Session:  ${SESSION_NAME}
  File:     ${SESSION_FILE}
  Dir:      ${CLAW_DIR}
  `);
}

// ---------------------------------------------------------------------------
// Main REPL
// ---------------------------------------------------------------------------

async function main() {
  ensureDir(CLAW_DIR);

  console.log(`
  ╔════════════════════════════════════════╗
  ║         NanoClaw v2 — Earth Revibe    ║
  ╠════════════════════════════════════════╣
  ║  Session: ${SESSION_NAME.padEnd(28)}║
  ║  Type /help for commands              ║
  ║  Type 'exit' to quit                  ║
  ╚════════════════════════════════════════╝
  `);

  // Show existing session summary if resuming
  const existing = loadSession();
  if (existing.trim()) {
    const turns = parseTurns(existing);
    console.log(`  Resuming session with ${turns.length} existing turns.\n`);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "\n  you > ",
  });

  rl.prompt();

  rl.on("line", (line) => {
    const input = line.trim();
    if (!input) {
      rl.prompt();
      return;
    }

    // Exit
    if (input === "exit" || input === "quit" || input === "/exit") {
      console.log("\n  Session saved. Goodbye!\n");
      rl.close();
      process.exit(0);
    }

    // Commands
    if (input.startsWith("/")) {
      const parts = input.split(/\s+/);
      const cmd = parts[0].toLowerCase();
      const arg = parts.slice(1).join(" ");

      switch (cmd) {
        case "/help":
          cmdHelp();
          break;
        case "/clear":
          cmdClear();
          break;
        case "/history":
          cmdHistory();
          break;
        case "/sessions":
          cmdSessions();
          break;
        case "/branch":
          cmdBranch(arg);
          break;
        case "/search":
          cmdSearch(arg);
          break;
        case "/compact":
          cmdCompact();
          break;
        case "/export":
          cmdExport(arg || "md");
          break;
        case "/metrics":
          cmdMetrics();
          break;
        case "/info":
          cmdInfo();
          break;
        default:
          console.log(`  Unknown command: ${cmd}. Type /help for available commands.`);
      }
      rl.prompt();
      return;
    }

    // Regular input — save to session and invoke Claude Code
    appendToSession("user", input);

    try {
      console.log("\n  Thinking...\n");

      // Build the session context to send along with the prompt
      const sessionContext = loadSession();
      const turns = parseTurns(sessionContext);
      const recentTurns = turns.slice(-6); // last 3 exchanges for context
      const contextStr = recentTurns
        .map((t) => `[${t.role}]: ${t.content.slice(0, 500)}`)
        .join("\n");

      // Write prompt to a temp file to avoid shell escaping issues
      const tmpFile = path.join(CLAW_DIR, `_prompt_${SESSION_NAME}.tmp`);
      const fullPrompt = contextStr
        ? `Context from session "${SESSION_NAME}":\n${contextStr}\n\nUser question: ${input}`
        : input;
      fs.writeFileSync(tmpFile, fullPrompt, "utf-8");

      // Use child_process.execFileSync to call claude directly (avoids shell PATH issues)
      const { execFileSync } = require("child_process");
      const claudePath = process.platform === "win32"
        ? path.join(process.env.USERPROFILE || "", ".local", "bin", "claude.exe")
        : "claude";

      // Read the prompt from file and pass via stdin
      const promptContent = fs.readFileSync(tmpFile, "utf-8");
      const result = execFileSync(claudePath, ["-p", promptContent], {
        encoding: "utf-8",
        timeout: 120000,
        cwd: process.cwd(),
        stdio: ["pipe", "pipe", "pipe"],
      });

      // Clean up temp file
      try { fs.unlinkSync(tmpFile); } catch (_) {}

      const response = result.trim();
      appendToSession("assistant", response);
      console.log(`  assistant > ${response}\n`);
    } catch (err) {
      const errMsg = err.stdout?.trim() || err.message || "Unknown error";
      appendToSession("assistant", `[error] ${errMsg}`);
      console.log(`  [error] ${errMsg}\n`);
    }

    rl.prompt();
  });

  rl.on("close", () => {
    console.log("\n  Session saved. Goodbye!\n");
    process.exit(0);
  });
}

main().catch(console.error);
