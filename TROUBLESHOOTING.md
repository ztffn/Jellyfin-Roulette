# Troubleshooting Jellyfin-Roulette

Having trouble getting the Roulette modal to appear? Work through the checks below and gather the requested info before opening an issue—most problems can be fixed with a few quick steps.

## 1. Verify Your Versions
- **Roulette**: Installed version should be `1.0.2` (Plugins → Installed).
- **Jellyfin**: Supported on 10.8+, tested on 10.10.x and 10.11.
- After installing or updating, **restart Jellyfin** and perform a **hard browser refresh** (`Ctrl+Shift+R` / `Cmd+Shift+R`).

## 2. Watch the Server Log
Roulette prefixes every server log entry with `[Roulette][LEVEL]`.

1. Restart Jellyfin.
2. Open `server.log` (Dashboard → Logs or the on-disk file).
3. Search for `Roulette`.

Expected sequence:
```
[Roulette][INFO] Attempting to inject JavaScript into web client
[Roulette][INFO] Found web client index.html at: ...
[Roulette][INFO] Successfully injected JavaScript into web client at: ...
```

If you see warnings or errors instead, the server could not locate or modify the Jellyfin web UI files. Jump to [Fixing “Permission denied”](#fixing-permission-denied).

## 3. Check the Browser Console
Open Jellyfin in your browser, press `F12`, switch to the **Console**, and click any playlist. If the client script is active you will see:
```
[Roulette] Plugin loaded (v1.0.2)
[Roulette] Initializing...
```
and subsequent intercept logs. No console output means the script never injected; re-check the server log.

## 4. Confirm Your Plugin Repository
Ensure the repository URL is set to the official manifest:
```
https://raw.githubusercontent.com/ztffn/Jellyfin-Roulette/main/manifest.json
```
Remove any experimental/stale entries, reinstall Roulette, and delete old copies under `plugins/Jellyfin-Roulette_*` before restarting.

## Fixing “Permission denied”
If the log shows:
```
[Roulette][ERROR] Permission denied writing to: <path>/index.html
```
the plugin cannot inject its script because the Jellyfin web UI is read-only. Grant the Jellyfin service account write access to that folder.

### Docker
Bind-mount the Jellyfin web client directory from a writable host path. Example compose snippet:
```yaml
volumes:
  - ./jellyfin-config:/config
  - ./jellyfin-web:/usr/share/jellyfin/web
```
Ensure the host folder is owned by the same UID/GID Jellyfin runs under.

### Windows (Service install)
1. Stop the **Jellyfin** service (`services.msc`).
2. Locate the web folder (default `C:\Program Files\Jellyfin\Server\jellyfin-web`).
3. Right-click → **Properties** → **Security** → **Advanced**.
4. Add the account Jellyfin runs as (check `services.msc` → Jellyfin → Log On tab, commonly `LOCAL SERVICE` or `NETWORK SERVICE`).
5. Grant **Modify** (or Full Control) permissions, apply to “This folder, subfolders and files”.
6. Restart the Jellyfin service, hard refresh the browser, and confirm the log now shows “Successfully injected…”.

### Linux (Native)
Ensure the Unix user running Jellyfin can write to the web directory (usually `/usr/lib/jellyfin/bin/jellyfin-web` or `/usr/share/jellyfin/web`). Adjust ownership or bind-mount a writable copy:
```bash
sudo chown -R jellyfin:jellyfin /usr/share/jellyfin/web
```
or mount a custom web folder via Systemd unit overrides.

## Still Stuck?
Collect the following and open a GitHub issue:
- Jellyfin version and host OS
- Roulette version
- Relevant `[Roulette]` lines from `server.log`
- Browser console output (if any)
- Details about your install (Docker compose snippet, service account, etc.)

With that info we can quickly identify what’s blocking the injection. Good luck, and may your playlists always spin in your favor! 🎲
