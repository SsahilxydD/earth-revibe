# Ruflo Guide — Earth Revibe

Your complete reference for using Ruflo on this project. Every command listed here is real and verified against Ruflo v3.5.14. All commands run from `c:/work/earth_revibe` unless noted.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Setup & Status](#setup--status)
3. [Agents](#agents)
4. [Swarms](#swarms)
5. [Hive Mind (Advanced Multi-Agent)](#hive-mind)
6. [Tasks](#tasks)
7. [Hooks & Self-Learning](#hooks--self-learning)
8. [Memory](#memory)
9. [Embeddings & Semantic Search](#embeddings--semantic-search)
10. [Code Analysis](#code-analysis)
11. [Security](#security)
12. [Neural & Performance](#neural--performance)
13. [MCP Server](#mcp-server)
14. [Configuration](#configuration)
15. [Earth Revibe Cheat Sheet](#earth-revibe-cheat-sheet)
16. [Troubleshooting](#troubleshooting)

---

## Quick Start

The fastest way to get Ruflo doing something useful:

```bash
# Ask Ruflo which agent to use for your task
ruflo hooks route --task "Add product review endpoint to the API"

# Spawn that agent to do the work
ruflo agent spawn -t coder

# Check what agents are running
ruflo agent list

# Search your codebase by meaning (not just text)
ruflo embeddings search -q "how does cart state sync across devices"
```

---

## Setup & Status

| Command | What it does |
|---------|-------------|
| `ruflo --version` | Shows installed version (currently v3.5.14) |
| `ruflo status` | Full system status — agents, swarms, memory, MCP, neural |
| `ruflo doctor` | Health check — diagnoses any setup problems with fix commands |
| `ruflo --list` | Lists all available commands |
| `ruflo config get` | Shows current configuration values |
| `ruflo config set <key> <value>` | Changes a config value |
| `ruflo providers` | Lists configured AI providers (Anthropic, OpenAI, etc.) |
| `ruflo completions` | Generates shell tab-completion scripts |

---

## Agents

Agents are specialized AI workers. You spawn one for a specific role and it does that job.

### Spawning Agents

```bash
# Spawn a coder agent to write implementation code
ruflo agent spawn -t coder

# Spawn a reviewer to do code review
ruflo agent spawn -t reviewer

# Spawn a tester to write tests
ruflo agent spawn -t tester

# Spawn an architect for design decisions
ruflo agent spawn -t architect

# Spawn a security specialist
ruflo agent spawn -t security-architect

# Spawn a performance engineer
ruflo agent spawn -t performance-engineer
```

### Managing Running Agents

| Command | What it does |
|---------|-------------|
| `ruflo agent list` | Lists all active agents and their status |
| `ruflo agent status <agent-id>` | Detailed status for a specific agent |
| `ruflo agent health` | Health check across all agents |
| `ruflo agent metrics` | Performance metrics for all agents |
| `ruflo agent logs <agent-id>` | Activity log for a specific agent |
| `ruflo agent stop <agent-id>` | Stop a running agent |
| `ruflo agent pool` | Manage the agent pool for scaling |

### Agent Types Available

The most useful agent types for Earth Revibe:

| Agent Type | Best used for |
|-----------|---------------|
| `architect` | Designing new features, writing ADRs, API contracts |
| `coder` | Writing implementation code |
| `reviewer` | Code review — security, style, correctness |
| `tester` | Writing unit, integration, and e2e tests |
| `security-architect` | Security audits, vulnerability analysis |
| `performance-engineer` | Profiling, bottleneck detection, optimization |
| `pr-manager` | Reviewing and managing pull requests |
| `issue-tracker` | Triaging and prioritizing GitHub issues |
| `release-manager` | Preparing releases and changelogs |
| `devops-engineer` | CI/CD, deployment, infrastructure |
| `documentation-writer` | Writing and updating docs |
| `debugger` | Diagnosing bugs and race conditions |

---

## Swarms

Swarms are coordinated groups of agents working together on a task. Use swarms for anything bigger than a single file or function.

### Starting a Swarm

```bash
# Initialize a V3 swarm (hierarchical-mesh, up to 15 agents)
ruflo swarm init --v3-mode

# Start a swarm with a specific objective and strategy
ruflo swarm start -o "Build the wishlist feature end-to-end" -s development

# Start with coordinated agents
ruflo swarm coordinate --agents 8

# Scale an active swarm up or down
ruflo swarm scale --count 6
```

### Swarm Strategies

| Strategy | What it does |
|----------|-------------|
| `development` | Architect → Coder → Reviewer → Tester pipeline |
| `research` | Deep analysis before implementation |
| `adaptive` | Ruflo decides the best approach based on the task |

### Swarm Commands

| Command | What it does |
|---------|-------------|
| `ruflo swarm init --v3-mode` | Initialize a fresh V3 swarm |
| `ruflo swarm start -o "..."` | Start swarm with an objective |
| `ruflo swarm status` | Check what all agents in the swarm are doing |
| `ruflo swarm stop` | Stop the swarm cleanly |
| `ruflo swarm scale --count N` | Change number of agents in swarm |
| `ruflo swarm coordinate --agents N` | V3 hierarchical mesh coordination |

### Practical Swarm Examples for Earth Revibe

```bash
# Build a full feature (API + storefront + tests)
ruflo swarm init --v3-mode
ruflo swarm start -o "Build product reviews: API endpoints, storefront UI, admin moderation panel" -s development

# Large refactor across multiple files
ruflo swarm init --v3-mode
ruflo swarm start -o "Refactor all Express controllers to use centralized error handler" -s adaptive

# Security-focused pass
ruflo swarm init --v3-mode
ruflo swarm start -o "Security audit of all payment and auth flows" -s research
```

---

## Hive Mind

Hive Mind is the most powerful coordination mode — a queen agent leads worker agents with consensus-based decision making. Use this for the most complex, multi-day tasks.

```bash
# Initialize a hive with hierarchical-mesh topology
ruflo hive-mind init -t hierarchical-mesh

# Spawn 5 worker agents into the hive
ruflo hive-mind spawn -n 5

# Spawn workers AND launch Claude Code with hive mind context
ruflo hive-mind spawn --claude -o "Implement Phase 3: Storefront Core"

# Submit a task to the hive (queen assigns it to the best worker)
ruflo hive-mind task -d "Build the cart persistence system with cross-device sync"

# Check hive status
ruflo hive-mind status

# Broadcast a message to all workers (useful for setting constraints)
ruflo hive-mind broadcast "Prioritize type safety — use zod validation on all inputs"

# Have the hive reach consensus on a decision
ruflo hive-mind consensus

# Access shared memory across all hive agents
ruflo hive-mind memory

# Optimize hive memory and patterns
ruflo hive-mind optimize-memory

# Shut down the hive cleanly
ruflo hive-mind shutdown
```

---

## Tasks

Tasks are units of work you create and assign to agents or swarms.

```bash
# Create a new implementation task
ruflo task create -t implementation -d "Add bulk stock update endpoint to admin API"

# Create a bug fix task
ruflo task create -t bugfix -d "Fix race condition in cart quantity update"

# List all pending and running tasks
ruflo task list

# List every task including completed and cancelled
ruflo task list --all

# Check status and details of a specific task
ruflo task status <task-id>

# Assign a task to a specific agent
ruflo task assign <task-id> --agent coder-1

# Cancel a task
ruflo task cancel <task-id>

# Retry a failed task
ruflo task retry <task-id>
```

---

## Hooks & Self-Learning

Hooks are how Ruflo learns your patterns over time. The more you use them, the smarter routing gets.

### Intelligence & Routing

```bash
# Route a task to the best agent (use this before spawning)
ruflo hooks route --task "Add Razorpay webhook signature verification"

# Same but with full explanation of why it chose that agent
ruflo hooks route --task "Add Razorpay webhook signature verification" --include-explanation

# Check what Ruflo has learned about your codebase
ruflo hooks intelligence --status

# View full learning metrics dashboard
ruflo hooks metrics --v3-dashboard
```

### Pre-Training (Run This to Bootstrap or Refresh)

```bash
# Deep scan of your entire codebase — run this after adding lots of new files
ruflo hooks pretrain --depth deep

# After pretraining, generate optimized agent configs from what was learned
ruflo hooks build-agents
```

When to re-run pretrain:
- Monthly
- After completing a major phase
- When routing starts suggesting the wrong agents

### Lifecycle Hooks (Use These for Maximum Learning)

These teach Ruflo what works in your project. The more you use them, the better the routing gets.

```bash
# Before editing a file — get context and suggestions
ruflo hooks pre-edit -f apps/api/src/services/order.service.ts

# After editing — record the outcome so Ruflo learns
ruflo hooks post-edit -f apps/api/src/services/order.service.ts

# Before running a shell command — assess risk
ruflo hooks pre-command "pnpm db:push"

# After running a command — record what happened
ruflo hooks post-command "pnpm db:push"

# When starting a task — record it and get agent suggestion
ruflo hooks pre-task --task "Implement referral code generation"

# When finishing a task — record outcome for learning
ruflo hooks post-task --task "Implement referral code generation" --outcome success
```

### Coverage-Aware Routing

```bash
# Route a task considering which areas have test coverage gaps
ruflo hooks coverage-route --task "Add loyalty points calculation"

# Suggest where test coverage is missing for a file
ruflo hooks coverage-suggest apps/api/src/services/loyalty.service.ts

# List all coverage gaps with priority scores
ruflo hooks coverage-gaps
```

### Token & Model Optimization

```bash
# Optimize token usage for a task (saves 30-50% on API costs)
ruflo hooks token-optimize --task "Refactor cart service"

# Route to the cheapest Claude model that can handle the task
ruflo hooks model-route --task "Fix typo in error message"
# → routes to haiku (fast, cheap)
ruflo hooks model-route --task "Design the multi-tenant architecture"
# → routes to opus (most capable)

# View model routing stats and how accurate routing has been
ruflo hooks model-stats
```

### Transfer & Sessions

```bash
# Save current session state
ruflo hooks session-end

# Restore a previous session
ruflo hooks session-restore

# Transfer learned patterns to another project
ruflo hooks transfer /path/to/other-project
```

---

## Memory

Ruflo's memory persists what agents learn across sessions. Think of it as a shared brain for all agents on your project.

```bash
# Store something in memory manually
ruflo memory store -k "razorpay-webhook-pattern" -v "Always verify X-Razorpay-Signature header first"

# Retrieve a specific key
ruflo memory retrieve -k "razorpay-webhook-pattern"

# Search memory semantically (finds related entries, not just exact key)
ruflo memory search -q "auth token patterns"

# List everything in memory
ruflo memory list

# Memory stats — size, number of entries, namespaces
ruflo memory stats

# Delete an entry
ruflo memory delete -k "razorpay-webhook-pattern"

# Export memory to file (for backup or sharing)
ruflo memory export -o .ruflo-memory-backup.json

# Import memory from file
ruflo memory import -f .ruflo-memory-backup.json

# Clean up stale and expired entries
ruflo memory cleanup

# Compress and optimize storage
ruflo memory compress
```

---

## Embeddings & Semantic Search

The most underrated feature. Search your entire codebase by meaning, not just text matching. Powered by HNSW vector search — extremely fast.

```bash
# Search codebase semantically — ask it like a question
ruflo embeddings search -q "how does cart state persist across page refreshes"
ruflo embeddings search -q "where is JWT token validation happening"
ruflo embeddings search -q "razorpay payment verification logic"
ruflo embeddings search -q "which services call the Prisma client directly"
ruflo embeddings search -q "how are product images uploaded to Cloudinary"

# Generate an embedding for a piece of text
ruflo embeddings generate -t "JWT access token refresh rotation"

# Compare semantic similarity between two pieces of text
ruflo embeddings compare -a "cart persistence" -b "session storage"

# Chunk a long document for embedding (useful before feeding to agents)
ruflo embeddings chunk -t "Long document text..."

# Warmup the model for faster subsequent searches
ruflo embeddings warmup

# Benchmark embedding performance
ruflo embeddings benchmark

# List available embedding models
ruflo embeddings models
```

---

## Code Analysis

Static analysis that understands your codebase structure. Runs locally — no AI credits used.

```bash
# Analyze AST structure of a directory
ruflo analyze ast apps/api/src/

# Find high-complexity files (threshold = cyclomatic complexity score; 10+ is worth reviewing)
ruflo analyze complexity apps/api/src/ --threshold 10

# Extract all functions from a directory
ruflo analyze symbols apps/api/src/ --type function

# Extract all classes
ruflo analyze symbols apps/api/src/ --type class

# Analyze imports and what depends on what
ruflo analyze imports apps/api/src/

# List all external npm dependencies used in a directory
ruflo analyze imports apps/api/src/ --external

# Find natural module boundaries using MinCut algorithm
ruflo analyze boundaries apps/api/src/

# Detect module communities — what groups together naturally
ruflo analyze modules apps/api/src/

# Find circular dependencies (a common source of bugs)
ruflo analyze circular apps/api/src/

# Export full dependency graph in DOT format (paste into graphviz to visualize)
ruflo analyze dependencies apps/api/src/ --format dot

# Analyze a git diff for change risk before pushing
ruflo analyze diff --risk

# Check for dependency vulnerabilities
ruflo analyze deps --security
```

---

## Security

```bash
# Full security scan of a directory
ruflo security scan --target apps/api/src/

# Check for known CVEs in your dependencies
ruflo security cve --list

# Full threat modeling analysis
ruflo security threats

# Detect secrets accidentally committed (API keys, tokens, passwords)
ruflo security secrets

# Security audit log and compliance report
ruflo security audit

# AI defense — detect prompt injection in user-provided inputs
ruflo security defend
```

### Useful Security Combos for Earth Revibe

```bash
# Full API security check before a release
ruflo security scan --target apps/api/src/ && ruflo security cve --list && ruflo security secrets

# Spawn a security agent for deep analysis of a specific area
ruflo agent spawn -t security-architect
ruflo task create -t security -d "Audit Razorpay webhook handler — verify signature check, replay attack prevention, and idempotency"

# Threat model for a new sensitive feature
ruflo agent spawn -t security-architect
ruflo task create -t security -d "Threat model the referral code redemption flow for abuse vectors"
```

---

## Neural & Performance

### Neural Patterns

Ruflo uses WASM-based neural patterns to improve its own routing accuracy over time.

```bash
# Check neural network status
ruflo neural status

# Train neural patterns (improves routing accuracy over time)
ruflo neural train -p coordination

# List what patterns have been learned
ruflo neural patterns --action list

# Optimize neural patterns (quantization + compression = faster, smaller)
ruflo neural optimize

# Benchmark WASM neural performance
ruflo neural benchmark
```

### Performance

```bash
# Run performance benchmarks on the project
ruflo performance benchmark

# Profile the application
ruflo performance profile

# View performance metrics
ruflo performance metrics

# Get optimization recommendations
ruflo performance optimize

# Find bottlenecks automatically
ruflo performance bottleneck
```

---

## MCP Server

The MCP server connects Ruflo to Claude Code. It's what makes Ruflo tools appear inside your Claude Code sessions. The `.mcp.json` in the project root auto-connects when you open the project in Claude Code.

```bash
# Start the MCP server manually (if tools aren't showing in Claude Code)
ruflo mcp start

# Start on a specific port
ruflo mcp start -t http -p 8080

# Check if MCP server is running
ruflo mcp status

# Health check
ruflo mcp health

# List all MCP tools available to Claude Code
ruflo mcp tools

# Restart the server
ruflo mcp restart

# Stop the server
ruflo mcp stop

# View MCP server logs (useful for debugging connection issues)
ruflo mcp logs
```

If Ruflo tools are missing in a Claude Code session: run `ruflo mcp start` then restart Claude Code.

---

## Configuration

```bash
# Show all current config values
ruflo config get

# Set a specific config value
ruflo config set maxAgents 8

# Export config to file (backup)
ruflo config export -o ruflo-config-backup.json

# Import config from file
ruflo config import -f ruflo-config-backup.json

# Reset to defaults
ruflo config reset

# Upgrade Ruflo while keeping all your data and learned patterns
ruflo init upgrade

# Upgrade AND install any new skills and agents added in the new version
ruflo init upgrade --add-missing
```

---

## Earth Revibe Cheat Sheet

Quick reference for the most common daily tasks on this project.

### Start of Day

```bash
ruflo status         # Check system is healthy
ruflo agent list     # Check what agents are running
```

### Before Working on Any Task

```bash
# Always route first — find the right agent
ruflo hooks route --task "YOUR TASK HERE" --include-explanation

# Search codebase to understand existing patterns before writing new code
ruflo embeddings search -q "similar feature or concept"
```

### Working on the API (apps/api)

```bash
ruflo hooks route --task "Add bulk stock update endpoint" --include-explanation
ruflo agent spawn -t coder

# For security-sensitive work
ruflo agent spawn -t security-architect

# Find complex files before editing
ruflo analyze complexity apps/api/src/ --threshold 10

# Check for circular deps after adding new imports
ruflo analyze circular apps/api/src/
```

### Working on the Storefront (apps/storefront)

```bash
ruflo hooks route --task "Add wishlist toggle to ProductCard" --include-explanation
ruflo agent spawn -t coder

# Find how an existing component works
ruflo embeddings search -q "ProductCard component structure"
ruflo analyze symbols apps/storefront/src/ --type function
```

### Working on the Admin (apps/admin)

```bash
ruflo hooks route --task "Add export to CSV on orders table" --include-explanation
ruflo agent spawn -t coder

# Find circular dependencies before adding new imports
ruflo analyze circular apps/admin/src/
```

### Running a Full Phase Plan

```bash
# Best approach for large phases — hive mind with Claude Code
ruflo hive-mind init -t hierarchical-mesh
ruflo hive-mind spawn --claude -o "Implement Phase 3 Storefront Core as described in docs/plans/2026-03-05-phase3-storefront-core.md"

# For medium phases — swarm
ruflo swarm init --v3-mode
ruflo swarm start -o "Implement Phase 4 Admin Core as described in the spec" -s development
```

### Phase → Strategy Quick Reference

| Phase | Recommended approach |
|-------|---------------------|
| Phase 1 — Foundation | `ruflo swarm start -o "..." -s development` on packages/ |
| Phase 2 — API Core | `ruflo hive-mind spawn --claude -o "..."` |
| Phase 3 — Storefront Core | `ruflo swarm start -o "..." -s development` |
| Phase 4 — Admin Core | `ruflo swarm start -o "..." -s development` |
| Phase 5 — Cart & Checkout | `ruflo hive-mind init` + spawn (cross-app) |
| Phase 6 — Admin Orders | `ruflo swarm start -o "..." -s development` |
| Phase 7 — User Features | `ruflo swarm start -o "..." -s development` |
| Phase 8 — Loyalty & Referrals | `ruflo hive-mind init` + spawn (cross-app) |
| Phase 9 — Blog & Support | `ruflo swarm start -o "..." -s development` |
| Phase 10 — Analytics & SEO | `ruflo swarm start -o "..." -s development` |
| Phase 11 — Testing & Security | `ruflo security scan` + `ruflo agent spawn -t tester` |

### Code Review Before Commit

```bash
ruflo analyze diff --risk                  # Risk assessment of your changes
ruflo agent spawn -t reviewer
ruflo task create -t review -d "Review changes in FILE"
```

### Security Audit

```bash
ruflo security scan --target apps/api/src/
ruflo security cve --list
ruflo security secrets
```

### Test Generation

```bash
ruflo agent spawn -t tester
ruflo task create -t testing -d "Write unit tests for apps/api/src/services/loyalty.service.ts covering all point calculation edge cases"
```

### Performance Check

```bash
ruflo performance bottleneck
ruflo analyze complexity apps/api/src/ --threshold 10
ruflo embeddings search -q "slow database query"
```

### Monthly Maintenance

```bash
ruflo hooks pretrain --depth deep      # Refresh codebase intelligence
ruflo hooks build-agents               # Rebuild optimized agent configs
ruflo memory cleanup                   # Remove stale memory entries
ruflo memory compress                  # Compress memory storage
ruflo security cve --list              # Check for new CVEs
ruflo performance benchmark            # Track performance over time
ruflo neural optimize                  # Compress neural patterns
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `ruflo: command not found` | `npm install -g ruflo@latest` |
| MCP tools not showing in Claude Code | `ruflo mcp start` then restart Claude Code |
| Agent ignores your project conventions | `ruflo hooks pretrain --depth deep` then `ruflo hooks build-agents` |
| Routing suggests the wrong agent | `ruflo hooks route --task "..." --include-explanation` to debug, then re-pretrain |
| `npx ruflo@v3alpha` gives an error | Use `ruflo` (global install) — the v3alpha npm tag doesn't exist |
| Swarm agents go off-task | Keep `maxAgents` at 6 in `ruflo.config.json`, confirm `antiDrift: true` |
| Memory seems wrong or stale | `ruflo memory cleanup && ruflo memory compress` |
| MCP server crashes or disconnects | `ruflo mcp logs` to diagnose, then `ruflo mcp restart` |
| `ruflo doctor` shows warnings | Run the fix command it suggests for each warning |
| High token costs | `ruflo hooks token-optimize --task "..."` before spawning + `ruflo hooks model-route --task "..."` |
| Wrong Claude model being used | `ruflo hooks model-stats` to review routing accuracy |
| Agent pool exhausted | `ruflo agent pool` to check, then `ruflo swarm scale --count N` to adjust |
