# Jellyfin Playlist Modal Plugin - Design Document

**Status**: v1.0.0 Production Release ✅
**Last Updated**: 2025-10-22

## Project Overview

A Jellyfin plugin that intercepts playlist clicks in the web UI and presents a modal dialog with two options:
1. **Surprise Me** - Navigates to a random unwatched item from the playlist
2. **Show List** - Shows the normal playlist view (default behavior)

**v1.0 Implementation Note**: Current version navigates to item details page (user clicks play button). Automatic playback was not feasible in v1.0 due to playbackManager being in bundled module scope, but may be addressed in future versions.

## Goals

- Enhance the playlist user experience with a "random unwatched" feature
- Provide a seamless, native-feeling modal interface
- Maintain compatibility with existing Jellyfin functionality
- Support movie playlists (can be extended to TV shows later)

## Requirements

### Functional Requirements
- FR1: Intercept playlist navigation clicks before default behavior
- FR2: Display a modal dialog with two clearly labeled options
- FR3: "Surprise Me" button selects and plays a random unwatched item from the playlist
- FR4: "Show List" button proceeds with normal playlist navigation
- FR5: Handle edge cases (no unwatched items, empty playlists, etc.)
- FR6: Modal should be dismissible (ESC key, click outside, close button)

### Non-Functional Requirements
- NFR1: Modal should match Jellyfin's native UI styling and theme
- NFR2: Fast response time (<1s for random item selection)
- NFR3: No modification of core Jellyfin files (use injection pattern)
- NFR4: Compatible with Jellyfin 10.8.x and later

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Jellyfin Web Client                   │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Injected JavaScript (Client-Side)                 │ │
│  │  - Event listener for playlist clicks              │ │
│  │  - Modal rendering logic                           │ │
│  │  - Navigation interception                         │ │
│  │  - API calls to server plugin                      │ │
│  └────────────────┬───────────────────────────────────┘ │
└───────────────────┼─────────────────────────────────────┘
                    │ HTTP/REST API
                    │
