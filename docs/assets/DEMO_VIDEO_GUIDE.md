# Demo Video/GIF Creation Guide

This guide will help you create a compelling demo video or GIF for Lumina to use in the README, Show HN post, and documentation.

## What to Show in the Demo

The demo should showcase the core workflow in 20-30 seconds:

1. **Dashboard Overview** (3 seconds)
   - Show the main dashboard with traces
   - Pan across to show model variety and cost data

2. **Trace Detail** (5 seconds)
   - Click into a trace
   - Show the prompt and response clearly
   - Highlight cost and latency

3. **Replay Feature** (10 seconds)
   - Navigate to Replay page
   - Select a trace or create replay set
   - Show the diff view with original vs new response
   - Highlight the semantic score

4. **Cost Analytics** (5 seconds)
   - Navigate to Cost page
   - Show cost breakdown by model
   - Highlight total spend

5. **Alerts** (5 seconds) - Optional
   - Show configured alert
   - Or show a triggered alert notification

## Recording Tools

### Mac

**Option 1: QuickTime (Built-in)**

```bash
# 1. Open QuickTime Player
# 2. File → New Screen Recording
# 3. Record the demo
# 4. Export as MOV file
```

**Option 2: Kap (Free, for GIFs)**

```bash
# Install via Homebrew
brew install --cask kap

# Then open Kap and record
# Exports directly to GIF
```

**Option 3: Gifski (Convert video to GIF)**

```bash
# Install
brew install gifski

# Convert MOV to GIF
gifski --width 1280 --quality 90 --fps 30 demo.mov -o demo.gif
```

### Windows

**Option 1: OBS Studio (Free)**

```bash
# Download from: https://obsproject.com/
# Set up screen capture
# Record and export as MP4
```

**Option 2: ScreenToGif (Free, native GIF)**

```bash
# Download from: https://www.screentogif.com/
# Record directly to GIF format
```

### Linux

**Option 1: Peek (Native GIF)**

```bash
# Ubuntu/Debian
sudo apt install peek

# Arch
sudo pacman -S peek
```

**Option 2: SimpleScreenRecorder**

```bash
sudo apt install simplescreenrecorder
```

## Recording Best Practices

### Before Recording:

1. **Clean up your screen**:
   - Close unnecessary applications
   - Hide desktop icons (if recording full screen)
   - Set browser zoom to 100%
   - Use a clean browser profile (no extensions visible)

2. **Prepare the data**:

   ```bash
   # Seed realistic demo data
   cd /Users/evansonigiri/Lumina/infra/scripts
   bun run seedData.ts
   ```

3. **Set up the recording area**:
   - Use 1280x800 or 1440x900 resolution
   - Consider recording just the browser window, not full screen
   - Position cursor visibly

4. **Test run**:
   - Do a practice run of the workflow
   - Ensure smooth transitions between pages
   - No hesitation or fumbling

### During Recording:

1. **Move deliberately**: Smooth, purposeful mouse movements
2. **No typos**: Any text entry should be clean
3. **Timing**: Don't rush, but keep it under 30 seconds
4. **Focus**: Show what matters, don't get distracted

### Recording Settings:

- **Frame rate**: 30 fps (60 fps for very smooth, but larger file)
- **Resolution**: 1280px wide (maximum)
- **Format**: GIF for README (easier to embed), MP4 for website
- **File size**: Aim for under 10MB for GIF, under 50MB for video

## Converting Video to GIF

If you record a video (MP4/MOV), convert to GIF for README:

### Using ffmpeg (All platforms):

```bash
# Install ffmpeg
# Mac: brew install ffmpeg
# Ubuntu: sudo apt install ffmpeg
# Windows: choco install ffmpeg

# Convert with optimal settings
ffmpeg -i demo.mp4 -vf "fps=30,scale=1280:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0 demo.gif
```

### Using gifski (Mac/Linux):

```bash
# Best quality GIF converter
gifski --width 1280 --quality 90 --fps 30 demo.mov -o demo.gif
```

### Using online tools:

- [ezgif.com](https://ezgif.com/video-to-gif) - Free, good quality
- [cloudconvert.com](https://cloudconvert.com/mp4-to-gif) - Free tier available

## Optimizing File Size

GIFs can be large. Optimize them:

### Using gifsicle:

```bash
# Install
brew install gifsicle  # Mac
sudo apt install gifsicle  # Linux

# Optimize
gifsicle -O3 --lossy=80 demo.gif -o demo-optimized.gif
```

### Using online tools:

- [ezgif.com/optimize](https://ezgif.com/optimize) - Free GIF optimizer

### Target sizes:

- **README GIF**: < 10 MB (GitHub has 10MB limit)
- **Video (if hosting elsewhere)**: < 50 MB
- **Ideal**: 3-5 MB for fast loading

## Demo Script

Follow this exact script for consistency:

```
0:00 - Dashboard view (showing 10+ traces)
0:03 - Click on a trace with GPT-4
0:05 - Trace detail showing prompt/response
0:08 - Navigate to Replay page
0:10 - Select trace, click "Create Replay"
0:12 - Replay diff view appears
0:15 - Highlight semantic score (e.g., 0.85)
0:18 - Scroll to show full diff
0:22 - Navigate to Cost page
0:25 - Show cost breakdown chart
0:28 - End on dashboard (full circle)
```

## Adding Demo to README

Once you have the demo file:

### For GIF:

```markdown
## Demo

![Lumina Demo](./docs/assets/demo.gif)
```

### For Video (hosted on YouTube/etc):

```markdown
## Demo

[![Watch Demo](./docs/assets/screenshots/dashboard-home.png)](https://www.youtube.com/watch?v=YOUR_VIDEO_ID)
```

Or use HTML for inline video:

```html
<video width="100%" controls>
  <source src="./docs/assets/demo.mp4" type="video/mp4" />
</video>
```

## Checklist Before Publishing

- [ ] Demo is < 30 seconds
- [ ] File size < 10MB for GIF
- [ ] Shows core workflow clearly
- [ ] No personal data visible
- [ ] No fumbling or hesitation
- [ ] Smooth transitions
- [ ] Realistic demo data (not "test test")
- [ ] Resolution is 1280px or 1440px wide
- [ ] Text is readable
- [ ] Tested that GIF loads on GitHub

## Where to Use the Demo

1. **README.md** - Hero section right after title
2. **Show HN post** - Link to video/GIF
3. **Documentation** - Getting started page
4. **Twitter/Social** - Short clips for promotion
5. **Website** - When you build one

## Example Demos for Inspiration

Look at these projects for demo inspiration:

- [Playwright](https://github.com/microsoft/playwright) - Clean, focused demos
- [Supabase](https://github.com/supabase/supabase) - Great GIFs showing features
- [Prisma](https://github.com/prisma/prisma) - Simple, effective demonstrations

## Tips for Great Demos

1. **Show, don't tell**: Let the product speak for itself
2. **Focus on value**: Show the problem being solved
3. **Keep it snappy**: Attention spans are short
4. **Loop it**: GIFs that loop smoothly are mesmerizing
5. **Add text overlays** (optional): Quick labels like "Real LLM call", "Semantic diff", etc.

---

**Ready to record?** Make sure you have:

- [ ] Dashboard running with demo data
- [ ] Recording tool installed and tested
- [ ] Demo script memorized
- [ ] Clean screen with no distractions
- [ ] 1-2 practice runs completed
