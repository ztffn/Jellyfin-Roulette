# 🎰 Jellyfin-Roulette

**Spin the wheel, discover something new!**

A Jellyfin plugin that transforms playlist browsing into an exciting slot-machine experience. Click a playlist, hit "Surprise Me," and watch as movie posters spin past before landing on your next watch — complete with smooth animations, satisfying audio ticks, and confetti celebration!

![Version](https://img.shields.io/badge/version-2.1.1-blue)
![Jellyfin](https://img.shields.io/badge/jellyfin-10.8%2B-purple)
![.NET](https://img.shields.io/badge/.NET-8.0-512BD4)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

### 🎬 Slot Machine Animation
- **Dynamic resize**: Container morphs from playlist cover (landscape) to movie poster (portrait)
- **3-second spin**: Fast start → slow down → anticipation stutters → settle
- **Speed-based blur**: Up to 14px blur during high-speed spinning
- **Progress ring**: Purple/blue gradient shows animation progress
- **Audio feedback**: Satisfying tick sounds on each swap (rate-limited, synthesized audio)
- **Confetti burst**: 90 colorful pieces celebrate your selection
- **Glassmorphism UI**: Modern frosted glass effects with vignette

### 🎯 Smart Features
- **Playlist cover initial**: Shows your playlist's cover art before animation
- **Unwatched filtering**: Only shows movies you haven't seen yet
- **Instant response**: Animation starts immediately with resize (no delay)
- **Graceful fallback**: If no unwatched items, navigates to playlist view
- **Responsive design**: Adapts to desktop and mobile screens

### 🔧 Technical Highlights
- **Non-invasive**: Uses JavaScript injection, doesn't modify core Jellyfin files
- **Docker compatible**: Works with both Docker and native installations
- **Multi-path detection**: Automatically finds Jellyfin web client across different setups
- **Web Audio API**: Synthetic click sounds (no external audio files)
- **60fps animation**: Hardware-accelerated transforms for buttery smooth motion

## 📸 Screenshots

*(Add screenshots here showing the modal, animation, and final result)*

## 🚀 Quick Start

### Prerequisites

- Jellyfin 10.8.0 or later
- .NET 8.0 SDK (for building)
- Docker (optional, for container deployment)

### Installation

#### Option 1: Download Pre-built Release (Recommended)

1. Download the latest `Jellyfin.Plugin.PlaylistModal.dll` from [Releases](https://github.com/yourusername/Jellyfin-Roulette/releases)

2. Create plugin directory:
   ```bash
   mkdir -p /path/to/jellyfin/config/plugins/Playlist\ Modal_2.1.1.0/
   ```

3. Copy the DLL:
   ```bash
   cp Jellyfin.Plugin.PlaylistModal.dll /path/to/jellyfin/config/plugins/Playlist\ Modal_2.1.1.0/
   ```

4. Restart Jellyfin:
   ```bash
   # Docker
   docker restart jellyfin

   # Systemd
   sudo systemctl restart jellyfin
   ```

#### Option 2: Build from Source

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/Jellyfin-Roulette.git
   cd Jellyfin-Roulette
   ```

2. Build the plugin:
   ```bash
   cd Jellyfin.Plugin.PlaylistModal
   dotnet build
   ```

3. Deploy:
   ```bash
   mkdir -p /path/to/jellyfin/config/plugins/Playlist\ Modal_2.1.1.0/
   cp bin/Debug/net8.0/Jellyfin.Plugin.PlaylistModal.dll \
      /path/to/jellyfin/config/plugins/Playlist\ Modal_2.1.1.0/
   ```

4. Restart Jellyfin

### Verification

Check Jellyfin logs for successful loading:

```bash
# Docker
docker logs jellyfin | grep PlaylistModal

# Native
journalctl -u jellyfin | grep PlaylistModal
```

Expected output:
```
[INF] Jellyfin.Plugin.PlaylistModal.Plugin: JavaScript injected successfully into index.html
```

## 🎮 Usage

1. **Open Jellyfin** web interface in your browser

2. **Navigate to any playlist**

3. **Modal appears** showing:
   - Playlist cover in landscape format
   - "🍿 Surprise Me!" button
   - "🎞️ Show List" button

4. **Click "Surprise Me!"**:
   - Container smoothly reshapes to portrait
   - Slot animation begins immediately
   - Movie posters cycle with audio ticks
   - Settles on random unwatched movie with confetti
   - Title displays in gradient text
   - "▶️ Watch Now" navigates to item details

5. **Click "Show List"**: Opens normal playlist view

### Tips

- **Hard refresh** after installing: `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac)
- **Enable sound**: Make sure your browser volume is on to hear the satisfying ticks!
- **Empty playlists**: Plugin gracefully handles edge cases and shows appropriate messages

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│  Jellyfin Web Client (Browser)     │
│  ┌───────────────────────────────┐ │
│  │  playlistmodal.js             │ │
│  │  - Click interception         │ │
│  │  - Modal rendering            │ │
│  │  - Slot animation             │ │
│  │  - Audio synthesis            │ │
│  └───────────────────────────────┘ │
└─────────────┬───────────────────────┘
              │ HTTP REST API
┌─────────────▼───────────────────────┐
│  Jellyfin Server Plugin (C#)        │
│  ┌───────────────────────────────┐ │
│  │  Plugin.cs                    │ │
│  │  - JavaScript injection       │ │
│  │  - Multi-path detection       │ │
│  └───────────────────────────────┘ │
│  ┌───────────────────────────────┐ │
│  │  PlaylistModalController.cs  │ │
│  │  - Random item endpoint       │ │
│  │  - Unwatched filtering        │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Key Components

**Server-Side (C#)**
- `Plugin.cs` - Main plugin entry, handles JavaScript injection with multi-path fallback
- `PlaylistModalController.cs` - REST API endpoint for random unwatched item selection
- `Configuration/` - Plugin configuration (future use)

**Client-Side (JavaScript)**
- `playlistmodal.js` - Complete modal implementation (800+ lines)
  - Click interception using capture phase
  - Inline CSS for styling (no external dependencies)
  - Slot animation with easing and anticipation
  - Web Audio API for tick sounds
  - Canvas-based confetti animation
  - Responsive breakpoints

## 📋 API

### `GET /PlaylistModal/Random/{playlistId}?userId={userId}`

Returns a random unwatched item from the specified playlist.

**Parameters:**
- `playlistId` (path) - Playlist GUID
- `userId` (query) - User GUID

**Response:** `200 OK`
```json
{
  "Name": "The Matrix",
  "Id": "abc123...",
  "ImageTags": {
    "Primary": "tag123"
  },
  "UserData": {
    "Played": false
  }
}
```

**Response:** `404 Not Found`
```json
{
  "error": "No unwatched items found"
}
```

## 🛠️ Configuration

Currently v2.1.1 has no user-configurable options. The plugin is enabled automatically when installed.

**Future configuration options** (planned):
- Enable/disable audio
- Animation duration
- Supported media types (Movies, TV Shows, Music)
- Modal styling preferences

## 🔧 Development

### Project Structure

```
Jellyfin-Roulette/
├── Jellyfin.Plugin.PlaylistModal/
│   ├── Plugin.cs                      # Main plugin entry
│   ├── Api/
│   │   └── PlaylistModalController.cs # REST endpoint
│   ├── Configuration/
│   │   └── PluginConfiguration.cs     # Config model
│   ├── Web/
│   │   └── playlistmodal.js          # Client-side code
│   └── Jellyfin.Plugin.PlaylistModal.csproj
├── README.md
├── CHANGELOG.md
├── LICENSE
└── .gitignore
```

### Building

```bash
dotnet build
```

### Testing Locally

1. Build the plugin
2. Copy DLL to your Jellyfin plugins directory
3. Restart Jellyfin
4. Hard refresh browser
5. Click a playlist to test

### Debugging

**Server-side:**
```bash
# View Jellyfin logs
docker logs -f jellyfin | grep PlaylistModal
```

**Client-side:**
```javascript
// Browser console (F12)
// Check for plugin load message
[PlaylistModal] Plugin loaded (v2.1.1)
```

## 🐛 Troubleshooting

### Modal Not Appearing

1. **Hard refresh browser**: `Ctrl + Shift + R`
2. **Check browser console** (F12) for JavaScript errors
3. **Verify injection**:
   ```bash
   docker exec jellyfin grep -c "PlaylistModal Plugin Script" /jellyfin/jellyfin-web/index.html
   # Should return: 1
   ```

### No Audio

1. **Check browser volume** is on
2. **Verify browser audio context** initialized (requires user interaction)
3. **Check console** for audio initialization errors

### API Errors (401 Unauthorized)

1. **Verify logged into Jellyfin**
2. **Check API authentication** in browser developer tools
3. **Confirm ApiClient** is available globally

### Plugin Not Loading

1. **Check Jellyfin logs**:
   ```bash
   docker logs jellyfin 2>&1 | grep -i error | grep -i playlist
   ```

2. **Verify DLL location**:
   ```bash
   ls -la /path/to/jellyfin/config/plugins/Playlist\ Modal_2.1.1.0/
   ```

3. **Ensure correct version** folder name matches DLL version

## 📊 Compatibility

| Platform | Status | Notes |
|----------|--------|-------|
| Docker (Linux) | ✅ Tested | Primary development platform |
| Native Linux | ✅ Compatible | Multi-path detection handles paths |
| Windows | ✅ Compatible | Windows paths supported |
| macOS | ⚠️ Untested | Should work, needs verification |
| Jellyfin 10.8.x | ✅ Tested | Primary target version |
| Jellyfin 10.9.x | ⚠️ Untested | Likely compatible |

**Browsers:**
- Chrome/Edge: ✅ Fully supported
- Firefox: ✅ Fully supported
- Safari: ✅ Supported (Web Audio may vary)
- Mobile browsers: ✅ Responsive design

## 🗺️ Roadmap

### v2.2 (Planned)
- [ ] Configuration page for customization
- [ ] Adjustable animation speed
- [ ] Audio toggle option
- [ ] Custom modal themes

### v3.0 (Future)
- [ ] TV show support (random unwatched episode)
- [ ] Music playlist support (random track)
- [ ] Keyboard shortcuts (S for Surprise, L for List)
- [ ] Remember user preference per playlist
- [ ] Autoplay functionality (if feasible)

### v4.0 (Ideas)
- [ ] Multi-language support
- [ ] Playlist statistics in modal
- [ ] "Mark watched & next" quick action
- [ ] Integration with Jellyseerr for requests

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues, fork the repository, and create pull requests.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Build and test locally
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Style

- Follow C# conventions for server-side code
- Use ES6+ JavaScript for client-side code
- Comment complex logic
- Test on Docker and native installations

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built on [jellyfin-plugin-template](https://github.com/jellyfin/jellyfin-plugin-template)
- Inspired by [jellyfin-plugin-custom-javascript](https://github.com/johnpc/jellyfin-plugin-custom-javascript) injection pattern
- Slot machine animation concept inspired by classic casino games
- Jellyfin community for amazing media server platform

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/Jellyfin-Roulette/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/Jellyfin-Roulette/discussions)
- **Jellyfin Forum**: [Jellyfin Community](https://forum.jellyfin.org/)

## ⭐ Show Your Support

If you find Jellyfin-Roulette useful, please consider:
- ⭐ Starring the repository
- 🐛 Reporting bugs
- 💡 Suggesting new features
- 📖 Improving documentation
- 🔀 Contributing code

---

**Made with 🎲 for the Jellyfin community**

*Last updated: 2025-10-22 | Version 2.1.1*
