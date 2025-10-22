using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.PlaylistModal.Configuration;

/// <summary>
/// The configuration options.
/// </summary>
public enum SomeOptions
{
    /// <summary>
    /// Option one.
    /// </summary>
    OneOption,

    /// <summary>
    /// Second option.
    /// </summary>
    AnotherOption
}

/// <summary>
/// Plugin configuration.
/// </summary>
public class PluginConfiguration : BasePluginConfiguration
{
    /// <summary>
    /// Initializes a new instance of the <see cref="PluginConfiguration"/> class.
    /// </summary>
    public PluginConfiguration()
    {
        // Defaults: animation timing and UX
        TotalDurationMs = 3000;
        MinIntervalMs = 15;
        MaxIntervalMs = 460;
        MaxBlur = 14;
        AnticipationStart = 0.86;
        AnticipationDwellMs = 110;
        ConfettiCount = 90;
        AudioVolume = 0.7;
        EnableFocusTrap = true;
        AutoUpdateCheck = false;
        SurpriseMeText = "🍿 Surprise Me!";
        ShowListText = "🎞️ Show List";
        PlayItText = "🎬 Play it!";
        RerollText = "🎲 Reroll";
        CloseText = "Close";
    }

    /// <summary>
    /// Total animation duration in milliseconds.
    /// </summary>
    public int TotalDurationMs { get; set; }

    /// <summary>
    /// Minimum interval between poster swaps in milliseconds.
    /// </summary>
    public int MinIntervalMs { get; set; }

    /// <summary>
    /// Maximum interval between poster swaps in milliseconds.
    /// </summary>
    public int MaxIntervalMs { get; set; }

    /// <summary>
    /// Maximum blur applied at peak spin.
    /// </summary>
    public int MaxBlur { get; set; }

    /// <summary>
    /// Start of anticipation phase (0..1 of timeline).
    /// </summary>
    public double AnticipationStart { get; set; }

    /// <summary>
    /// Dwell time during anticipation beats in milliseconds.
    /// </summary>
    public int AnticipationDwellMs { get; set; }

    /// <summary>
    /// Number of confetti pieces on finish.
    /// </summary>
    public int ConfettiCount { get; set; }

    /// <summary>
    /// Audio volume for tick sound (0..1).
    /// </summary>
    public double AudioVolume { get; set; }

    /// <summary>
    /// Enables focus trapping within the modal.
    /// </summary>
    public bool EnableFocusTrap { get; set; }

    /// <summary>
    /// If true, the client will check GitHub for new releases.
    /// </summary>
    public bool AutoUpdateCheck { get; set; }

    /// <summary>
    /// Custom text for the "Surprise Me" button.
    /// </summary>
    public string SurpriseMeText { get; set; }

    /// <summary>
    /// Custom text for the "Show List" button.
    /// </summary>
    public string ShowListText { get; set; }

    /// <summary>
    /// Custom text for the "Play it!" button.
    /// </summary>
    public string PlayItText { get; set; }

    /// <summary>
    /// Custom text for the "Reroll" button.
    /// </summary>
    public string RerollText { get; set; }

    /// <summary>
    /// Custom text for the "Close" button.
    /// </summary>
    public string CloseText { get; set; }
}
