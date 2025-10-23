/**
 * Jellyfin Playlist Modal Plugin - Client Side Script
 * Version 0.9.0 - Initial Public Release
 *
 * This script intercepts playlist clicks and shows an animated modal with two options:
 * 1. Surprise Me - Slot machine animation revealing a random unwatched item
 * 2. Show List - Navigate to normal playlist view
 */

(function() {
    'use strict';

    console.log('[Roulette] Plugin loaded (v1.0.0)');

	// Animation configuration (overridden by server-provided RouletteConfig if present)
	const config = {
		totalDuration: 3000,
		minInterval: 15,
		maxInterval: 460,
		maxBlur: 14,
		anticipationStart: 0.86,
		anticipationDwell: 110,
		finalScale: 1.22,
		confettiCount: 90,
		minTickGap: 33  // ms between audio ticks
	};

	const injectedCfg = window.RouletteConfig || null;
	if (injectedCfg) {
		if (Number.isFinite(injectedCfg.TotalDurationMs)) config.totalDuration = injectedCfg.TotalDurationMs;
		if (Number.isFinite(injectedCfg.MinIntervalMs)) config.minInterval = injectedCfg.MinIntervalMs;
		if (Number.isFinite(injectedCfg.MaxIntervalMs)) config.maxInterval = injectedCfg.MaxIntervalMs;
		if (Number.isFinite(injectedCfg.MaxBlur)) config.maxBlur = injectedCfg.MaxBlur;
		if (Number.isFinite(injectedCfg.AnticipationStart)) config.anticipationStart = Math.max(0, Math.min(1, injectedCfg.AnticipationStart));
		if (Number.isFinite(injectedCfg.AnticipationDwellMs)) config.anticipationDwell = injectedCfg.AnticipationDwellMs;
		if (Number.isFinite(injectedCfg.ConfettiCount)) config.confettiCount = injectedCfg.ConfettiCount;
	}

	const audioSettings = {
		volume: injectedCfg && Number.isFinite(injectedCfg.AudioVolume) ? Math.max(0, Math.min(1, injectedCfg.AudioVolume)) : 0.7
	};

	const enableFocusTrap = injectedCfg && typeof injectedCfg.EnableFocusTrap === 'boolean' ? injectedCfg.EnableFocusTrap : true;

	const buttonTexts = {
		surpriseMe: injectedCfg && injectedCfg.SurpriseMeText ? injectedCfg.SurpriseMeText : '🍿 Surprise Me!',
		showList: injectedCfg && injectedCfg.ShowListText ? injectedCfg.ShowListText : '🎞️ Show List',
		playIt: injectedCfg && injectedCfg.PlayItText ? injectedCfg.PlayItText : '🎬 Play it!',
		reroll: injectedCfg && injectedCfg.RerollText ? injectedCfg.RerollText : '🎲 Reroll',
		close: injectedCfg && injectedCfg.CloseText ? injectedCfg.CloseText : 'Close'
	};

	const clientVersion = '1.0.0';

    // State
    let currentModal = null;
    let currentPlaylistId = null;
    let playlistItems = [];
    let unwatchedItems = [];
    let playlistInfo = null;
    let audioCtx = null;
    let clickBuf = null;

    /**
     * Initialize - Set up click interception
     */
    function init() {
        console.log('[Roulette] Initializing...');

        // Intercept playlist navigation clicks
        document.addEventListener('click', function(e) {
            let target = null;
            let playlistId = null;

            // Method 1: Traditional anchor tag
            target = e.target.closest('a[href*="/playlists"]');
            if (target && target.href) {
                const match = target.href.match(/\/playlists\/([a-f0-9-]+)/i);
                if (match) playlistId = match[1];
            }

            // Method 2: Check for data attributes
            if (!playlistId) {
                target = e.target.closest('[data-type="Playlist"]');
                if (target && target.dataset.id) {
                    playlistId = target.dataset.id;
                }
            }

            // Method 3: Check parent anchor tags
            if (!playlistId) {
                target = e.target.closest('a[href]');
                if (target && target.href) {
                    const match = target.href.match(/[#/].*playlists?[/#]([a-f0-9-]+)/i);
                    if (match) playlistId = match[1];
                }
            }

            if (playlistId) {
                console.log('[Roulette] Intercepted playlist click:', playlistId);
                e.preventDefault();
                e.stopPropagation();
                showRouletteModal(playlistId);
            }
        }, true);

        console.log('[Roulette] Event listener registered');
    }

    /**
     * Initialize audio context and create tick sound
     */
    function initAudio() {
        if (audioCtx) return;
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const dur = 0.015;
            const sr = audioCtx.sampleRate;
            const len = Math.floor(dur * sr);
            const buf = audioCtx.createBuffer(1, len, sr);
            const data = buf.getChannelData(0);

            // Create exponentially decaying noise pop
            for (let i = 0; i < len; i++) {
                const t = i / len;
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 6) * 0.3;
            }
            clickBuf = buf;
        } catch (error) {
            console.log('[Roulette] Audio initialization failed:', error);
        }
    }

    /**
     * Play tick sound
     */
    function tickSound() {
        if (!audioCtx || !clickBuf) return;
        try {
            const now = audioCtx.currentTime;
            const src = audioCtx.createBufferSource();
            const gain = audioCtx.createGain();
            gain.gain.value = audioSettings.volume;
            src.buffer = clickBuf;
            src.connect(gain).connect(audioCtx.destination);
            src.start(now);
        } catch (error) {
            // Silently fail
        }
    }

    /**
     * Fetch playlist info including cover image
     */
    async function fetchPlaylistInfo(playlistId) {
        const ApiClient = window.ApiClient;
        const userId = ApiClient.getCurrentUserId();

        const url = ApiClient.getUrl(`Users/${userId}/Items/${playlistId}`);
        const playlist = await ApiClient.getJSON(url);

        // Get playlist image URL
        if (playlist.ImageTags && playlist.ImageTags.Primary) {
            playlist.imageUrl = ApiClient.getUrl(`Items/${playlistId}/Images/Primary`, {
                maxWidth: 800,
                quality: 90,
                tag: playlist.ImageTags.Primary
            });
        } else {
            // Fallback placeholder
            playlist.imageUrl = 'data:image/svg+xml,' + encodeURIComponent(
                '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><rect width="800" height="450" fill="#1a1b22"/><text x="50%" y="50%" fill="#666" font-size="32" text-anchor="middle" dominant-baseline="middle">Playlist</text></svg>'
            );
        }

        return playlist;
    }

    /**
     * Show the enhanced modal dialog
     */
    async function showRouletteModal(playlistId) {
        console.log('[Roulette] Showing modal for playlist:', playlistId);

        // Store playlist ID globally for later use
        currentPlaylistId = playlistId;

        // Fetch playlist info first
        try {
            playlistInfo = await fetchPlaylistInfo(playlistId);
        } catch (error) {
            console.error('[Roulette] Error fetching playlist info:', error);
            playlistInfo = { imageUrl: '', Name: 'Playlist' };
        }

        // Remove any existing modal
        if (currentModal) {
            currentModal.remove();
        }

        // Create modal HTML
        const modalHTML = `
            <div class="roulette-overlay" id="rouletteOverlay">
                <style>
                    .roulette-overlay {
                        position: fixed;
                        inset: 0;
                        z-index: 9999;
                        display: grid;
                        place-items: center;
                        background: rgba(0, 0, 0, 0.85);
                        backdrop-filter: blur(4px);
                        animation: fadeIn 200ms ease-out;
                    }

                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }

                    .roulette-wrap {
                        display: grid;
                        gap: 24px;
                        place-items: center;
                        max-width: 90vw;
                    }

                    .roulette-heading {
                        margin: 0 0 10px;
                        font-size: clamp(26px, 3.2vw, 40px);
                        font-weight: 900;
                        letter-spacing: 0.2px;
                        text-align: center;
                        background: linear-gradient(90deg, #a95cc1, #09a2dc);
                        -webkit-background-clip: text;
                        background-clip: text;
                        color: transparent;
                        opacity: 0;
                        transform: translateY(-8px);
                        transition: opacity 280ms cubic-bezier(.2,.7,.2,1), transform 280ms cubic-bezier(.2,.7,.2,1);
                    }

                    .roulette-heading.show {
                        opacity: 1;
                        transform: translateY(0);
                    }

                    .roulette-ring {
                        --progress: 0;
                        --ringPad: 12px;
                        position: relative;
                        width: 380px;
                        height: 220px;
                        display: grid;
                        place-items: center;
                        border-radius: 22px;
                        padding: var(--ringPad);
                        background:
                            radial-gradient(80% 80% at 50% 10%, rgba(255,255,255,.08), transparent),
                            conic-gradient(from 225deg,
                                #a95cc1 0turn,
                                #09a2dc calc(var(--progress) * 1turn),
                                #1a1b22 calc(var(--progress) * 1turn)
                            );
                        filter: drop-shadow(0 12px 28px rgba(0,0,0,.45));
                        transition: width 600ms cubic-bezier(.2,.7,.2,1), height 600ms cubic-bezier(.2,.7,.2,1), filter 200ms ease;
                    }

                    .roulette-ring.poster-mode {
                        width: 260px;
                        height: 380px;
                    }

                    .roulette-ring:hover {
                        filter: drop-shadow(0 18px 40px rgba(0,0,0,.55));
                    }

                    .roulette-stage {
                        --blur: 0px;
                        --vignette: 0.35;
                        position: relative;
                        width: 356px;
                        height: 196px;
                        border-radius: 16px;
                        overflow: hidden;
                        background: linear-gradient(180deg, #14151c, #111219);
                        box-shadow:
                            inset 0 0 0 1px rgba(255,255,255,.06),
                            inset 0 10px 30px rgba(255,255,255,.06),
                            inset 0 -20px 40px rgba(0,0,0,var(--vignette)),
                            0 6px 20px rgba(0,0,0,.35);
                        margin: calc(-1 * var(--ringPad));
                        transition: width 600ms cubic-bezier(.2,.7,.2,1), height 600ms cubic-bezier(.2,.7,.2,1), transform 180ms cubic-bezier(.2,.7,.2,1), box-shadow 140ms linear;
                    }

                    .poster-mode .roulette-stage {
                        width: 236px;
                        height: 356px;
                    }

                    .roulette-stage::after {
                        content: "";
                        position: absolute;
                        inset: 0;
                        background:
                            linear-gradient(180deg, rgba(255,255,255,.08), transparent 30%),
                            radial-gradient(120% 60% at 50% -10%, rgba(255,255,255,.10), transparent 38%),
                            radial-gradient(120% 120% at 50% 120%, rgba(0,0,0,.35), transparent 50%);
                        pointer-events: none;
                    }

                    .roulette-img {
                        position: absolute;
                        inset: 0;
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                        transition:
                            opacity 180ms cubic-bezier(.2,.7,.2,1),
                            transform 180ms cubic-bezier(.2,.7,.2,1),
                            filter 180ms cubic-bezier(.2,.7,.2,1);
                        filter: blur(var(--blur)) saturate(1.05) contrast(1.02);
                        transform: translateY(8px) scale(1.015);
                        opacity: 0;
                    }

                    .roulette-img.active {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }

                    .roulette-flash {
                        position: absolute;
                        inset: 0;
                        pointer-events: none;
                        background: radial-gradient(60% 60% at 50% 50%, rgba(255,255,255,.75), transparent 55%);
                        opacity: 0;
                    }

                    .roulette-flash.pop {
                        animation: flash 520ms cubic-bezier(.2,.7,.2,1);
                    }

                    @keyframes flash {
                        0% { opacity: 0; transform: scale(.9); }
                        20% { opacity: .65; transform: scale(1); }
                        100% { opacity: 0; transform: scale(1.05); }
                    }

                    @keyframes thunk {
                        0% { transform: scale(1.22); }
                        60% { transform: scale(1.26); }
                        100% { transform: scale(1.22); }
                    }

                    .roulette-confetti {
                        position: absolute;
                        inset: 0;
                        pointer-events: none;
                    }

                    .roulette-controls {
                        display: flex;
                        gap: 12px;
                        align-items: center;
                        justify-content: center;
                        flex-wrap: wrap;
                    }

                    .roulette-btn {
                        padding: 10px 16px;
                        border-radius: 12px;
                        border: 0;
                        background: linear-gradient(180deg, #586bff, #4557ff);
                        color: white;
                        font-weight: 700;
                        letter-spacing: 0.2px;
                        cursor: pointer;
                        box-shadow: 0 6px 16px rgba(69,87,255,.35);
                        transition: transform 120ms ease, opacity 120ms ease, box-shadow 120ms ease;
                        font-family: inherit;
                        font-size: 14px;
                    }

                    .roulette-btn:hover {
                        transform: translateY(-1px);
                        box-shadow: 0 10px 20px rgba(69,87,255,.45);
                    }

                    .roulette-btn:active {
                        transform: translateY(0);
                    }

                    .roulette-btn:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                        transform: none;
                        box-shadow: none;
                    }

                    .roulette-btn.secondary {
                        background: linear-gradient(180deg, #2a2b35, #1f2028);
                        box-shadow: 0 4px 12px rgba(0,0,0,.35);
                    }

                    .roulette-btn.secondary:hover {
                        box-shadow: 0 6px 18px rgba(0,0,0,.45);
                    }

                    @media (prefers-reduced-motion: reduce) {
                        .roulette-overlay,
                        .roulette-heading,
                        .roulette-stage,
                        .roulette-img {
                            transition: none !important;
                            animation: none !important;
                        }
                        .roulette-flash { animation: none !important; }
                    }

                    @media (max-width: 768px) {
                        .roulette-ring {
                            width: 320px;
                            height: 180px;
                        }
                        .roulette-ring.poster-mode {
                            width: 220px;
                            height: 320px;
                        }
                        .roulette-stage {
                            width: 296px;
                            height: 156px;
                        }
                        .poster-mode .roulette-stage {
                            width: 196px;
                            height: 296px;
                        }
                    }
                </style>

                <div class="roulette-wrap">
                    <h1 class="roulette-heading" id="rouletteHeading"></h1>

                    <div class="roulette-ring" id="rouletteRing">
                        <div class="roulette-stage" id="rouletteStage">
                            <img class="roulette-img active" id="rouletteImgA" alt="Playlist item" src="" />
                            <img class="roulette-img" id="rouletteImgB" alt="" src="" />
                            <canvas class="roulette-confetti" id="rouletteConfetti" width="356" height="356"></canvas>
                            <div class="roulette-flash" id="rouletteFlash"></div>
                        </div>
                    </div>

                    <div class="roulette-controls" id="rouletteControls">
                        <button class="roulette-btn" id="rouletteSurpriseBtn">${buttonTexts.surpriseMe}</button>
                        <button class="roulette-btn secondary" id="rouletteShowListBtn">${buttonTexts.showList}</button>
                    </div>
                </div>
            </div>
        `;

        // Inject modal into DOM
        const temp = document.createElement('div');
        temp.innerHTML = modalHTML;
        const modal = temp.firstElementChild;
        document.body.appendChild(modal);
        currentModal = modal;

		// ARIA roles and attributes for accessibility
		modal.setAttribute('role', 'dialog');
		modal.setAttribute('aria-modal', 'true');

		// Get elements
        const surpriseBtn = document.getElementById('rouletteSurpriseBtn');
        const showListBtn = document.getElementById('rouletteShowListBtn');
        const imgA = document.getElementById('rouletteImgA');


		// Manually focus primary action (autofocus is unreliable on dynamic elements)
		requestAnimationFrame(() => {
			try {
				if (surpriseBtn) {
					surpriseBtn.focus({ preventScroll: true });
				} else {
					const focusables = getFocusable(modal);
					focusables[0] && focusables[0].focus({ preventScroll: true });
				}
			} catch (_) { /* no-op */ }
		});

        // Set initial image to playlist cover
        if (playlistInfo && playlistInfo.imageUrl) {
            imgA.src = playlistInfo.imageUrl;
            imgA.alt = playlistInfo.Name || 'Playlist';
        }

		// Focus trap helpers
		const getFocusable = (root) => Array.from(root.querySelectorAll([
			'button:not([disabled])',
			'[href]',
			'input:not([disabled])',
			'select:not([disabled])',
			'textarea:not([disabled])',
			'[tabindex]:not([tabindex="-1"])'
		].join(',')));

		const previouslyFocused = document.activeElement;

		const handleTabKey = (e) => {
			if (e.key !== 'Tab') return;
			const focusables = getFocusable(modal);
			if (focusables.length === 0) return;
			const first = focusables[0];
			const last = focusables[focusables.length - 1];
			if (e.shiftKey) {
				if (document.activeElement === first || !modal.contains(document.activeElement)) {
					e.preventDefault();
					last.focus();
				}
			} else {
				if (document.activeElement === last) {
					e.preventDefault();
					first.focus();
				}
			}
		};

		const handleArrowKeys = (e) => {
			if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;

			const focusables = getFocusable(modal);
			if (focusables.length === 0) return;

			const currentIndex = focusables.indexOf(document.activeElement);
			let nextIndex;

			if (e.key === 'ArrowLeft') {
				// Go backwards (like Shift+Tab)
				nextIndex = currentIndex <= 0 ? focusables.length - 1 : currentIndex - 1;
			} else {
				// ArrowRight: Go forwards (like Tab)
				nextIndex = currentIndex >= focusables.length - 1 ? 0 : currentIndex + 1;
			}

			e.preventDefault();
			e.stopPropagation();
			focusables[nextIndex].focus();
		};

		// Set up event listeners
        surpriseBtn.addEventListener('click', () => handleSurpriseMe(playlistId));
        showListBtn.addEventListener('click', () => handleShowList(playlistId));

		// Close on ESC key and trap Tab within modal
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                closeModal();
            }
        };
		const handleKeydown = (e) => {
			// Block up/down arrows from affecting background (left/right handled by handleArrowKeys)
			if (['ArrowUp', 'ArrowDown'].includes(e.key)) {
				e.stopPropagation();
				e.preventDefault();
			}
			handleArrowKeys(e);
			handleTabKey(e);
			handleEsc(e);
		};
		if (enableFocusTrap) {
			document.addEventListener('keydown', handleKeydown, true);
		}

		// Block all keyboard events on modal from reaching background
		const stopKeyboardPropagation = (e) => {
			e.stopPropagation();
		};
		modal.addEventListener('keydown', stopKeyboardPropagation, true);
		modal.addEventListener('keyup', stopKeyboardPropagation, true);
		modal.addEventListener('keypress', stopKeyboardPropagation, true);

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });

		// Store cleanup function
		modal._cleanup = () => {
			if (enableFocusTrap) {
				document.removeEventListener('keydown', handleKeydown, true);
				modal.removeEventListener('keydown', stopKeyboardPropagation, true);
				modal.removeEventListener('keyup', stopKeyboardPropagation, true);
				modal.removeEventListener('keypress', stopKeyboardPropagation, true);
				// Restore focus to previously focused element
				if (previouslyFocused) {
					previouslyFocused.focus();
				}
			}
		};
    }

    /**
     * Close and remove the modal
     */
    function closeModal() {
        if (currentModal) {
            if (currentModal._cleanup) {
                currentModal._cleanup();
            }
            currentModal.style.opacity = '0';
            setTimeout(() => {
                if (currentModal) {
                    currentModal.remove();
                    currentModal = null;
                }
            }, 200);
        }
    }

    /**
     * Fetch playlist items with cover art
     */
    async function fetchPlaylistItems(playlistId) {
        const ApiClient = window.ApiClient;
        const userId = ApiClient.getCurrentUserId();

        const url = ApiClient.getUrl(`Users/${userId}/Items`, {
            ParentId: playlistId,
            Fields: 'PrimaryImageAspectRatio,ImageTags',
            Recursive: true,
            IncludeItemTypes: 'Movie'
        });

        const response = await ApiClient.getJSON(url);
        const items = response.Items || [];

        // Add image URLs
        items.forEach(item => {
            if (item.ImageTags && item.ImageTags.Primary) {
                item.imageUrl = ApiClient.getUrl(`Items/${item.Id}/Images/Primary`, {
                    maxWidth: 600,
                    quality: 90,
                    tag: item.ImageTags.Primary
                });
            } else {
                // Fallback placeholder
                item.imageUrl = 'data:image/svg+xml,' + encodeURIComponent(
                    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="#1a1b22"/><text x="50%" y="50%" fill="#666" font-size="24" text-anchor="middle" dominant-baseline="middle">No Image</text></svg>'
                );
            }
        });

        return items;
    }

    /**
     * Handle "Surprise Me" - Show slot animation
     */
    async function handleSurpriseMe(playlistId) {
        console.log('[Roulette] Surprise Me selected');

        const surpriseBtn = document.getElementById('rouletteSurpriseBtn');
        const showListBtn = document.getElementById('rouletteShowListBtn');

        // Disable buttons
        surpriseBtn.disabled = true;
        showListBtn.disabled = true;
        surpriseBtn.textContent = 'Loading...';

        try {
            const ApiClient = window.ApiClient;
            if (!ApiClient) {
                throw new Error('ApiClient not found');
            }

            // Fetch all playlist items
            playlistItems = await fetchPlaylistItems(playlistId);

            if (playlistItems.length === 0) {
                alert('This playlist is empty!');
                closeModal();
                return;
            }

            // Filter unwatched items
            unwatchedItems = playlistItems.filter(item =>
                !item.UserData || !item.UserData.Played
            );

            if (unwatchedItems.length === 0) {
                console.log('[Roulette] No unwatched items found');
                alert('No unwatched items in this playlist!\n\nShowing full playlist instead.');
                closeModal();
                handleShowList(playlistId);
                return;
            }

            // Initialize audio
            initAudio();
            if (audioCtx && audioCtx.resume) {
                audioCtx.resume();
            }

            // Hide buttons
            surpriseBtn.style.display = 'none';
            showListBtn.style.display = 'none';

            // Transition to poster mode AND start animation immediately
            const ring = document.getElementById('rouletteRing');
            ring.classList.add('poster-mode');

            // Start animation immediately (resize happens in parallel)
            runSlotAnimation();

        } catch (error) {
            console.error('[Roulette] Error:', error);
            alert('Error loading playlist: ' + error.message);
            closeModal();
        }
    }

    /**
     * Run the slot machine animation
     */
    function runSlotAnimation() {
        const stage = document.getElementById('rouletteStage');
        const imgA = document.getElementById('rouletteImgA');
        const imgB = document.getElementById('rouletteImgB');
        const flash = document.getElementById('rouletteFlash');
        const ring = document.getElementById('rouletteRing');

        let activeImg = imgA;
        let hiddenImg = imgB;
        let currentIndex = 0;
        let pendingIndex = null;

        // Pre-select winner
        const winnerIndex = Math.floor(Math.random() * unwatchedItems.length);
        const winner = unwatchedItems[winnerIndex];

        // Set initial image
        activeImg.src = unwatchedItems[0].imageUrl;

        const start = performance.now();
        let lastChange = start;
        let lastTick = 0;

        const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

        function swapToRandomImage() {
            let idx;
            if (unwatchedItems.length <= 1) {
                idx = 0;
            } else {
                do {
                    idx = Math.floor(Math.random() * unwatchedItems.length);
                } while (idx === currentIndex || idx === pendingIndex);
            }

            const item = unwatchedItems[idx];
            pendingIndex = idx;

            hiddenImg.src = item.imageUrl;
            hiddenImg.alt = item.Name;

            requestAnimationFrame(() => {
                activeImg.classList.remove('active');
                hiddenImg.classList.add('active');
                [activeImg, hiddenImg] = [hiddenImg, activeImg];
                currentIndex = idx;
                pendingIndex = null;
            });
        }

        function frame(now) {
            const elapsed = now - start;
            const t = Math.min(elapsed / config.totalDuration, 1);
            const eased = easeOutCubic(t);

            // Calculate interval
            let interval = config.minInterval + (config.maxInterval - config.minInterval) * eased;

            // Anticipation stutters
            if (t > config.anticipationStart) {
                const phase = (t - config.anticipationStart) / (1 - config.anticipationStart);
                const beats = 3;
                const beatPos = Math.floor(phase * beats);
                const beatStart = config.anticipationStart + (beatPos / beats) * (1 - config.anticipationStart);
                const beatEnd = beatStart + (config.anticipationDwell / config.totalDuration);
                if (t >= beatStart && t <= beatEnd) {
                    interval = Math.max(interval, config.anticipationDwell);
                }
            }

            // Update progress ring
            ring.style.setProperty('--progress', t.toFixed(3));

            // Speed-based blur
            const speedRatio = (config.maxInterval - interval) / (config.maxInterval - config.minInterval);
            stage.style.setProperty('--blur', (config.maxBlur * speedRatio).toFixed(2) + 'px');
            stage.style.setProperty('--vignette', (0.25 + speedRatio * 0.5).toFixed(2));

            // Subtle scale while spinning
            stage.style.transform = `scale(${(1 + 0.04 * speedRatio).toFixed(3)})`;

            // Swap images
            if (now - lastChange >= interval) {
                lastChange = now;
                swapToRandomImage();

                // Play tick sound (rate limited)
                if (now - lastTick > config.minTickGap) {
                    tickSound();
                    lastTick = now;
                }
            }

            if (elapsed < config.totalDuration) {
                requestAnimationFrame(frame);
            } else {
                settle(winner);
            }
        }

        requestAnimationFrame(frame);
    }

    /**
     * Settle animation on winner
     */
    function settle(winner) {
        const stage = document.getElementById('rouletteStage');
        const flash = document.getElementById('rouletteFlash');
        const heading = document.getElementById('rouletteHeading');
        const imgA = document.getElementById('rouletteImgA');
        const imgB = document.getElementById('rouletteImgB');
        const controls = document.getElementById('rouletteControls');

        // Set winner image
        const activeImg = imgA.classList.contains('active') ? imgA : imgB;
        activeImg.src = winner.imageUrl;
        activeImg.alt = winner.Name;

        // Reset blur and vignette
        stage.style.setProperty('--blur', '0px');
        stage.style.setProperty('--vignette', '0.35');

        // Thunk animation
        stage.style.animation = 'none';
        void stage.offsetWidth; // Force reflow
        stage.style.animation = 'thunk 260ms cubic-bezier(.2,.7,.2,1) forwards';

        // Flash effect
        flash.classList.remove('pop');
        void flash.offsetWidth;
        flash.classList.add('pop');

        // Show heading
        heading.textContent = winner.Name;
        heading.classList.add('show');

        // Final tick sound
        tickSound();

        // Confetti
        burstConfetti();

		// Show final action buttons
		controls.innerHTML = `
			<button class="roulette-btn" id="rouletteWatchBtn">${buttonTexts.playIt}</button>
			<button class="roulette-btn" id="rouletteRerollBtn">${buttonTexts.reroll}</button>
			<button class="roulette-btn secondary" id="rouletteShowListBtn2">${buttonTexts.showList}</button>
		`;

        const watchBtn = document.getElementById('rouletteWatchBtn');
		const rerollBtn = document.getElementById('rouletteRerollBtn');
        const showListBtn2 = document.getElementById('rouletteShowListBtn2');

        watchBtn.addEventListener('click', () => {
            closeModal();
            navigateToItem(winner.Id);
        });

		rerollBtn.addEventListener('click', () => {
			// Prepare for another roll
			heading.classList.remove('show');
			// Clear controls during reroll to avoid accidental clicks
			controls.innerHTML = '';
			// Start animation again using existing unwatchedItems
			runSlotAnimation();
		});

        showListBtn2.addEventListener('click', () => {
            handleShowList(currentPlaylistId);
        });

		// Move focus to the new primary action
		requestAnimationFrame(() => {
			try { watchBtn && watchBtn.focus({ preventScroll: true }); } catch (_) { /* no-op */ }
		});

		// Ensure tab trapping continues after controls update
		document.addEventListener('keydown', handleKeydown, true);
    }

    /**
     * Navigate to item details page
     */
    function navigateToItem(itemId) {
        const ApiClient = window.ApiClient;
        const serverId = ApiClient.serverId ? ApiClient.serverId() : ApiClient.serverInfo().Id;
        const detailsUrl = '/web/index.html#!/details?id=' + itemId + '&serverId=' + serverId;
        console.log('[Roulette] Navigating to item:', itemId);
        window.location.href = detailsUrl;
    }

    /**
     * Confetti burst animation
     */
    function burstConfetti() {
        const canvas = document.getElementById('rouletteConfetti');
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;

        const pieces = Array.from({length: config.confettiCount}, () => ({
            x: Math.random() * W,
            y: H + Math.random() * 30,
            s: 2 + Math.random() * 4,
            r: Math.random() * Math.PI * 2,
            v: 2 + Math.random() * 3,
            w: (Math.random() - 0.5) * 0.25,
            c: `hsl(${Math.floor(Math.random() * 360)} 90% 60%)`
        }));

        const start = performance.now();

        function tick(now) {
            const t = (now - start) / 950;
            ctx.clearRect(0, 0, W, H);

            for (const p of pieces) {
                p.y -= p.v;
                p.x += Math.sin(p.y * 0.05) * 0.6;
                p.r += p.w;

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.r);
                ctx.fillStyle = p.c;
                ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 1.6);
                ctx.restore();
            }

            if (t < 1) {
                requestAnimationFrame(tick);
            } else {
                ctx.clearRect(0, 0, W, H);
            }
        }

        requestAnimationFrame(tick);
    }

    /**
     * Handle "Show List" - navigate to normal playlist view
     */
    function handleShowList(playlistId) {
        console.log('[Roulette] Show List selected');
        closeModal();
        // Navigate to playlist details page (same as navigateToItem)
        const ApiClient = window.ApiClient;
        const serverId = ApiClient.serverId ? ApiClient.serverId() : ApiClient.serverInfo().Id;
        const playlistUrl = '/web/index.html#!/details?id=' + playlistId + '&serverId=' + serverId;
        window.location.href = playlistUrl;
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
