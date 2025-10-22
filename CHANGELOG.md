# Changelog

All notable changes to the Jellyfin Playlist Modal Plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-22

### Added
- Initial release of Jellyfin Playlist Modal Plugin
- Playlist click interception with multiple detection methods (anchor tags, data attributes, hash URLs)
- Browser confirm modal for "Surprise Me" vs "Show List" options
- REST API endpoint: `GET /PlaylistModal/Random/{playlistId}?userId={userId}`
- Random unwatched item selection from playlists
- Navigation to item details page on "Surprise Me"
- Normal playlist navigation on "Show List"
- Graceful error handling for empty playlists and no unwatched items
- Multi-path fallback for JavaScript injection (Docker and native installations)
- Comprehensive logging for troubleshooting
- BaseItemDto serialization for proper API responses

### Technical Decisions
- JavaScript injection pattern for UI modification (non-invasive)
- Event capture phase for click interception (before other handlers)
- Browser confirm dialog for v1.0 (simple, reliable UX)
- Navigation to details page instead of autoplay (playbackManager scope limitation)
- Clean, production-ready code (no debug spam, no experimental attempts)

### Known Limitations
- No autoplay functionality (user must click play button on details page)
  - Reason: playbackManager is in bundled module scope, not globally accessible
  - May be addressed in future versions
- Uses native browser confirm() dialog instead of Jellyfin-styled modal
  - Will be improved in Phase 3
- Optimized for movie playlists only
  - TV show and music support planned for future releases

## [Unreleased]

### Planned Features
- Jellyfin-styled modal dialog (Phase 3)
- Configuration page for admin settings
- TV show playlist support (random unwatched episode)
- Music playlist support (random unplayed track)
- Autoplay functionality (direct playback without details page navigation)
- Keyboard shortcuts (S for Surprise, L for List)
- Playlist statistics in modal (X unwatched of Y total)
- Remember user preference per playlist
- "Mark watched & next" quick action
- Multi-language support

---

## Development Timeline

### 2025-10-21 - Phase 1: Proof of Concept
- Cloned and configured jellyfin-plugin-template
- Renamed project to PlaylistModal
- Implemented JavaScript injection in Plugin.cs
- Created client-side JavaScript (playlistmodal.js)
- Fixed StyleCop and analyzer issues
- Successfully built plugin (19KB DLL)
- Deployed to Jellyfin Docker container
- Verified JavaScript injection working

### 2025-10-21 - Phase 2: Server-Side Logic
- Created PlaylistModalController.cs API endpoint
- Implemented random unwatched item selection logic
- Added ILibraryManager, IUserManager, IDtoService dependencies
- Fixed BaseItem vs BaseItemDto serialization issue
- Integrated API with client-side JavaScript
- Added authentication handling with ApiClient.getJSON()
- Tested API endpoint successfully

### 2025-10-22 - v1.0 Clean Production Release
- Removed all autoplay attempts (not feasible in v1.0)
- Removed excessive debug logging
- Created clean, production-ready code
- Simplified user flow: navigate to details page (user clicks play)
- Verified deployment and functionality
- Created comprehensive documentation (README, CHANGELOG)
- Updated project status in scratchpad

---

## Version History Summary

| Version | Date       | Status    | Key Features                          |
|---------|------------|-----------|---------------------------------------|
| 1.0.0   | 2025-10-22 | Stable    | Initial release, core functionality   |
| 2.0.0   | TBD        | Planned   | Jellyfin-styled modal, configuration  |
| 3.0.0   | TBD        | Planned   | TV shows, music, autoplay support     |

---

## Migration Guide

### Upgrading from Pre-Release to v1.0.0

No migration needed - this is the first stable release.

### Future Upgrades

Upgrade instructions will be provided when new versions are released.

---

**Current Version**: v1.0.0
**Status**: Production Ready ✅
**Last Updated**: 2025-10-22
