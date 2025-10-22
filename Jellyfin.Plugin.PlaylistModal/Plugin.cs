using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Reflection;
using Jellyfin.Plugin.PlaylistModal.Configuration;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace Jellyfin.Plugin.PlaylistModal;

/// <summary>
/// The main plugin.
/// </summary>
public class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    private const string ScriptMarker = "<!-- PlaylistModal Plugin Script -->";

    private static readonly string[] PossibleWebPaths = new[]
    {
        "/jellyfin/jellyfin-web/index.html",
        "/usr/share/jellyfin/web/index.html",
        "/usr/lib/jellyfin/bin/jellyfin-web/index.html",
        "/config/jellyfin-web/index.html",
        "C:\\Program Files\\Jellyfin\\Server\\jellyfin-web\\index.html",
        "/app/jellyfin/jellyfin-web/index.html"
    };

    private readonly ILogger<Plugin> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="Plugin"/> class.
    /// </summary>
    /// <param name="applicationPaths">Instance of the <see cref="IApplicationPaths"/> interface.</param>
    /// <param name="xmlSerializer">Instance of the <see cref="IXmlSerializer"/> interface.</param>
    /// <param name="logger">Instance of the <see cref="ILogger"/> interface.</param>
    public Plugin(
        IApplicationPaths applicationPaths,
        IXmlSerializer xmlSerializer,
        ILogger<Plugin> logger)
        : base(applicationPaths, xmlSerializer)
    {
        Instance = this;
        _logger = logger;

        // Inject JavaScript on plugin load
        try
        {
            InjectJavaScript();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to inject JavaScript into web client");
        }
    }

    /// <inheritdoc />
    public override string Name => "Playlist Modal";

    /// <inheritdoc />
    public override Guid Id => Guid.Parse("a1b2c3d4-5e6f-7a8b-9c0d-1e2f3a4b5c6d");

    /// <summary>
    /// Gets the current plugin instance.
    /// </summary>
    public static Plugin? Instance { get; private set; }

    /// <summary>
    /// Injects the JavaScript code into the Jellyfin web client.
    /// </summary>
    private void InjectJavaScript()
    {
        _logger.LogInformation("Attempting to inject JavaScript into web client");

        // Try to find the web client index.html
        string? webClientPath = null;
        foreach (var path in PossibleWebPaths)
        {
            _logger.LogDebug("Checking for web client at: {Path}", path);
            if (File.Exists(path))
            {
                webClientPath = path;
                _logger.LogInformation("Found web client index.html at: {Path}", path);
                break;
            }
        }

        if (webClientPath == null)
        {
            _logger.LogWarning(
                "Web client index.html not found in any known location. Tried: {Paths}",
                string.Join(", ", PossibleWebPaths));
            _logger.LogWarning("JavaScript injection skipped. Plugin will not function until web client is found.");
            return;
        }

        // Read the current index.html content
        var indexHtml = File.ReadAllText(webClientPath);

        // Check if script is already injected
        if (indexHtml.Contains(ScriptMarker, StringComparison.Ordinal))
        {
            _logger.LogInformation("JavaScript already injected, skipping");
            return;
        }

        // Read the JavaScript file from embedded resource
        var assembly = Assembly.GetExecutingAssembly();
        var resourceName = "Jellyfin.Plugin.PlaylistModal.Web.playlistmodal.js";

        using var stream = assembly.GetManifestResourceStream(resourceName);
        if (stream == null)
        {
            _logger.LogError("Failed to find embedded resource: {ResourceName}", resourceName);
            return;
        }

        using var reader = new StreamReader(stream);
        var jsContent = reader.ReadToEnd();

        // Build client config object from plugin configuration
        var cfg = new
        {
            TotalDurationMs = Configuration.TotalDurationMs,
            MinIntervalMs = Configuration.MinIntervalMs,
            MaxIntervalMs = Configuration.MaxIntervalMs,
            MaxBlur = Configuration.MaxBlur,
            AnticipationStart = Configuration.AnticipationStart,
            AnticipationDwellMs = Configuration.AnticipationDwellMs,
            ConfettiCount = Configuration.ConfettiCount,
            AudioVolume = Configuration.AudioVolume,
            EnableFocusTrap = Configuration.EnableFocusTrap,
            AutoUpdateCheck = Configuration.AutoUpdateCheck,
            SurpriseMeText = Configuration.SurpriseMeText,
            ShowListText = Configuration.ShowListText,
            PlayItText = Configuration.PlayItText,
            RerollText = Configuration.RerollText,
            CloseText = Configuration.CloseText
        };
        var cfgJson = JsonSerializer.Serialize(cfg);

        // Create the script tag to inject: config object first, then script
        var scriptTag = $@"
    {ScriptMarker}
    <script type=""text/javascript"">window.PlaylistModalConfig = {cfgJson};</script>
    <script type=""text/javascript"">
{jsContent}
    </script>
";

        // Inject before the closing </body> tag
        var modifiedHtml = indexHtml.Replace("</body>", $"{scriptTag}\n</body>", StringComparison.Ordinal);

        // Write the modified content back
        try
        {
            File.WriteAllText(webClientPath, modifiedHtml);
            _logger.LogInformation("Successfully injected JavaScript into web client at: {Path}", webClientPath);
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogError(ex, "Permission denied writing to: {Path}. Plugin may need special Docker volume mount.", webClientPath);
            _logger.LogError("See plugin documentation for Docker installation instructions.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to write modified index.html to: {Path}", webClientPath);
        }
    }

    /// <inheritdoc />
    public IEnumerable<PluginPageInfo> GetPages()
    {
        return
        [
            new PluginPageInfo
            {
                Name = Name,
                EmbeddedResourcePath = string.Format(CultureInfo.InvariantCulture, "{0}.Configuration.configPage.html", GetType().Namespace)
            }
        ];
    }
}
