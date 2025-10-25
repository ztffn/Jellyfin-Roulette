using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using Jellyfin.Plugin.Roulette.Configuration;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.Roulette;

/// <summary>
/// The main plugin.
/// </summary>
public class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    private const string ScriptMarker = "<!-- Roulette Plugin Script -->";

    private static readonly string[] PossibleWebPaths = new[]
    {
        "/jellyfin/jellyfin-web/index.html",
        "/usr/share/jellyfin/web/index.html",
        "/usr/lib/jellyfin/bin/jellyfin-web/index.html",
        "/usr/lib/jellyfin/web/index.html",
        "/config/jellyfin-web/index.html",
        "C:\\Program Files\\Jellyfin\\Server\\jellyfin-web\\index.html",
        "/app/jellyfin/jellyfin-web/index.html"
    };

    private readonly IApplicationPaths _applicationPaths;
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
        _applicationPaths = applicationPaths;
        _logger = logger;

        // Inject JavaScript on plugin load
        try
        {
            InjectJavaScript();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Roulette][ERROR] Failed to inject JavaScript into web client");
        }
    }

    /// <inheritdoc />
    public override string Name => "Roulette";

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
        _logger.LogInformation("[Roulette][INFO] Attempting to inject JavaScript into web client");

        // Try to find the web client index.html
        var webClientPath = ResolveWebClientIndexPath();

        if (webClientPath == null)
        {
            _logger.LogWarning(
                "[Roulette][WARN] Web client index.html not found in any known location. Tried: {Paths}",
                string.Join(", ", PossibleWebPaths));
            _logger.LogWarning("[Roulette][WARN] JavaScript injection skipped. Plugin will not function until web client is found.");
            return;
        }

        // Read the current index.html content
        var indexHtml = File.ReadAllText(webClientPath);

        // Check if script is already injected
        if (indexHtml.Contains(ScriptMarker, StringComparison.Ordinal))
        {
            _logger.LogInformation("[Roulette][INFO] JavaScript already injected, skipping");
            return;
        }

        // Read the JavaScript file from embedded resource
        var assembly = Assembly.GetExecutingAssembly();
        var resourceName = FindEmbeddedResource(assembly, ".Web.roulette.js");
        if (string.IsNullOrEmpty(resourceName))
        {
            return;
        }

        using var stream = assembly.GetManifestResourceStream(resourceName);
        if (stream == null)
        {
            _logger.LogError("[Roulette][ERROR] Failed to find embedded resource stream: {ResourceName}", resourceName ?? "(null)");
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
    <script type=""text/javascript"">window.RouletteConfig = {cfgJson};</script>
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
            _logger.LogInformation("[Roulette][INFO] Successfully injected JavaScript into web client at: {Path}", webClientPath);
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogError(ex, "[Roulette][ERROR] Permission denied writing to: {Path}. Plugin may need special Docker volume mount.", webClientPath);
            _logger.LogError("[Roulette][ERROR] See plugin documentation for Docker installation instructions.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Roulette][ERROR] Failed to write modified index.html to: {Path}", webClientPath);
        }
    }

    /// <inheritdoc />
    public IEnumerable<PluginPageInfo> GetPages()
    {
        var assembly = Assembly.GetExecutingAssembly();
        var resourceName = FindEmbeddedResource(assembly, ".Configuration.configPage.html");

        if (resourceName == null)
        {
            _logger.LogError("[Roulette][ERROR] Configuration page resource not found. Configuration UI will be unavailable.");
            return Array.Empty<PluginPageInfo>();
        }

        return new[]
        {
            new PluginPageInfo
            {
                Name = Name,
                EmbeddedResourcePath = resourceName
            }
        };
    }

    private string? FindEmbeddedResource(Assembly assembly, string suffix)
    {
        var resources = assembly.GetManifestResourceNames();
        var resourceName = resources.FirstOrDefault(name => name.EndsWith(suffix, StringComparison.Ordinal));

        if (resourceName == null)
        {
            _logger.LogError(
                "[Roulette][ERROR] Unable to locate an embedded resource ending with \"{Suffix}\". Available resources: {Resources}",
                suffix,
                string.Join(", ", resources));
        }

        return resourceName;
    }

    private string? ResolveWebClientIndexPath()
    {
        var candidates = new List<string>();
        var directoriesToScan = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var visited = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        void AddFileCandidate(string? path)
        {
            if (string.IsNullOrWhiteSpace(path))
            {
                return;
            }

            try
            {
                var normalized = Path.GetFullPath(path);
                if (visited.Add(normalized))
                {
                    candidates.Add(normalized);
                    var directory = Path.GetDirectoryName(normalized);
                    if (!string.IsNullOrWhiteSpace(directory) && Directory.Exists(directory))
                    {
                        directoriesToScan.Add(directory);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "[Roulette][DEBUG] Skipping invalid candidate path {Path}", path);
            }
        }

        void AddDirectoryCandidates(string? directory)
        {
            if (string.IsNullOrWhiteSpace(directory))
            {
                return;
            }

            try
            {
                var normalizedDirectory = Path.GetFullPath(directory);
                if (!Directory.Exists(normalizedDirectory))
                {
                    return;
                }

                AddFileCandidate(Path.Combine(normalizedDirectory, "index.html"));
                AddFileCandidate(Path.Combine(normalizedDirectory, "jellyfin-web", "index.html"));
                AddFileCandidate(Path.Combine(normalizedDirectory, "web", "index.html"));
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "[Roulette][DEBUG] Skipping invalid directory candidate {Directory}", directory);
            }
        }

        foreach (var path in PossibleWebPaths)
        {
            _logger.LogDebug("[Roulette][DEBUG] Checking candidate from hard-coded list: {Path}", path);
            AddFileCandidate(path);
        }

        try
        {
            var dynamicPaths = _applicationPaths.GetType()
                .GetProperties(BindingFlags.Public | BindingFlags.Instance)
                .Where(p => p.PropertyType == typeof(string));

            foreach (var property in dynamicPaths)
            {
                var value = property.GetValue(_applicationPaths) as string;
                if (string.IsNullOrWhiteSpace(value))
                {
                    continue;
                }

                _logger.LogDebug("[Roulette][DEBUG] ApplicationPaths.{Property} = {Value}", property.Name, value);

                if (value.EndsWith(".html", StringComparison.OrdinalIgnoreCase))
                {
                    AddFileCandidate(value);
                }
                else if (Path.HasExtension(value))
                {
                    var directory = Path.GetDirectoryName(value);
                    AddDirectoryCandidates(directory);
                }
                else
                {
                    AddDirectoryCandidates(value);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "[Roulette][DEBUG] Failed to enumerate dynamic application path candidates");
        }

        foreach (var candidate in candidates)
        {
            if (File.Exists(candidate))
            {
                _logger.LogInformation("[Roulette][INFO] Found web client index.html at: {Path}", candidate);
                return candidate;
            }
        }

        foreach (var directory in directoriesToScan)
        {
            try
            {
                var match = Directory.EnumerateFiles(directory, "index.html", SearchOption.AllDirectories)
                    .FirstOrDefault(File.Exists);
                if (!string.IsNullOrWhiteSpace(match))
                {
                    _logger.LogInformation(
                        "[Roulette][INFO] Found web client index.html via directory scan in {Directory}: {Path}",
                        directory,
                        match);
                    return match;
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "[Roulette][DEBUG] Skipping directory scan due to error in {Directory}", directory);
            }
        }

        _logger.LogWarning(
            "[Roulette][WARN] Unable to locate index.html. Candidate files evaluated: {Candidates}",
            string.Join(", ", candidates));

        return null;
    }
}
