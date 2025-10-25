# Jellyfin-Roulette
 ![plugin banner](https://github.com/ztffn/Jellyfin-Roulette/blob/main/screenshots/playlistRouletteIconHeader.png) 
 
![Version](https://img.shields.io/badge/version-1.0.2-blue)
![Jellyfin](https://img.shields.io/badge/jellyfin-10.8%2B-purple)
![.NET](https://img.shields.io/badge/.NET-8.0-512BD4)
![License](https://img.shields.io/badge/license-MIT-green)

**A Jellyfin plugin that plays a random item from your playlists.**

Click a playlist, hit "Surprise Me," and watch as movie posters spin past before landing on your next unwatched item!


## 📦 Features

- **Slot machine animation** - 3-second spin with dynamic speed and blur effects
- **Smart filtering** - Only shows unwatched items from your playlists
- **Audio feedback** - Synthesized tick sounds during animation (no external files)
- **Confetti celebration** - Visual effects when selection completes
- **Dynamic resize** - Container morphs from landscape (playlist) to portrait (movie poster)
- **Keyboard navigation** - Full support for Tab, Enter, Escape, and arrow keys (←/→ for remote controls)
- **Configuration panel** - Customize animation timing, button text, audio volume, and more from Jellyfin dashboard
- **Responsive design** - Works on desktop and mobile
- **Non-invasive** - JavaScript injection pattern, doesn't modify Jellyfin core files

## 🎥 Preview
https://github.com/user-attachments/assets/7842878e-5216-4fef-ade5-87691595680a


 
## 🛠️ Installation

### Option 1: Install via Plugin Repository (Recommended)

1. Open Jellyfin Dashboard → **Plugins** → **Repositories**
2. Click **Add** and enter:
   - Repository Name: `Jellyfin-Roulette`
   - Repository URL: `https://raw.githubusercontent.com/ztffn/Jellyfin-Roulette/main/manifest.json`
3. Go to **Catalog** tab
4. Find **Jellyfin-Roulette** and click **Install**
5. Restart Jellyfin server
6. Hard refresh your browser: `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac)

### Option 2: Manual Installation

1. Download `Jellyfin.Plugin.Roulette.dll` from [Releases](https://github.com/ztffn/Jellyfin-Roulette/releases)
2. Create plugin directory:
   ```bash
   mkdir -p /path/to/jellyfin/config/plugins/Jellyfin-Roulette_1.0.2.0/
   ```
3. Copy the DLL to the directory
4. Restart Jellyfin
5. Hard refresh your browser

Need help? See the new [Troubleshooting guide](TROUBLESHOOTING.md).

## 🎰 Usage

1. Navigate to any playlist in Jellyfin
2. A modal appears with two buttons:
   - **🍿 Surprise Me!** - Triggers slot animation and selects random unwatched item
   - **🎞️ Show List** - Opens normal playlist view
3. Click "Surprise Me!" to watch the animation
4. After selection:
   - **🎬 Play it!** - Navigate to the selected item
   - **🎲 Reroll** - Try again for a different selection
   - **🎞️ Show List** - View the full playlist

### ⚙️ Configuration

Access configuration from **Dashboard → Plugins → Roulette**:
- Customize animation timing and effects
- Change button text (localization support)
- Adjust audio volume
- Configure confetti count
- Enable/disable focus trap

**Tip:** Enable browser sound to hear the satisfying audio ticks!

## 🔄 Compatibility

- **Jellyfin**: 10.8.0 and above (⚠️ Not yet tested on 10.11)
- **Platform**: Docker (Linux), Native Linux, Windows, macOS
- **Browsers**: Chrome, Firefox, Safari, Edge
- **Mobile**: Responsive design for all screen sizes

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

Built with 🎲 for the Jellyfin Community using the [jellyfin-plugin-template](https://github.com/jellyfin/jellyfin-plugin-template) and inspired by [jellyfin-plugin-custom-javascript](https://github.com/johnpc/jellyfin-plugin-custom-javascript) injection pattern.

---

**Repository:** https://github.com/ztffn/Jellyfin-Roulette