┌───────────────────▼─────────────────────────────────────┐
│              Jellyfin Server Plugin (C#)                 │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  JavaScript Injection Module                       │ │
│  │  - Injects client script into index.html          │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  API Controller                                     │ │
│  │  - GET /PlaylistModal/Random/{playlistId}          │ │
│  │  - Returns random unwatched item                   │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Playlist Service                                   │ │
│  │  - Queries playlist items via Jellyfin API        │ │
│  │  - Filters by IsPlayed=false                       │ │
│  │  - Selects random item from results                │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Technology Stack

**Server-Side:**
- Language: C# (.NET 8.0)
- Framework: Jellyfin Plugin API
- Pattern: Based on `jellyfin-plugin-custom-javascript` approach

**Client-Side:**
- Language: Vanilla JavaScript (ES6+)
- UI Framework: Native Jellyfin web components
- Modal: Custom implementation using Jellyfin's dialog classes

## Technical Approach

### 1. Server-Side Plugin (C#)

#### Plugin Structure
```
Jellyfin.Plugin.PlaylistModal/
├── Plugin.cs                          # Main plugin entry point
├── Configuration/
│   ├── PluginConfiguration.cs        # Configuration model
│   └── configPage.html               # Admin configuration page
├── Api/
│   └── PlaylistModalController.cs    # REST API endpoints
├── Services/
│   └── RandomItemService.cs          # Business logic for random selection
└── Web/
    └── playlistmodal.js              # Injected client-side script
```

#### Key Implementation Details

**JavaScript Injection:**
- Modify `/usr/share/jellyfin/web/index.html` to include script tag
- Handle Docker permission issues (mount index.html if needed)
- Inject on plugin startup and configuration changes

**API Endpoint:**
```csharp
[HttpGet("Random/{playlistId}")]
public async Task<ActionResult<BaseItemDto>> GetRandomUnwatchedItem(
    Guid playlistId,
    Guid userId)
{
    // 1. Get playlist items with IsPlayed=false filter
    // 2. If no unwatched items, return 404 or fallback
    // 3. Select random item from results
    // 4. Return item details
}
```

**Jellyfin API Integration:**
```csharp
// Use Jellyfin's library manager to get playlist items
var query = new InternalItemsQuery(user)
{
    ParentId = playlistId,
    IsPlayed = false,
    Recursive = true,
    IncludeItemTypes = new[] { BaseItemKind.Movie },
    OrderBy = new[] { (ItemSortBy.Random, SortOrder.Ascending) },
    Limit = 1
};
```

### 2. Client-Side JavaScript

#### Event Interception Strategy

**Option A: Click Event Listener (Preferred)**
```javascript
// Intercept clicks on playlist items
document.addEventListener('click', (e) => {
    const playlistLink = e.target.closest('[data-type="Playlist"]');
    if (playlistLink) {
        e.preventDefault();
        e.stopPropagation();
        showPlaylistModal(playlistId);
    }
}, true); // Use capture phase
```

**Option B: Navigation Hook**
```javascript
// Intercept navigation state changes
const originalPushState = history.pushState;
history.pushState = function(state, title, url) {
    if (url.includes('/playlists')) {
        showPlaylistModal(extractPlaylistId(url));
        return;
    }
    return originalPushState.apply(this, arguments);
};
```

#### Modal Implementation

```javascript
function showPlaylistModal(playlistId) {
    // Create modal using Jellyfin's dialog classes
    const dialog = createDialog({
        title: 'Open Playlist',
        content: `
            <div class="playlist-modal-options">
                <button class="raised button-submit" id="btn-surprise">
                    🎲 Surprise Me
                </button>
                <button class="raised button-cancel" id="btn-showlist">
                    📋 Show List
                </button>
            </div>
        `,
        buttons: [] // Custom buttons in content
    });

    // Handle button clicks
    document.getElementById('btn-surprise').onclick = () => {
        handleSurpriseMe(playlistId);
        dialog.close();
    };

    document.getElementById('btn-showlist').onclick = () => {
        handleShowList(playlistId);
        dialog.close();
    };
}
```

#### Random Item Selection

```javascript
async function handleSurpriseMe(playlistId) {
    try {
        // Call plugin API endpoint
        const response = await fetch(
            `/PlaylistModal/Random/${playlistId}?userId=${currentUserId}`,
            {
                headers: {
                    'X-Emby-Token': apiToken
                }
            }
        );

        if (response.status === 404) {
            // No unwatched items
            showNotification('No unwatched items in this playlist');
            handleShowList(playlistId); // Fallback to list view
            return;
        }

        const item = await response.json();

        // Navigate to and play the item
        playItem(item.Id);

    } catch (error) {
        console.error('Failed to get random item:', error);
        showNotification('Error getting random item');
    }
}
```

## API Specification

### Endpoint: Get Random Unwatched Item

**Request:**
```
GET /PlaylistModal/Random/{playlistId}?userId={userId}
Headers:
    X-Emby-Token: <api-token>
```

**Response (Success):**
```json
{
    "Name": "The Matrix",
    "Id": "abc123...",
    "ServerId": "xyz789...",
    "Type": "Movie",
    "UserData": {
        "Played": false,
        "PlaybackPositionTicks": 0
    }
    // ... other BaseItemDto fields
}
```

**Response (No Unwatched Items):**
```
404 Not Found
{
    "Error": "No unwatched items found in playlist"
}
```

## Edge Cases & Error Handling

| Scenario | Behavior |
|----------|----------|
| No unwatched items in playlist | Show notification, fallback to show list |
| Empty playlist | Show notification, close modal |
| Playlist contains only TV shows | Show warning (future: extend support) |
| Network error | Show error notification, retry option |
| User is not authenticated | Gracefully fail, log error |
| Playlist deleted/inaccessible | Show error, close modal |
| Multiple rapid clicks | Debounce modal opening |

## Configuration Options

**Admin Configuration Page:**
- Enable/Disable plugin globally
- Customize button text
- Fallback behavior when no unwatched items
- Supported media types (Movies, TV Shows, etc.)
- Modal timeout (auto-close after N seconds)

## Testing Strategy

### Unit Tests (C#)
- Test random item selection logic
- Test API endpoint responses
- Test edge cases (empty playlists, no unwatched items)

### Integration Tests
- Test JavaScript injection
- Test API calls from client to server
- Test modal rendering

### Manual Testing Checklist
- [ ] Modal appears on playlist click
- [ ] "Surprise Me" plays random unwatched movie
- [ ] "Show List" shows normal playlist view
- [ ] Modal is dismissible (ESC, click outside, close button)
- [ ] No unwatched items shows appropriate message
- [ ] Works across different themes
- [ ] Works on desktop browsers
- [ ] Works on mobile browsers
- [ ] Doesn't break non-playlist navigation

## Implementation Phases

### Phase 1: Proof of Concept ✅ (COMPLETED 2025-10-21)
- [x] Set up plugin template
- [x] Implement JavaScript injection
- [x] Create basic modal (browser confirm)
- [x] Test injection works
- [x] Multi-path fallback for Docker/native installations
- [x] Deploy to Jellyfin server

### Phase 2: Server-Side Logic ✅ (COMPLETED 2025-10-21)
- [x] Implement API endpoint
- [x] Implement random unwatched item logic
- [x] Add error handling
- [x] Add logging
- [x] Client-side API integration
- [x] BaseItemDto serialization fix
- [x] Navigation to item details page

### v1.0 Production Release ✅ (COMPLETED 2025-10-22)
- [x] Remove all debug logging and experimental code
- [x] Clean, production-ready implementation
- [x] Comprehensive documentation (README, CHANGELOG)
- [x] Deployment verification

### Phase 3: Enhanced UI (PLANNED)
- [ ] Replace browser confirm with Jellyfin-styled modal
- [ ] Match Jellyfin theme colors and styles
- [ ] Keyboard shortcuts (S/L)
- [ ] Better mobile responsiveness

### Phase 4: Extended Features (PLANNED)
- [ ] Configuration page
- [ ] TV show playlist support
- [ ] Music playlist support
- [ ] Autoplay functionality (if feasible)
- [ ] Playlist statistics in modal
- [ ] Remember user preferences

## Alternative Approaches Considered

### 1. Modify Jellyfin Web Directly
**Rejected:** Would require forking jellyfin-web and maintaining custom build

### 2. Browser Extension
**Rejected:** Requires users to install extension; not server-managed

### 3. Custom CSS Only
**Rejected:** CSS cannot intercept clicks or add behavior

### 4. Separate Web App
**Rejected:** Poor user experience; breaks single-app flow

## Future Enhancements

- Support for TV show playlists (random unwatched episode)
- Support for music playlists (random unplayed track)
- "Mark as watched and get another" quick action
- Customizable modal themes
- Remember user preference (always surprise me, always show list)
- Playlist statistics in modal (X unwatched of Y total)
- Keyboard shortcuts (S for surprise, L for list)
- Animation and sound effects

## References

- [Jellyfin Plugin Template](https://github.com/jellyfin/jellyfin-plugin-template)
- [Custom JavaScript Plugin](https://github.com/johnpc/jellyfin-plugin-custom-javascript)
- [Jellyfin API Overview](https://jmshrv.com/posts/jellyfin-api/)
- [Jellyfin TypeScript SDK - Playlists API](https://typescript-sdk.jellyfin.org/functions/generated_client.PlaylistsApiFactory.html)

## Notes

- This plugin does not modify core Jellyfin files permanently
- JavaScript injection approach is the recommended method for UI customization
- May need Docker volume mount for index.html if permission issues occur
- Consider contribution to awesome-jellyfin list once stable
