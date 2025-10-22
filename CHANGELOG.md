# Changelog

All notable changes to Jellyfin-Roulette will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.0] - 2025-10-22

### Initial Public Release

First public release of Jellyfin-Roulette, a plugin that adds slot machine animation to Jellyfin playlists.

#### Features Added
- **Slot machine animation** for selecting random unwatched items
- **Dynamic container resize** from playlist cover (landscape) to movie poster (portrait)
- **Audio feedback** with synthesized tick sounds during animation
- **Visual effects**: speed-based blur, progress ring, anticipation stutters, confetti burst
- **Playlist cover display** as initial image before animation
- **Smart filtering** to show only unwatched items
- **Responsive design** with mobile breakpoints

#### Technical Implementation
- C# .NET 8.0 Jellyfin plugin with JavaScript injection pattern
- REST API endpoint: `GET /PlaylistModal/Random/{playlistId}?userId={userId}`
- Client-side Web Audio API for tick sounds (no external audio files)
- 60fps hardware-accelerated animations using requestAnimationFrame
- Multi-path detection for Docker and native Jellyfin installations
- Inline CSS for zero external dependencies

#### User Experience
- Click playlist → Modal shows playlist cover with two buttons
- "Surprise Me" → Smooth resize + slot animation + audio ticks → confetti + title reveal
- "Show List" → Normal playlist view
- Graceful handling of empty playlists and no unwatched items

#### Known Limitations
- No autoplay functionality (navigates to item details page instead)
- Uses browser confirm for fallback messages (not yet Jellyfin-styled alerts)
- Optimized for movie playlists (TV shows and music not yet supported)

---

## Roadmap

### v1.0.0 (Planned)
Public announcement and first stable release after community testing.

### Future Versions
- Configuration page for customization
- TV show and music playlist support
- Keyboard shortcuts
- Autoplay functionality (if feasible)
- Multi-language support

---

**Current Version**: v0.9.0
**Status**: Initial Public Release
**Repository**: https://github.com/ztffn/Jellyfin-Roulette
