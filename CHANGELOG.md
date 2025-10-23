# Changelog

All notable changes to Jellyfin-Roulette will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-10-23

### Fixed

- Restore admin configuration page and client injection by resolving embedded-resource lookup regardless of namespace (`Jellyfin.Plugin.Roulette/Plugin.cs`).
- Align release metadata and documentation with the Roulette branding (README badge, manual install path).
- Bump client script identifier to surface the correct version in browser console.

## [1.0.0] - 2025-10-23

### Added

- First stable Roulette-branded release with full slot-machine UX polish, animated modal, and configuration UI.

## [0.9.5] - 2025-10-23

### Added

- Jellyfin dashboard configuration page for customizing animation timings, labels, and accessibility options.
- Keyboard navigation improvements including reroll shortcuts and focus handling.

## [0.9.2] - 2025-10-22

### Bug Fixes

- **Fixed focus trap in modal** - Keyboard navigation now stays within modal bounds
- **Prevented background keyboard events** - Arrow keys and other inputs no longer affect background elements
- **Added proper ARIA attributes** - Modal now has `role="dialog"` and `aria-modal="true"` for accessibility

### Technical Changes

- Implemented focus trapping with Tab/Shift+Tab cycling through modal elements only
- Added event capturing to block all keyboard events from reaching background
- Store and restore previously focused element on modal close
- Prevent arrow key propagation to background navigation

## [0.9.1] - 2025-10-22

### Bug Fixes

- **Fixed keyboard Enter key support** - Added autofocus to buttons and proper focus states
- **Fixed "Show List" navigation** - Now correctly navigates to playlist details with serverId parameter
- **Added stylish focus indicators** - Blue glow effect on focused buttons matching theme

### Technical Changes

- Added `autofocus` attribute to "Surprise Me!" and "Watch Now" buttons
- Added CSS focus styles with blue glow: `box-shadow: 0 0 0 3px rgba(67, 177, 236, 0.4)`
- Updated `handleShowList()` to use correct URL pattern: `/web/index.html#!/details?id={playlistId}&serverId={serverId}`

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

**Current Version**: v1.0.1
**Status**: Namespace Hotfix
**Repository**: https://github.com/ztffn/Jellyfin-Roulette
