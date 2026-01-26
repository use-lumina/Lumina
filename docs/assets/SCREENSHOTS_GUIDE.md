# Screenshots Guide for Lumina

This guide outlines what screenshots we need and how to take them for the best visual presentation.

## Screenshots Needed

### 1. Dashboard Overview (Homepage)

**File name**: `dashboard-home.png`
**What to show**:

- Main dashboard with traces list
- Show 10-15 recent traces with variety of models (GPT-4, Claude, etc.)
- Cost and latency columns visible
- Clean, professional data (no test garbage data)

**Where it will be used**:

- README.md (main hero section)
- Documentation homepage
- Show HN post

### 2. Trace Detail View

**File name**: `trace-detail.png`
**What to show**:

- Single trace detail page
- Show prompt and response clearly
- Metadata visible (model, tokens, cost, latency)
- Tags and custom metadata if any

**Where it will be used**:

- Documentation (Quickstart guide)
- Feature showcase

### 3. Cost Analytics

**File name**: `cost-analytics.png`
**What to show**:

- Cost page with breakdown by model
- Charts showing cost over time
- Total spend visible
- Model comparison

**Where it will be used**:

- README features section
- Documentation

### 4. Replay Testing Workflow

**File name**: `replay-testing.png`
**What to show**:

- Replay session with diff view
- Original vs new response comparison
- Semantic score visible
- Highlight the diff clearly

**Where it will be used**:

- README (key feature highlight)
- Show HN post
- Documentation

### 5. Alerts Configuration

**File name**: `alerts-config.png`
**What to show**:

- Alert rules configured
- Threshold settings visible
- Webhook endpoints configured

**Where it will be used**:

- Documentation
- Feature list

### 6. Alert Detail/Triggered Alert

**File name**: `alert-triggered.png`
**What to show**:

- Actual triggered alert
- Show what caused it (cost spike or quality degradation)
- Timeline of events

**Where it will be used**:

- Documentation
- Show HN post

## How to Take Good Screenshots

### Before Taking Screenshots:

1. **Seed realistic data**:

   ```bash
   cd infra/scripts
   bun run seedData.ts
   ```

2. **Start all services**:

   ```bash
   # Make sure all services are running
   docker-compose up -d
   # Or if running locally:
   # Ingestion, Query, Replay services + Dashboard
   ```

3. **Access dashboard**: `http://localhost:3000`

### Screenshot Best Practices:

1. **Window Size**: Use consistent window size (1920x1080 or 1440x900)
2. **Browser**: Use Chrome/Firefox with clean UI (no extensions visible)
3. **Zoom Level**: 100% zoom (Cmd/Ctrl + 0)
4. **Time of Day**: Use light mode or dark mode consistently
5. **Data Quality**:
   - Use realistic model names (gpt-4, claude-sonnet-4-5, etc.)
   - Show varied costs ($0.01 - $2.00 range)
   - Show different latencies (100ms - 5000ms)
   - Use meaningful prompts/responses (not "test test test")

### Taking the Screenshot:

1. **Mac**: `Cmd + Shift + 4` then select area
2. **Windows**: Windows Key + Shift + S
3. **Linux**: Use built-in screenshot tool

### After Taking Screenshots:

1. **Crop appropriately**: Remove unnecessary whitespace
2. **Optimize file size**: Use PNG for UI screenshots
3. **Name consistently**: Use the file names listed above
4. **Store in**: `/docs/assets/screenshots/`

## Screenshot Checklist

Before committing screenshots, verify:

- [ ] No personal/sensitive data visible
- [ ] No placeholder "TODO" text visible in UI
- [ ] Consistent theme (light or dark) across all screenshots
- [ ] High resolution (at least 1440px wide)
- [ ] Clear, readable text
- [ ] Realistic data (no "test 123" garbage)
- [ ] Browser chrome/URL bar not visible (unless necessary)

## Using Screenshots in Documentation

### In README.md:

```markdown
## Dashboard Preview

![Lumina Dashboard](./docs/assets/screenshots/dashboard-home.png)

## Replay Testing

![Replay Testing](./docs/assets/screenshots/replay-testing.png)
```

### In Documentation:

```markdown
After starting Lumina, you'll see the dashboard:

![Dashboard Overview](../assets/screenshots/dashboard-home.png)
```

## Demo GIF/Video Requirements

For the demo GIF, record:

1. Opening the dashboard
2. Viewing a trace detail
3. Starting a replay session
4. Comparing the diff results
5. Viewing the semantic score

**Tools for recording**:

- Mac: QuickTime Screen Recording → convert to GIF with gifski
- Windows: OBS Studio → convert to GIF
- Linux: Peek or SimpleScreenRecorder

**GIF Requirements**:

- Max 10MB file size
- 60 fps or 30 fps
- 1280px wide max
- 10-30 seconds long
- Show actual workflow, not just clicking around

## Next Steps

Once screenshots are taken:

1. Place them in `/docs/assets/screenshots/`
2. Update README.md with embedded images
3. Update documentation pages with relevant screenshots
4. Add demo GIF to README hero section
5. Test that all images load correctly on GitHub
