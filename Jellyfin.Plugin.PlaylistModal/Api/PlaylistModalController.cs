using System;
using System.Linq;
using Jellyfin.Data.Enums;
using MediaBrowser.Controller.Dto;
using MediaBrowser.Controller.Entities;
using MediaBrowser.Controller.Library;
using MediaBrowser.Controller.Playlists;
using MediaBrowser.Model.Dto;
using MediaBrowser.Model.Querying;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.PlaylistModal.Api;

/// <summary>
/// Playlist Modal API controller.
/// </summary>
[ApiController]
[Authorize]
[Route("PlaylistModal")]
public class PlaylistModalController : ControllerBase
{
    private readonly ILibraryManager _libraryManager;
    private readonly IUserManager _userManager;
    private readonly IDtoService _dtoService;
    private readonly ILogger<PlaylistModalController> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="PlaylistModalController"/> class.
    /// </summary>
    /// <param name="libraryManager">Instance of the <see cref="ILibraryManager"/> interface.</param>
    /// <param name="userManager">Instance of the <see cref="IUserManager"/> interface.</param>
    /// <param name="dtoService">Instance of the <see cref="IDtoService"/> interface.</param>
    /// <param name="logger">Instance of the <see cref="ILogger{PlaylistModalController}"/> interface.</param>
    public PlaylistModalController(
        ILibraryManager libraryManager,
        IUserManager userManager,
        IDtoService dtoService,
        ILogger<PlaylistModalController> logger)
    {
        _libraryManager = libraryManager;
        _userManager = userManager;
        _dtoService = dtoService;
        _logger = logger;
    }

    /// <summary>
    /// Gets a random unwatched item from a playlist.
    /// </summary>
    /// <param name="playlistId">The playlist ID.</param>
    /// <param name="userId">The user ID.</param>
    /// <returns>A random unwatched item from the playlist.</returns>
    [HttpGet("Random/{playlistId}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public ActionResult<BaseItemDto> GetRandomUnwatchedItem(
        [FromRoute] Guid playlistId,
        [FromQuery] Guid userId)
    {
        _logger.LogInformation("GetRandomUnwatchedItem called for playlist: {PlaylistId}, user: {UserId}", playlistId, userId);

        // Validate user
        var user = _userManager.GetUserById(userId);
        if (user == null)
        {
            _logger.LogWarning("User not found: {UserId}", userId);
            return BadRequest("Invalid user ID");
        }

        // Get the playlist
        var playlist = _libraryManager.GetItemById(playlistId) as Playlist;
        if (playlist == null)
        {
            _logger.LogWarning("Playlist not found: {PlaylistId}", playlistId);
            return NotFound("Playlist not found");
        }

        _logger.LogInformation("Found playlist: {PlaylistName}", playlist.Name);

        // Get playlist items
        var items = playlist.GetChildren(user, true)
            .Where(item => item != null && !item.IsPlayed(user))
            .ToList();

        _logger.LogInformation("Found {Count} unwatched items in playlist", items.Count);

        if (items.Count == 0)
        {
            _logger.LogInformation("No unwatched items found in playlist: {PlaylistId}", playlistId);
            return NotFound("No unwatched items found in playlist");
        }

        // Select a random item
        var random = new Random();
        var randomIndex = random.Next(items.Count);
        var selectedItem = items[randomIndex];

        _logger.LogInformation(
            "Selected random item: {ItemName} (ID: {ItemId}) from {TotalCount} unwatched items",
            selectedItem.Name,
            selectedItem.Id,
            items.Count);

        // Convert to DTO for proper serialization
        var dtoOptions = new DtoOptions();
        var itemDto = _dtoService.GetBaseItemDto(selectedItem, dtoOptions, user);

        _logger.LogInformation("Returning DTO with Name: {Name}, Id: {Id}", itemDto.Name, itemDto.Id);

        return Ok(itemDto);
    }
}
