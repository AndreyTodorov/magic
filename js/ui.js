/**
 * UI MODULE
 * Handles all DOM manipulation and UI rendering
 */

class UIManager {
  constructor() {
    this.elements = {};
    this.currentSection = null;
    this.currentView = "matches";
    this.localStorageKey = "mm_selected_view";
    // Tracks whether the user explicitly collapsed/expanded the tournament code
    // null = no explicit user action yet, true = user collapsed, false = user expanded
    this.codeDisplayUserCollapsed = null;
    // Track the currently selected round/stage for filtering matches
    this.selectedRound = null;
    this.selectedStage = null;
  }

  /**
   * Cache DOM elements
   */
  cacheElements() {
    this.elements = {
      // Sections
      modeSelector: document.getElementById("modeSelector"),
      joinSection: document.getElementById("joinSection"),
      formatSelectionSection: document.getElementById("formatSelectionSection"),
      createSection: document.getElementById("createSection"),
      tournamentSection: document.getElementById("tournamentSection"),
      // View tabs
      viewTabs: document.getElementById("viewTabs"),
      tabSchedule: document.getElementById("tabSchedule"),
      tabStandings: document.getElementById("tabStandings"),
      tabMatches: document.getElementById("tabMatches"),

      // Visible sub-sections inside tournament view
      scheduleInfo: document.getElementById("scheduleInfo"),
      standingsPanel: document.getElementById("standingsPanel"),

      // Forms
      joinForm: document.getElementById("joinForm"),
      tournamentCode: document.getElementById("tournamentCode"),
      joinSubmitBtn: document.getElementById("joinSubmitBtn"),
      joinError: document.getElementById("joinError"),

      // Format selection
      formatGrid: document.getElementById("formatGrid"),
      backToModeBtn: document.getElementById("backToModeBtn"),
      backToFormatBtn: document.getElementById("backToFormatBtn"),
      selectedFormatTitle: document.getElementById("selectedFormatTitle"),
      formatConfigContainer: document.getElementById("formatConfigContainer"),
      matchesPerPlayerContainer: document.getElementById("matchesPerPlayerContainer"),

      playerCount: document.getElementById("playerCount"),
      matchesPerPlayer: document.getElementById("matchesPerPlayer"),
      matchesInfo: document.getElementById("matchesInfo"),
      playerInputs: document.getElementById("playerInputs"),
      generateBtn: document.getElementById("generateBtn"),

      // Tournament view
      codeDisplay: document.getElementById("codeDisplay"),
      displayCode: document.getElementById("displayCode"),
      copyCodeBtn: document.getElementById("copyCodeBtn"),
      leaveTournamentBtn: document.getElementById("leaveTournamentBtn"),

      progressFill: document.getElementById("progressFill"),
      progressText: document.getElementById("progressText"),
      tournamentInfo: document.getElementById("tournamentInfo"),
      formatBadge: document.getElementById("formatBadge"),
      stageBadge: document.getElementById("stageBadge"),
      stageAdvancement: document.getElementById("stageAdvancement"),
      advanceStageBtn: document.getElementById("advanceStageBtn"),
      advanceStageText: document.getElementById("advanceStageText"),
      gamesPerPlayer: document.getElementById("gamesPerPlayer"),
      scheduleGrid: document.getElementById("scheduleGrid"),
      standingsTable: document.getElementById("standingsTable"),
      matchesContainer: document.getElementById("matchesContainer"),
      // Scoring legend (expandable explanation)
      scoringLegend: document.getElementById("scoringLegend"),
      scoringLegendDetails: document.getElementById("scoringLegendDetails"),
      // Round/stage navigation
      roundNavigation: document.getElementById("roundNavigation"),
      roundNavigationButtons: document.getElementById("roundNavigationButtons"),
    };

    // Restore saved view (if any)
    try {
      const saved = localStorage.getItem(this.localStorageKey);
      if (
        saved === "schedule" ||
        saved === "standings" ||
        saved === "matches"
      ) {
        this.currentView = saved;
      }
    } catch (e) {
      // Ignore storage errors (private browsing mode, etc.)
      console.warn("Failed to restore view from localStorage:", e);
    }

    // Attach toggle handler for scoring legend (click and keyboard)
    try {
      const legend = this.elements.scoringLegend;
      const details = this.elements.scoringLegendDetails;
      if (legend && details) {
        const toggle = (e) => {
          // allow clicks from inner elements
          const expanded = legend.getAttribute("aria-expanded") === "true";
          legend.setAttribute("aria-expanded", (!expanded).toString());
          if (expanded) {
            details.hidden = true;
            legend.classList.remove("expanded");
          } else {
            details.hidden = false;
            legend.classList.add("expanded");
          }
        };

        legend.addEventListener("click", toggle);
        legend.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            toggle();
          }
        });
      }
    } catch (err) {
      // fail silently if DOM not ready
      console.warn("scoring legend init failed", err);
    }

    // Attach toggle handler for code display (click title to expand/collapse, and not the whole box, because copying code will close it)
    try {
      const codeDisplay = this.elements.codeDisplay;
      if (codeDisplay) {
        // find title element inside codeDisplay
        const title = codeDisplay.querySelector(".code-display__title");
        if (title) {
          // Make it keyboard accessible
          title.setAttribute("tabindex", "0");
          title.setAttribute("role", "button");
          title.setAttribute("aria-expanded", "false");

          const toggleCodeDisplay = (e) => {
            const collapsed = codeDisplay.classList.toggle("collapsed");
            title.setAttribute("aria-expanded", (!collapsed).toString());
            // Record that the user explicitly toggled the code display so
            // programmatic re-renders respect their choice unless forced.
            this.codeDisplayUserCollapsed = collapsed;
          };

          title.addEventListener("click", toggleCodeDisplay);
          title.addEventListener("keydown", (ev) => {
            if (ev.key === "Enter" || ev.key === " ") {
              ev.preventDefault();
              toggleCodeDisplay();
            }
          });
        }
      }
    } catch (err) {
      console.warn("code display init failed", err);
    }
  }

  /**
   * Show specific sections
   */
  showSection(sectionName) {
    // Hide all sections
    [
      "modeSelector",
      "joinSection",
      "formatSelectionSection",
      "createSection",
      "tournamentSection",
    ].forEach((section) => {
      const el = this.elements[section];
      if (el) el.classList.remove("active");
    });

    // sectionName can be an array to show multiple sections
    if (Array.isArray(sectionName)) {
      sectionName.forEach((name) => {
        const section = this.elements[name];
        if (section) {
          section.classList.add("active");
        }
      });
    } else {
      // Show requested section
      const section = this.elements[sectionName];
      if (section) {
        section.classList.add("active");
        this.currentSection = sectionName;
        // When entering the tournament section, ensure the selected view is applied
        if (sectionName === "tournamentSection") {
          this.switchView(this.currentView || "matches");
        }
      }
    }
  }

  /**
   * Switch which part of the tournament view is visible: 'schedule' | 'standings' | 'matches'
   */
  switchView(viewName, shouldRender = false) {
    const scheduleEl = this.elements.scheduleInfo;
    const standingsEl = this.elements.standingsPanel;
    const matchesEl = this.elements.matchesContainer;

    if (!scheduleEl || !standingsEl || !matchesEl) return;

    // hide all
    scheduleEl.classList.add("view-hidden");
    standingsEl.classList.add("view-hidden");
    matchesEl.classList.add("view-hidden");

    // reset tab buttons
    ["tabSchedule", "tabStandings", "tabMatches"].forEach((k) => {
      const btn = this.elements[k];
      if (btn) {
        btn.classList.remove("active");
        btn.setAttribute("aria-pressed", "false");
      }
    });

    // persist selection
    try {
      localStorage.setItem(this.localStorageKey, viewName);
    } catch (e) {
      // Ignore storage errors (quota exceeded, private browsing, etc.)
      console.warn("Failed to save view to localStorage:", e);
    }

    const previousView = this.currentView;

    // show selected
    if (viewName === "schedule") {
      scheduleEl.classList.remove("view-hidden");
      this.elements.tabSchedule?.classList.add("active");
      this.elements.tabSchedule?.setAttribute("aria-pressed", "true");
      this.currentView = "schedule";
    } else if (viewName === "standings") {
      standingsEl.classList.remove("view-hidden");
      this.elements.tabStandings?.classList.add("active");
      this.elements.tabStandings?.setAttribute("aria-pressed", "true");
      this.currentView = "standings";
    } else {
      // default to matches
      matchesEl.classList.remove("view-hidden");
      this.elements.tabMatches?.classList.add("active");
      this.elements.tabMatches?.setAttribute("aria-pressed", "true");
      this.currentView = "matches";
    }

    // Return true if view changed (used by app.js to trigger render)
    return previousView !== this.currentView;
  }

  /**
   * Show error message
   */
  showError(elementId, message, duration = 5000) {
    const el = document.getElementById(elementId);
    if (!el) return;

    el.innerHTML = `<div class="alert alert--error">${message}</div>`;

    if (duration > 0) {
      setTimeout(() => {
        el.innerHTML = "";
      }, duration);
    }
  }

  /**
   * Clear error message
   */
  clearError(elementId) {
    const el = document.getElementById(elementId);
    if (el) el.innerHTML = "";
  }

  /**
   * Show temporary alert message (replaces browser alert)
   */
  showAlert(message, type = "error", duration = 5000) {
    // Create alert container if it doesn't exist
    let alertContainer = document.getElementById("alertContainer");
    if (!alertContainer) {
      alertContainer = document.createElement("div");
      alertContainer.id = "alertContainer";
      alertContainer.className = "alert-container";
      document.body.appendChild(alertContainer);
    }

    // Create alert element
    const alertEl = document.createElement("div");
    alertEl.className = `alert alert--${type} alert--popup`;
    alertEl.setAttribute("role", "alert");
    alertEl.innerHTML = `
      <div class="alert__content">${this.escapeHtml(message)}</div>
      <button class="alert__close" aria-label="Close">&times;</button>
    `;

    // Add to container
    alertContainer.appendChild(alertEl);

    // Handle close button
    const closeBtn = alertEl.querySelector(".alert__close");
    const removeAlert = () => {
      alertEl.classList.add("alert--removing");
      setTimeout(() => alertEl.remove(), 300);
    };
    closeBtn.addEventListener("click", removeAlert);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(removeAlert, duration);
    }

    return alertEl;
  }

  /**
   * Set button loading state
   */
  setButtonLoading(button, isLoading, loadingText = "Loading...") {
    if (!button) return;

    if (isLoading) {
      button.dataset.originalText = button.textContent;
      button.textContent = loadingText;
      button.disabled = true;
    } else {
      button.textContent = button.dataset.originalText || button.textContent;
      button.disabled = false;
      delete button.dataset.originalText;
    }
  }

  /**
   * Update matches-per-player options
   */
  updateMatchesPerPlayerOptions(playerCount) {
    const select = this.elements.matchesPerPlayer;
    if (!select) return;

    const validOptions =
      tournamentManager.getValidMatchesPerPlayer(playerCount);
    select.innerHTML = "";

    validOptions.forEach((option) => {
      const opt = document.createElement("option");
      opt.value = option;
      opt.textContent = `${option} ${option === 1 ? "Match" : "Matches"}`;
      select.appendChild(opt);
    });

    // Select middle option
    const middleIndex = Math.floor(validOptions.length / 2);
    select.selectedIndex = middleIndex;

    return validOptions[middleIndex];
  }

  /**
   * Update tournament info display
   */
  updateTournamentInfo(playerCount, matchesPerPlayer) {
    const totalMatches = tournamentManager.getTotalMatches(
      playerCount,
      matchesPerPlayer
    );

    if (this.elements.matchesInfo) {
      this.elements.matchesInfo.innerHTML = `
        <strong>Tournament Details:</strong><br>
        ${playerCount} players × ${matchesPerPlayer} ${
        matchesPerPlayer === 1 ? "match" : "matches"
      } each =
        <strong>${totalMatches} total ${
        totalMatches === 1 ? "match" : "matches"
      }</strong>
      `;
    }
  }

  /**
   * Render player input fields
   */
  renderPlayerInputs(playerCount) {
    const container = this.elements.playerInputs;
    if (!container) return;

    container.innerHTML = "";

    for (let i = 1; i <= playerCount; i++) {
      const inputGroup = document.createElement("div");
      inputGroup.className = "form-group";
      inputGroup.innerHTML = `
        <label for="p${i}" class="form-label">Player ${i}</label>
        <input
          type="text"
          id="p${i}"
          name="player-name"
          class="form-input"
          placeholder="Enter name"
          required
          data-player-index="${i}">
        <span class="form-error">⚠️ Duplicate name</span>
      `;
      container.appendChild(inputGroup);
    }
  }

  /**
   * Check for duplicate player names
   * OPTIMIZED: Uses querySelector to get all inputs at once
   */
  checkDuplicateNames(playerCount) {
    // Get all player inputs at once instead of querying individually
    const inputs = this.elements.playerInputs?.querySelectorAll('[data-player-index]') || [];
    const names = [];

    // Clear error states and collect names
    inputs.forEach((input) => {
      input.classList.remove("form-input--error");
      names.push(input.value.trim());
    });

    const validation = tournamentManager.validatePlayerNames(names);

    // Mark duplicates
    if (validation.duplicates.length > 0) {
      validation.duplicates.forEach((dup) => {
        dup.indices.forEach((idx) => {
          if (inputs[idx]) {
            inputs[idx].classList.add("form-input--error");
          }
        });
      });
    }

    // Update button state
    if (this.elements.generateBtn) {
      this.elements.generateBtn.disabled = !validation.isValid;
    }

    return validation.isValid;
  }

  /**
   * Display tournament code
   */
  displayTournamentCode(code) {
    if (this.elements.displayCode) {
      this.elements.displayCode.textContent = code;
    }
    if (this.elements.codeDisplay) {
      this.elements.codeDisplay.style.display = "block";
      // Start collapsed (so it doesn't take too much space); user can expand
      // Force initial collapsed state when first displaying the code
      this.setCodeDisplayCollapsed({ collapsed: true, force: true });
    }
  }

  /**
   * Collapse or expand the code display programmatically
   */
  setCodeDisplayCollapsed(collapsed) {
    // New signature: setCodeDisplayCollapsed(collapsed, options = {})
    // options.force: when true, apply the change even if the user has
    // explicitly toggled the code display. When false (default), do not
    // override a user's explicit choice.
    const el = this.elements.codeDisplay;
    if (!el) return;

    // Support backward-compatible single-argument calls where callers may
    // pass only a boolean. If a caller passed an options object, handle it.
    let force = false;
    // If more than one argument was passed, the second arg will be in
    // arguments[1] when invoked. But to keep simple and avoid breaking
    // call-sites, detect if collapsed is an object.
    if (typeof collapsed === "object" && collapsed !== null) {
      const opts = collapsed;
      collapsed = !!opts.collapsed;
      force = !!opts.force;
    } else if (arguments.length > 1) {
      const opts = arguments[1] || {};
      force = !!opts.force;
    }

    // If the user explicitly toggled the display and we're not forcing, do
    // not change their preference. If user has not toggled (null) or force
    // is true, apply the requested state.
    if (this.codeDisplayUserCollapsed !== null && !force) {
      // Respect user's explicit preference; do not programmatically change.
      return;
    }

    if (collapsed) {
      el.classList.add("collapsed");
      const title = el.querySelector(".code-display__title");
      if (title) title.setAttribute("aria-expanded", "false");
    } else {
      el.classList.remove("collapsed");
      const title = el.querySelector(".code-display__title");
      if (title) title.setAttribute("aria-expanded", "true");
    }
  }

  /**
   * Copy tournament code to clipboard
   */
  async copyTournamentCode() {
    const code = this.elements.displayCode?.textContent;
    if (!code) return;

    try {
      await navigator.clipboard.writeText(code);

      const btn = this.elements.copyCodeBtn;
      if (btn) {
        const originalText = btn.textContent;
        btn.textContent = "✓ Copied!";
        btn.style.background = "var(--color-success)";

        setTimeout(() => {
          btn.textContent = originalText;
          btn.style.background = "";
        }, 2000);
      }
    } catch (error) {
      console.error("Failed to copy:", error);
      alert("Failed to copy code. Code: " + code);
    }
  }

  /**
   * Render player schedule
   * OPTIMIZED: Pre-computes player-to-matches map to avoid O(n²) filtering
   * Format-specific visualizations for better UX
   */
  renderSchedule(players, matches, format = null, currentStage = null) {
    const container = this.elements.scheduleGrid;
    if (!container) return;

    container.innerHTML = "";

    // Pre-compute player-to-matches lookup (O(n) instead of O(n²))
    const playerMatchesMap = new Map();
    matches.forEach((match) => {
      if (!playerMatchesMap.has(match.player1)) {
        playerMatchesMap.set(match.player1, []);
      }
      if (!playerMatchesMap.has(match.player2)) {
        playerMatchesMap.set(match.player2, []);
      }
      playerMatchesMap.get(match.player1).push(match);
      playerMatchesMap.get(match.player2).push(match);
    });

    // Use DocumentFragment for batch DOM insertion
    const fragment = document.createDocumentFragment();

    // Choose rendering method based on format
    if (format === TOURNAMENT_FORMATS.SINGLE_ELIMINATION ||
        format === TOURNAMENT_FORMATS.DOUBLE_ELIMINATION) {
      this.renderEliminationSchedule(fragment, players, playerMatchesMap);
    } else if (format === TOURNAMENT_FORMATS.SWISS) {
      this.renderSwissSchedule(fragment, players, playerMatchesMap, matches);
    } else if (format === TOURNAMENT_FORMATS.GROUP_STAGE) {
      this.renderGroupStageSchedule(fragment, players, playerMatchesMap, currentStage);
    } else {
      // Default: Round Robin or unknown format
      this.renderDefaultSchedule(fragment, players, playerMatchesMap);
    }

    container.appendChild(fragment);
  }

  /**
   * Render default schedule (Round Robin)
   */
  renderDefaultSchedule(fragment, players, playerMatchesMap) {
    players.forEach((player, index) => {
      const playerMatches = playerMatchesMap.get(index) || [];

      const opponents = playerMatches.map((m) => {
        const opponentIndex = m.player1 === index ? m.player2 : m.player1;
        return players[opponentIndex];
      });

      const allCompleted =
        playerMatches.length > 0 &&
        playerMatches.every((m) => m.winner !== null);

      const scheduleItem = document.createElement("div");
      scheduleItem.className = `schedule-item${
        allCompleted ? " completed" : ""
      }`;

      const statusHtml = allCompleted
        ? `<div class="player-status">Done</div>`
        : "";

      scheduleItem.innerHTML = `
        <div class="schedule-item__title">
          <strong>${this.escapeHtml(player)}</strong>
          ${statusHtml}
        </div>
        <div class="schedule-item__opponents">vs ${opponents
          .map((o) => this.escapeHtml(o))
          .join(", ")}</div>
      `;

      fragment.appendChild(scheduleItem);
    });
  }

  /**
   * Render elimination bracket schedule (shows progression path)
   */
  renderEliminationSchedule(fragment, players, playerMatchesMap) {
    players.forEach((player, index) => {
      const playerMatches = playerMatchesMap.get(index) || [];

      // Group matches by round/bracket
      const matchesByRound = {};
      let isInLosersBracket = false;

      playerMatches.forEach((m) => {
        if (m.isPlaceholder && m.player1 === null && m.player2 === null) {
          return; // Skip empty placeholders
        }

        const round = m.round || 1;
        if (!matchesByRound[round]) matchesByRound[round] = [];
        matchesByRound[round].push(m);

        // Check if player is in losers bracket
        if (m.bracket === 'losers') {
          isInLosersBracket = true;
        }
      });

      // Find player's current status
      let isEliminated = false;
      let currentRound = null;
      const rounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);

      for (const round of rounds) {
        const roundMatches = matchesByRound[round];
        const hasUnfinished = roundMatches.some((m) => m.winner === null);

        if (hasUnfinished) {
          currentRound = round;
          break;
        }

        // Check if lost this round
        const lost = roundMatches.some((m) => {
          const isPlayer1 = m.player1 === index;
          return m.winner !== null && m.winner !== (isPlayer1 ? 1 : 2);
        });

        // Check if this loss was in losers bracket (means elimination in double elim)
        const inLosersBracket = roundMatches.some((m) => m.bracket === 'losers');

        if (lost && inLosersBracket) {
          isEliminated = true;
        }
      }

      const allCompleted =
        playerMatches.length > 0 &&
        playerMatches.every((m) => m.winner !== null || m.isPlaceholder);

      const scheduleItem = document.createElement("div");
      scheduleItem.className = `schedule-item${
        allCompleted ? " completed" : ""
      }${isEliminated ? " eliminated" : ""}`;

      // Determine if this player is the champion
      // Champion = won all matches AND won the final round
      let isChampion = false;
      if (allCompleted && !isEliminated && rounds.length > 0) {
        const finalRound = rounds[rounds.length - 1];
        const finalMatches = matchesByRound[finalRound];
        if (finalMatches && finalMatches.length > 0) {
          const finalMatch = finalMatches[0];
          const isWin = finalMatch.winner === (finalMatch.player1 === index ? 1 : 2);
          isChampion = isWin;
        }
      }

      let statusHtml = "";
      if (isEliminated) {
        statusHtml = `<div class="player-status eliminated">Eliminated</div>`;
      } else if (isChampion) {
        statusHtml = `<div class="player-status">Champion 🏆</div>`;
      } else if (allCompleted) {
        // Completed but not champion = placed (e.g., 2nd, 3rd-4th, etc.)
        statusHtml = `<div class="player-status">Eliminated</div>`;
      } else if (currentRound) {
        const roundName = this.getRoundName(currentRound, rounds.length);
        statusHtml = `<div class="player-status active">→ ${roundName}</div>`;
      }

      // Build bracket path display
      let pathHtml = '<div class="bracket-path">';
      rounds.forEach((round, idx) => {
        const roundMatches = matchesByRound[round];
        const match = roundMatches[0]; // Should only be one match per round per player
        const opponentIndex = match.player1 === index ? match.player2 : match.player1;
        const opponentName = opponentIndex !== null ? players[opponentIndex] : 'TBD';
        const roundName = this.getRoundName(round, rounds.length);

        const isWin = match.winner === (match.player1 === index ? 1 : 2);
        const isLoss = match.winner !== null && !isWin;
        const isPending = match.winner === null && !match.isPlaceholder;

        let matchStatus = '';
        if (isWin) matchStatus = '✓';
        else if (isLoss) matchStatus = '✗';
        else if (isPending) matchStatus = '○';
        else matchStatus = '—';

        const bracketLabel = match.bracket === 'losers' ? ' (L)' : '';

        pathHtml += `
          <div class="bracket-round ${isPending ? 'active' : ''} ${isWin ? 'win' : ''} ${isLoss ? 'loss' : ''}">
            <span class="round-label">${roundName}${bracketLabel}</span>
            <span class="match-status">${matchStatus}</span>
            <span class="opponent">vs ${this.escapeHtml(opponentName)}</span>
          </div>
        `;
      });
      pathHtml += '</div>';

      scheduleItem.innerHTML = `
        <div class="schedule-item__title">
          <strong>${this.escapeHtml(player)}</strong>
          ${statusHtml}
        </div>
        ${pathHtml}
      `;

      fragment.appendChild(scheduleItem);
    });
  }

  /**
   * Render Swiss tournament schedule (current vs future rounds)
   */
  renderSwissSchedule(fragment, players, playerMatchesMap, allMatches) {
    // Determine current round
    let currentRound = 1;
    const swissMatches = allMatches.filter((m) => m.round !== undefined);
    if (swissMatches.length > 0) {
      const completedRounds = new Set();
      swissMatches.forEach((m) => {
        if (m.winner !== null && !m.isPlaceholder) {
          completedRounds.add(m.round);
        }
      });

      if (completedRounds.size > 0) {
        currentRound = Math.max(...completedRounds);
        // Check if current round is fully complete
        const currentRoundMatches = swissMatches.filter((m) => m.round === currentRound);
        const allComplete = currentRoundMatches.every((m) => m.winner !== null || m.isPlaceholder);
        if (allComplete) {
          currentRound++;
        }
      }
    }

    players.forEach((player, index) => {
      const playerMatches = playerMatchesMap.get(index) || [];

      // Split matches into current and future
      const currentMatches = [];
      const futureMatches = [];
      const pastMatches = [];

      playerMatches.forEach((m) => {
        if (m.isPlaceholder && m.player1 === null && m.player2 === null) {
          return;
        }

        if (m.round < currentRound) {
          pastMatches.push(m);
        } else if (m.round === currentRound) {
          currentMatches.push(m);
        } else {
          futureMatches.push(m);
        }
      });

      const allCompleted =
        playerMatches.length > 0 &&
        playerMatches.every((m) => m.winner !== null || m.isPlaceholder);

      const scheduleItem = document.createElement("div");
      scheduleItem.className = `schedule-item${
        allCompleted ? " completed" : ""
      }`;

      const statusHtml = allCompleted
        ? `<div class="player-status">Done</div>`
        : currentMatches.length > 0
        ? `<div class="player-status active">→ Round ${currentRound}</div>`
        : "";

      let matchesHtml = '<div class="swiss-rounds">';

      // Current round (highlighted)
      if (currentMatches.length > 0) {
        matchesHtml += '<div class="round-section current">';
        matchesHtml += `<div class="round-header">⚡ Round ${currentRound}</div>`;
        currentMatches.forEach((m) => {
          const opponentIndex = m.player1 === index ? m.player2 : m.player1;
          const opponentName = opponentIndex !== null ? players[opponentIndex] : 'BYE';
          matchesHtml += `<div class="round-match">vs ${this.escapeHtml(opponentName)}</div>`;
        });
        matchesHtml += '</div>';
      }

      // Future rounds (grayed out)
      if (futureMatches.length > 0) {
        matchesHtml += '<div class="round-section future">';
        matchesHtml += '<div class="round-header">Upcoming Rounds</div>';
        matchesHtml += '<div class="round-match tbd">Pairings TBD</div>';
        matchesHtml += '</div>';
      }

      matchesHtml += '</div>';

      scheduleItem.innerHTML = `
        <div class="schedule-item__title">
          <strong>${this.escapeHtml(player)}</strong>
          ${statusHtml}
        </div>
        ${matchesHtml}
      `;

      fragment.appendChild(scheduleItem);
    });
  }

  /**
   * Render Group Stage schedule (groups vs playoffs)
   */
  renderGroupStageSchedule(fragment, players, playerMatchesMap, currentStage) {
    players.forEach((player, index) => {
      const playerMatches = playerMatchesMap.get(index) || [];

      // Split matches by stage
      const groupMatches = [];
      const playoffMatches = [];

      playerMatches.forEach((m) => {
        if (m.isPlaceholder && m.player1 === null && m.player2 === null) {
          return;
        }

        if (m.stage === 'groups') {
          groupMatches.push(m);
        } else if (m.stage === 'playoffs') {
          playoffMatches.push(m);
        }
      });

      const allCompleted =
        playerMatches.length > 0 &&
        playerMatches.every((m) => m.winner !== null || m.isPlaceholder);

      const groupsComplete = groupMatches.every((m) => m.winner !== null);
      const inPlayoffs = playoffMatches.length > 0;

      const scheduleItem = document.createElement("div");
      scheduleItem.className = `schedule-item${
        allCompleted ? " completed" : ""
      }`;

      let statusHtml = "";
      if (allCompleted) {
        statusHtml = `<div class="player-status">Done</div>`;
      } else if (inPlayoffs && !groupsComplete) {
        statusHtml = `<div class="player-status active">→ Playoffs</div>`;
      } else if (groupsComplete && !inPlayoffs) {
        statusHtml = `<div class="player-status eliminated">Did not advance</div>`;
      }

      let matchesHtml = '<div class="group-stage-schedule">';

      // Group stage matches
      if (groupMatches.length > 0) {
        const groupName = groupMatches[0].group || '?';
        matchesHtml += `<div class="stage-section ${groupsComplete ? 'completed' : ''}">`;
        matchesHtml += `<div class="stage-header">📦 Group ${groupName}</div>`;

        groupMatches.forEach((m) => {
          const opponentIndex = m.player1 === index ? m.player2 : m.player1;
          const opponentName = players[opponentIndex];
          const isWon = m.winner === (m.player1 === index ? 1 : 2);
          const isLost = m.winner !== null && !isWon;
          const statusIcon = isWon ? '✓' : isLost ? '✗' : '○';

          matchesHtml += `<div class="stage-match ${isWon ? 'win' : ''} ${isLost ? 'loss' : ''}">`;
          matchesHtml += `<span class="match-status">${statusIcon}</span> vs ${this.escapeHtml(opponentName)}`;
          matchesHtml += '</div>';
        });
        matchesHtml += '</div>';
      }

      // Playoff matches
      if (playoffMatches.length > 0) {
        matchesHtml += '<div class="stage-section playoffs">';
        matchesHtml += '<div class="stage-header">🏆 Playoffs</div>';

        playoffMatches.forEach((m) => {
          const opponentIndex = m.player1 === index ? m.player2 : m.player1;
          const opponentName = opponentIndex !== null ? players[opponentIndex] : 'TBD';
          const roundName = this.getRoundName(m.round, 4); // Assume max 4 rounds for playoffs
          const isWon = m.winner === (m.player1 === index ? 1 : 2);
          const isLost = m.winner !== null && !isWon;
          const isPending = m.winner === null && !m.isPlaceholder;
          const statusIcon = isWon ? '✓' : isLost ? '✗' : isPending ? '○' : '—';

          matchesHtml += `<div class="stage-match ${isWon ? 'win' : ''} ${isLost ? 'loss' : ''} ${isPending ? 'active' : ''}">`;
          matchesHtml += `<span class="match-status">${statusIcon}</span> ${roundName}: vs ${this.escapeHtml(opponentName)}`;
          matchesHtml += '</div>';
        });
        matchesHtml += '</div>';
      }

      matchesHtml += '</div>';

      scheduleItem.innerHTML = `
        <div class="schedule-item__title">
          <strong>${this.escapeHtml(player)}</strong>
          ${statusHtml}
        </div>
        ${matchesHtml}
      `;

      fragment.appendChild(scheduleItem);
    });
  }

  /**
   * Get friendly round name for elimination brackets
   */
  getRoundName(round, totalRounds) {
    const roundsFromEnd = totalRounds - round;

    if (roundsFromEnd === 0) return 'Finals';
    if (roundsFromEnd === 1) return 'Semifinals';
    if (roundsFromEnd === 2) return 'Quarterfinals';

    return `Round ${round}`;
  }

  /**
   * Render round/stage navigation for tournaments with rounds
   */
  renderRoundNavigation(matches, format) {
    const navContainer = this.elements.roundNavigation;
    const buttonsContainer = this.elements.roundNavigationButtons;

    if (!navContainer || !buttonsContainer) return;

    // Determine if this format needs round navigation
    const needsNavigation = format === TOURNAMENT_FORMATS.SWISS ||
                           format === TOURNAMENT_FORMATS.SINGLE_ELIMINATION ||
                           format === TOURNAMENT_FORMATS.DOUBLE_ELIMINATION;

    if (!needsNavigation || matches.length === 0) {
      navContainer.style.display = 'none';
      return;
    }

    // Get all unique rounds from matches
    const rounds = [...new Set(matches.map(m => m.round).filter(r => r !== undefined))].sort((a, b) => a - b);

    if (rounds.length <= 1) {
      // No need for navigation if there's only one round
      navContainer.style.display = 'none';
      return;
    }

    // Show navigation
    navContainer.style.display = 'block';
    buttonsContainer.innerHTML = '';

    // Set default selected round if not set
    if (this.selectedRound === null) {
      this.selectedRound = rounds[0];
    }

    // Create navigation buttons
    const fragment = document.createDocumentFragment();

    // Add "All" button for showing all rounds
    const allBtn = document.createElement('button');
    allBtn.className = 'round-nav-btn' + (this.selectedRound === 'all' ? ' active' : '');
    allBtn.textContent = 'All Rounds';
    allBtn.dataset.round = 'all';
    fragment.appendChild(allBtn);

    // Add round buttons
    rounds.forEach(round => {
      const btn = document.createElement('button');
      btn.className = 'round-nav-btn' + (this.selectedRound === round ? ' active' : '');

      // Get round label based on format
      const label = this.getRoundLabel(round, rounds.length, format);
      btn.textContent = label;
      btn.dataset.round = round;

      fragment.appendChild(btn);
    });

    buttonsContainer.appendChild(fragment);
  }

  /**
   * Get human-readable label for a round
   */
  getRoundLabel(round, totalRounds, format) {
    if (format === TOURNAMENT_FORMATS.SWISS) {
      return `Round ${round}`;
    }

    if (format === TOURNAMENT_FORMATS.SINGLE_ELIMINATION || format === TOURNAMENT_FORMATS.DOUBLE_ELIMINATION) {
      // Calculate elimination stage names
      const remainingRounds = totalRounds - round + 1;

      if (remainingRounds === 1) return 'Finals';
      if (remainingRounds === 2) return 'Semifinals';
      if (remainingRounds === 3) return 'Quarterfinals';

      return `Round ${round}`;
    }

    return `Round ${round}`;
  }

  /**
   * Set the selected round for filtering matches
   */
  setSelectedRound(round) {
    this.selectedRound = round;
  }

  /**
   * Render all matches
   * OPTIMIZED: Uses DocumentFragment for batch DOM insertion
   */
  renderMatches(matches, players, currentStage = null) {
    const container = this.elements.matchesContainer;
    if (!container) return;

    container.innerHTML = "";

    // Use DocumentFragment to batch DOM operations
    const fragment = document.createDocumentFragment();
    matches.forEach((match) => {
      if (!match || !match.games || !Array.isArray(match.games)) {
        console.warn("Invalid match data:", match);
        return;
      }

      // For multi-stage formats (Group Stage + Playoffs), only show matches from current stage
      if (currentStage && match.stage && match.stage !== currentStage) {
        return;
      }

      // Filter by selected round if set
      if (this.selectedRound !== null && this.selectedRound !== 'all') {
        if (match.round !== this.selectedRound) {
          return;
        }
      }

      // Skip matches that aren't ready to be displayed:
      // 1. Placeholder matches that haven't been fully populated
      // 2. Matches where either player is null (TBD), unless it's a BYE
      if (match.isPlaceholder) {
        return;
      }

      // Skip if player1 is missing (should never happen)
      if (match.player1 === null) {
        return;
      }

      // Skip if player2 is missing, unless it's a BYE match
      if (match.player2 === null && !match.isBye) {
        return;
      }

      const card = this.createMatchCard(match, players);
      fragment.appendChild(card);
    });
    container.appendChild(fragment);
  }

  /**
   * Update a single match card (for performance on mobile)
   * OPTIMIZED: Only updates the specific match that changed
   */
  updateSingleMatch(matchId, match, players) {
    const container = this.elements.matchesContainer;
    if (!container) return;

    // Find existing match card
    const existingCard = container.querySelector(`[data-match-id="${matchId}"]`);
    if (!existingCard) {
      // Card doesn't exist, do full render
      return false;
    }

    // Create new card
    const newCard = this.createMatchCard(match, players);

    // Replace old card with new one
    existingCard.replaceWith(newCard);
    return true;
  }

  /**
   * Create match card element
   */
  createMatchCard(match, players) {
    const card = document.createElement("div");
    card.className = "match-card";
    card.setAttribute("role", "listitem");
    card.setAttribute("data-match-id", match.id);

    if (match.winner !== null) {
      card.classList.add("completed");
    }

    // Handle BYE matches
    if (match.isBye) {
      const p1Name = players[match.player1];
      card.innerHTML = `
        <div class="match-card__header">
          <div class="match-number">${match.bracketPosition || `Match ${match.id + 1}`}</div>
          <div class="badge badge-bye">BYE</div>
        </div>
        <div class="match-players">
          <div class="player-row winner">
            <div class="player-name">${this.escapeHtml(p1Name)}</div>
            <div class="bye-text">Advances (BYE)</div>
          </div>
        </div>
      `;
      return card;
    }

    const p1Name = players[match.player1] || "TBD";
    const p2Name = players[match.player2] || "TBD";
    const p1Wins = match.games.filter((g) => g === 1).length;
    const p2Wins = match.games.filter((g) => g === 2).length;

    let winnerBanner = "";
    if (match.winner !== null) {
      const winnerName = match.winner === 1 ? p1Name : p2Name;
      winnerBanner = `<div class="winner-banner">${this.escapeHtml(
        winnerName
      )} wins!</div>`;
    }

    // Use bracket position if available (for elimination formats), otherwise use match number
    const matchLabel = match.bracketPosition || `Match ${match.id + 1}`;

    card.innerHTML = `
      <div class="match-card__header">
        <div class="match-number">${matchLabel}</div>
        <div class="badge">Best of 3</div>
      </div>

      <div class="match-score-display">${p1Wins} - ${p2Wins}</div>

      <div class="match-players">
        ${this.createPlayerRow(match, p1Name, 1, players)}
        ${this.createPlayerRow(match, p2Name, 2, players)}
      </div>

      ${winnerBanner}
    `;

    return card;
  }

  /**
   * Create player row in match card
   */
  createPlayerRow(match, playerName, playerNum, players) {
    const isWinner = match.winner === playerNum;
    const isTBD = playerName === "TBD";

    return `
      <div class="player-row ${isWinner ? "winner" : ""} ${isTBD ? "tbd" : ""}">
        <div class="player-name">${this.escapeHtml(playerName)}</div>
        <div class="game-score">
          ${!isTBD ? [0, 1, 2]
            .map((gameNum) => this.createGameResult(match, gameNum, playerNum))
            .join("") : '<span class="tbd-text">Pending previous round</span>'}
        </div>
      </div>
    `;
  }

  /**
   * Create game result button
   */
  createGameResult(match, gameNum, playerNum) {
    // Check if game can be played
    let canPlay = true;
    if (gameNum > 0) {
      for (let i = 0; i < gameNum; i++) {
        if (match.games[i] === null) {
          canPlay = false;
          break;
        }
      }
    }
    if (match.winner !== null && match.games[gameNum] === null) {
      canPlay = false;
    }

    const isWin = match.games[gameNum] === playerNum;
    const isLoss = match.games[gameNum] !== null && !isWin;
    const disabled = !canPlay && match.games[gameNum] === null;

    const classes = [
      "game-result",
      isWin ? "win" : "",
      isLoss ? "loss" : "",
      disabled ? "disabled" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const label = isWin ? "W" : isLoss ? "L" : gameNum + 1;

    return `
      <button
        class="${classes}"
        data-match-id="${match.id}"
        data-game-num="${gameNum}"
        data-player-num="${playerNum}"
        aria-label="Game ${gameNum + 1}: ${label}"
        ${disabled && match.games[gameNum] === null ? "disabled" : ""}>
        ${label}
      </button>
    `;
  }

  /**
   * Render standings table
   * OPTIMIZED: Uses DocumentFragment for batch DOM insertion
   */
  renderStandings(
    rankedStats,
    tiedRanks,
    players,
    isComplete = false,
    format = "round-robin"
  ) {
    const container = this.elements.standingsTable;
    if (!container) return;

    container.innerHTML = "";

    // Use DocumentFragment to batch DOM operations
    const fragment = document.createDocumentFragment();
    rankedStats.forEach((stat) => {
      const row = this.createStandingRow(
        stat,
        tiedRanks,
        rankedStats,
        players,
        isComplete,
        format
      );
      fragment.appendChild(row);
    });
    container.appendChild(fragment);
  }

  /**
   * Create standing row element
   */
  createStandingRow(
    stat,
    tiedRanks,
    rankedStats,
    players,
    isComplete = false,
    format = "round-robin"
  ) {
    const row = document.createElement("div");
    row.className = "standing-row";
    row.setAttribute("role", "button");
    row.setAttribute("tabindex", "0");
    row.setAttribute("aria-expanded", "false");
    row.setAttribute(
      "aria-label",
      `View details for ${stat.player}, rank ${
        stat.rank
      }, ${stat.points.toFixed(1)} points`
    );

    // Handle both click and keyboard
    const toggle = () => this.toggleStandingDetails(row);
    row.onclick = toggle;
    row.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    };

    const isTied = tiedRanks.has(stat.rank);
    if (isTied) row.classList.add("tied");

    let rankClass = "";
    let tiedIndicator = isTied ? " tied-indicator" : "";
    // Only show medal classes when tournament is complete
    if (isComplete) {
      if (stat.rank === 1) rankClass = "gold";
      else if (stat.rank === 2) rankClass = "silver";
      else if (stat.rank === 3) rankClass = "bronze";
    }

    const beatenList = this.createOpponentList(
      stat.opponents.beaten,
      rankedStats,
      players,
      "win"
    );
    const lostToList = this.createOpponentList(
      stat.opponents.lostTo,
      rankedStats,
      players,
      "loss"
    );

    // Format-specific record display
    let recordHtml, detailsHtml;

    if (format === TOURNAMENT_FORMATS.SWISS) {
      // Swiss: Show W-L and tiebreakers
      recordHtml = `${stat.wins}-${stat.losses}${
        stat.draws > 0 ? `-${stat.draws}` : ""
      } record`;
      detailsHtml = `
        OMW%: ${((stat.omw || 0) * 100).toFixed(1)}% |
        GW%: ${((stat.gwp || 0) * 100).toFixed(1)}% |
        OGW%: ${((stat.ogw || 0) * 100).toFixed(1)}%
      `;
    } else if (
      format === TOURNAMENT_FORMATS.SINGLE_ELIMINATION ||
      format === TOURNAMENT_FORMATS.DOUBLE_ELIMINATION
    ) {
      // Elimination: Show W-L and elimination round
      recordHtml = `${stat.wins}-${stat.losses} matches`;
      if (stat.roundEliminated || stat.eliminationRound) {
        const elimRound = stat.roundEliminated || stat.eliminationRound;
        detailsHtml = `Eliminated in Round ${elimRound}`;
      } else if (stat.finalPosition) {
        detailsHtml = `Final Position: ${stat.finalPosition}`;
      } else {
        detailsHtml = `${stat.gamesWon}-${stat.gamesLost} games`;
      }
    } else if (format === TOURNAMENT_FORMATS.GROUP_STAGE) {
      // Group Stage: Show group and record
      recordHtml = `${stat.wins}-${stat.losses} matches`;
      detailsHtml = stat.group
        ? `Group ${stat.group} | ${stat.gamesWon}-${stat.gamesLost} games`
        : `${stat.gamesWon}-${stat.gamesLost} games`;
    } else {
      // Round Robin: Show traditional record and quality
      recordHtml = `${stat.wins}-${stat.losses} matches`;
      detailsHtml = `${stat.gamesWon}-${stat.gamesLost} games<br>Quality: ${(
        stat.qualityScore || 0
      ).toFixed(1)}`;
    }

    row.innerHTML = `
      <div class="standing-rank ${rankClass}${tiedIndicator}">${stat.rank}</div>
      <div class="standing-info">
        <div class="standing-name">${this.escapeHtml(stat.player)}</div>
        <div class="standing-record">${recordHtml}</div>
        <div class="standing-details">
          ${detailsHtml}
        </div>
        <div class="standing-breakdown">
          ${
            format === TOURNAMENT_FORMATS.SWISS
              ? `
            <div class="breakdown-section">
              <strong>Swiss Tiebreakers:</strong><br>
              Match Record: ${stat.wins}-${stat.losses}${
                stat.draws > 0 ? `-${stat.draws}` : ""
              } (${stat.points} pts)<br>
              Opponent Match Win %: ${((stat.omw || 0) * 100).toFixed(1)}%<br>
              Game Win %: ${((stat.gwp || 0) * 100).toFixed(1)}%<br>
              Opponent Game Win %: ${((stat.ogw || 0) * 100).toFixed(1)}%<br>
              Games: ${stat.gamesWon}-${stat.gamesLost}
            </div>
          `
              : format === TOURNAMENT_FORMATS.SINGLE_ELIMINATION ||
                format === TOURNAMENT_FORMATS.DOUBLE_ELIMINATION
              ? `
            <div class="breakdown-section">
              <strong>Match Record:</strong><br>
              Wins: ${stat.wins}<br>
              Losses: ${stat.losses}<br>
              Games: ${stat.gamesWon}-${stat.gamesLost}
            </div>
          `
              : `
            <div class="breakdown-section">
              <strong>Points Breakdown:</strong><br>
              Match Wins: ${stat.wins} × 3 = ${stat.wins * 3} pts<br>
              Games Won: ${stat.gamesWon} × 1 = ${stat.gamesWon} pts<br>
              Games Lost: ${stat.gamesLost} × -0.5 = ${(
                stat.gamesLost * -0.5
              ).toFixed(1)} pts<br>
              <strong>Total: ${stat.points.toFixed(1)} pts</strong>
            </div>
          `
          }
          ${
            beatenList && stat.opponents
              ? `
            <div class="breakdown-section">
              <strong>Victories Against:</strong>
              <div class="opponent-list">${beatenList}</div>
            </div>
          `
              : ""
          }
          ${
            lostToList && stat.opponents
              ? `
            <div class="breakdown-section">
              <strong>Losses Against:</strong>
              <div class="opponent-list">${lostToList}</div>
            </div>
          `
              : ""
          }
          ${
            stat.qualityScore !== undefined &&
            format !== TOURNAMENT_FORMATS.SWISS
              ? `
            <div class="breakdown-section">
              <strong>Quality Score:</strong> ${(
                stat.qualityScore || 0
              ).toFixed(1)}<br>
              <em style="font-size: 0.9em; color: #666;">
                (Sum of beaten opponents' points)
              </em>
            </div>
          `
              : ""
          }
        </div>
      </div>
      <div class="standing-points">${stat.points !== undefined ? stat.points.toFixed(1) : '0.0'}<span style="font-size: 0.6em; color: #999;">pts</span></div>
    `;

    return row;
  }

  /**
   * Create opponent list HTML
   */
  createOpponentList(opponentIndices, rankedStats, players, type) {
    return opponentIndices
      .map((idx) => {
        const oppStat = rankedStats.find((s) => s.playerIndex === idx);
        const icon = type === "win" ? "✓" : "✗";
        return `<div class="opponent-item ${type}">${icon} ${this.escapeHtml(
          players[idx]
        )} (Rank ${oppStat.rank})</div>`;
      })
      .join("");
  }

  /**
   * Toggle standing row details
   */
  toggleStandingDetails(row) {
    const isExpanded = row.classList.toggle("expanded");
    row.setAttribute("aria-expanded", isExpanded.toString());
  }

  /**
   * Update progress bar
   */
  updateProgress(completed, total) {
    const percentage = total > 0 ? (completed / total) * 100 : 0;

    if (this.elements.progressFill) {
      this.elements.progressFill.style.width = percentage + "%";
    }

    if (this.elements.progressText) {
      this.elements.progressText.textContent = `${completed} of ${total} matches completed`;
    }
  }

  /**
   * Update tournament info display (format, stage, round)
   */
  updateTournamentInfo(format, currentStage = null, matches = []) {
    if (!this.elements.tournamentInfo) return;

    // Get format display name
    const formatHandler = tournamentFormats.factory.create(format);
    const formatInfo = formatHandler.getFormatInfo();

    // Show tournament info
    this.elements.tournamentInfo.style.display = "flex";

    // Update format badge
    if (this.elements.formatBadge) {
      this.elements.formatBadge.textContent = `📋 ${formatInfo.name}`;
      this.elements.formatBadge.className = "tournament-info__badge tournament-info__badge--format";
    }

    // Update stage/round badge if applicable
    if (this.elements.stageBadge) {
      let stageText = "";

      if (format === TOURNAMENT_FORMATS.SWISS && matches.length > 0) {
        // Show current round for Swiss
        const currentRound = this.getCurrentSwissRound(matches);
        if (currentRound) {
          stageText = `Round ${currentRound.round}/${currentRound.totalRounds}`;
        }
      } else if (format === TOURNAMENT_FORMATS.GROUP_STAGE) {
        // Show current stage for group stage
        stageText = currentStage === "playoffs" ? "🏆 Playoffs" : "📦 Groups";
      } else if (
        format === TOURNAMENT_FORMATS.SINGLE_ELIMINATION ||
        format === TOURNAMENT_FORMATS.DOUBLE_ELIMINATION
      ) {
        // Show current bracket round
        const currentRound = this.getCurrentEliminationRound(matches);
        if (currentRound) {
          stageText = `Round ${currentRound}`;
        }
      }

      if (stageText) {
        this.elements.stageBadge.textContent = stageText;
        this.elements.stageBadge.className = "tournament-info__badge tournament-info__badge--stage";
        this.elements.stageBadge.style.display = "inline-block";
      } else {
        this.elements.stageBadge.style.display = "none";
      }
    }
  }

  /**
   * Get current Swiss round from matches
   */
  getCurrentSwissRound(matches) {
    const swissMatches = matches.filter((m) => m.round !== undefined);
    if (swissMatches.length === 0) return null;

    const totalRounds = Math.max(...swissMatches.map((m) => m.round));
    const completedMatches = swissMatches.filter((m) => m.winner !== null);
    const completedRounds = completedMatches.length > 0
      ? Math.max(...completedMatches.map((m) => m.round))
      : 0;

    const currentRound = completedRounds < totalRounds ? completedRounds + 1 : totalRounds;

    return { round: currentRound, totalRounds };
  }

  /**
   * Get current elimination round
   */
  getCurrentEliminationRound(matches) {
    const bracketMatches = matches.filter(
      (m) => m.round !== undefined && !m.isPlaceholder
    );
    if (bracketMatches.length === 0) return null;

    const incompleteMatches = bracketMatches.filter((m) => m.winner === null);
    if (incompleteMatches.length === 0) {
      return Math.max(...bracketMatches.map((m) => m.round));
    }

    return Math.min(...incompleteMatches.map((m) => m.round));
  }

  /**
   * Update stage advancement button visibility and text
   */
  updateStageAdvancement(canAdvance, format, currentStage = null) {
    if (!this.elements.stageAdvancement) return;

    if (!canAdvance) {
      this.elements.stageAdvancement.style.display = "none";
      return;
    }

    // Show button
    this.elements.stageAdvancement.style.display = "flex";

    // Update button text based on format
    let buttonText = "Advance to Next Round";

    if (format === TOURNAMENT_FORMATS.SWISS) {
      buttonText = "🎲 Generate Next Round";
    } else if (format === TOURNAMENT_FORMATS.GROUP_STAGE) {
      if (currentStage === "groups" || !currentStage) {
        buttonText = "🏆 Advance to Playoffs";
      } else {
        buttonText = "Advance to Next Round";
      }
    }

    if (this.elements.advanceStageText) {
      this.elements.advanceStageText.textContent = buttonText;
    }
  }

  /**
   * Escape HTML to prevent XSS
   * OPTIMIZED: Uses character map instead of creating DOM elements
   */
  escapeHtml(text) {
    const htmlEscapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return String(text).replace(/[&<>"']/g, (char) => htmlEscapeMap[char]);
  }

  /**
   * Reset to initial state
   */
  resetToInitialState() {
    // Clear forms
    if (this.elements.tournamentCode) {
      this.elements.tournamentCode.value = "";
    }

    // Reset player count
    if (this.elements.playerCount) {
      this.elements.playerCount.value = APP_CONFIG.DEFAULT_PLAYERS;
    }

    // Clear errors
    this.clearError("joinError");

    // Show mode selector
    this.showSection("modeSelector");

    // Clear mode button selection
    document.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
  }

  /**
   * Render format selection cards
   */
  renderFormatCards() {
    const formatGrid = this.elements.formatGrid;
    if (!formatGrid) return;

    // Get all available formats
    const formats = tournamentFormats.factory.getAllFormats();

    // Clear existing cards
    formatGrid.innerHTML = "";

    // Create card for each format
    formats.forEach((formatInfo) => {
      const card = document.createElement("div");
      card.className = "format-card";
      card.dataset.formatType = formatInfo.type;
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", `Select ${formatInfo.name} format`);

      card.innerHTML = `
        <div class="format-card__icon">${formatInfo.icon}</div>
        <div class="format-card__name">${formatInfo.name}</div>
        <div class="format-card__description">${formatInfo.description}</div>
        <div class="format-card__meta">
          <div class="format-card__meta-item">
            <span class="format-card__meta-label">Min Players:</span>
            <span class="format-card__meta-value">${formatInfo.minPlayers}</span>
          </div>
          <div class="format-card__meta-item">
            <span class="format-card__meta-label">Max Players:</span>
            <span class="format-card__meta-value">${formatInfo.maxPlayers}</span>
          </div>
          ${formatInfo.supportsMultiStage ? '<div class="format-card__meta-item"><span class="format-card__meta-label">Multi-Stage</span><span class="format-card__meta-value">✓</span></div>' : ''}
        </div>
      `;

      formatGrid.appendChild(card);
    });
  }

  /**
   * Set selected format and update UI
   * @param {string} formatType - Format type constant
   */
  setSelectedFormat(formatType) {
    // Store selected format
    this.selectedFormat = formatType;

    // Update card selection visually
    document.querySelectorAll(".format-card").forEach((card) => {
      if (card.dataset.formatType === formatType) {
        card.classList.add("format-card--selected");
      } else {
        card.classList.remove("format-card--selected");
      }
    });

    // Get format instance
    const format = tournamentFormats.factory.create(formatType);
    const formatInfo = format.getFormatInfo();

    // Update format title
    if (this.elements.selectedFormatTitle) {
      this.elements.selectedFormatTitle.textContent = `${formatInfo.icon} ${formatInfo.name}`;
    }

    // Update player count options based on format requirements
    this.updatePlayerCountOptions(format);

    // Show/hide format-specific configuration
    this.renderFormatConfig(format);
  }

  /**
   * Update player count dropdown based on format requirements
   * @param {TournamentFormatBase} format - Format instance
   */
  updatePlayerCountOptions(format) {
    const playerCountSelect = this.elements.playerCount;
    if (!playerCountSelect) return;

    const currentValue = parseInt(playerCountSelect.value) || APP_CONFIG.DEFAULT_PLAYERS;
    const recommendedCounts = format.getRecommendedPlayerCounts();
    playerCountSelect.innerHTML = "";

    // For elimination formats (power of 2 only), only show valid options
    const isElimination = format.formatType === TOURNAMENT_FORMATS.SINGLE_ELIMINATION ||
                          format.formatType === TOURNAMENT_FORMATS.DOUBLE_ELIMINATION;

    let playerOptions = [];
    if (isElimination) {
      // Only show power-of-2 counts: 2, 4, 8, 16, 32, 64
      // For eliminations, show up to 64 players (or 32 for double elim)
      const maxElimDisplay = format.formatType === TOURNAMENT_FORMATS.DOUBLE_ELIMINATION ? 32 : 64;
      playerOptions = recommendedCounts.filter(n => n <= maxElimDisplay);
      if (playerOptions.length === 0) {
        // Fallback: generate power of 2 sequence
        for (let pow = 1; pow <= maxElimDisplay; pow *= 2) {
          if (pow >= format.minPlayers && pow <= format.maxPlayers) {
            playerOptions.push(pow);
          }
        }
      }
    } else if (format.formatType === TOURNAMENT_FORMATS.GROUP_STAGE) {
      // For group stage, only show counts that divide nicely into groups
      // Multiples of 4 work best (4 players per group)
      const maxDisplay = Math.min(format.maxPlayers, 32);
      for (let i = format.minPlayers; i <= maxDisplay; i++) {
        // Include if it's divisible by 4 (standard groups) or recommended
        if (i % 4 === 0 || recommendedCounts.includes(i)) {
          playerOptions.push(i);
        }
      }
    } else if (format.formatType === TOURNAMENT_FORMATS.SWISS) {
      // For Swiss, show even numbers (to avoid BYEs) and some key odd numbers
      // Show options up to 32 players
      const maxDisplay = Math.min(format.maxPlayers, 32);
      for (let i = format.minPlayers; i <= maxDisplay; i++) {
        // Include even numbers (preferred - no BYEs)
        if (i % 2 === 0) {
          playerOptions.push(i);
        }
        // Also include key odd numbers: 5, 7, 9, 11, 13, 15, etc. (smaller odd numbers)
        else if (i <= 15 || recommendedCounts.includes(i)) {
          playerOptions.push(i);
        }
      }
    } else {
      // For other formats (Round Robin), show all counts from minPlayers to maxPlayers
      const maxDisplay = Math.min(format.maxPlayers, 20);
      for (let i = format.minPlayers; i <= maxDisplay; i++) {
        playerOptions.push(i);
      }
    }

    // Create option elements
    playerOptions.forEach(count => {
      const option = document.createElement("option");
      option.value = count;

      // Simple display without star indicators
      option.textContent = `${count} Player${count !== 1 ? "s" : ""}`;

      // Try to keep current selection if valid
      if (count === currentValue) {
        option.selected = true;
      }
      // Otherwise select a recommended count if available
      else if (!option.selected && recommendedCounts.includes(count)) {
        option.selected = true;
      }

      playerCountSelect.appendChild(option);
    });

    // If no option is selected, select the first recommended count or first option
    if (!playerCountSelect.value) {
      if (recommendedCounts.length > 0 && playerOptions.includes(recommendedCounts[0])) {
        playerCountSelect.value = recommendedCounts[0];
      } else if (playerOptions.length > 0) {
        playerCountSelect.value = playerOptions[0];
      }
    }

    // Add helpful text showing recommended counts
    this.updatePlayerCountHelp(format, parseInt(playerCountSelect.value));
  }

  /**
   * Update help text for player count showing recommendations and warnings
   */
  updatePlayerCountHelp(format, selectedCount) {
    // Find or create help text element
    let helpText = document.getElementById("playerCountHelp");
    if (!helpText) {
      helpText = document.createElement("div");
      helpText.id = "playerCountHelp";
      helpText.className = "form-help-text";

      // Insert after player count select
      const playerCountSelect = this.elements.playerCount;
      if (playerCountSelect && playerCountSelect.parentNode) {
        playerCountSelect.parentNode.insertBefore(helpText, playerCountSelect.nextSibling);
      }
    }

    // Validate player count and show recommendations/warnings
    const validation = format.validatePlayerCount(selectedCount);
    const recommended = format.getRecommendedPlayerCounts().filter(n => n <= 20);

    let helpHtml = "";

    if (validation.warning) {
      helpHtml = `<div class="form-warning">⚠️ ${validation.warning}</div>`;
    } else if (recommended.length > 0 && !recommended.includes(selectedCount)) {
      helpHtml = `<div class="form-info">💡 Recommended: ${recommended.slice(0, 5).join(", ")} players</div>`;
    }

    helpText.innerHTML = helpHtml;
    helpText.style.display = helpHtml ? "block" : "none";
  }

  /**
   * Render format-specific configuration UI
   * @param {TournamentFormatBase} format - Format instance
   */
  renderFormatConfig(format) {
    const configContainer = this.elements.formatConfigContainer;
    const matchesContainer = this.elements.matchesPerPlayerContainer;

    if (!configContainer) return;

    // Clear existing config
    configContainer.innerHTML = "";

    // Show/hide matches per player selector (only for round-robin)
    if (matchesContainer) {
      if (format.formatType === "round-robin") {
        matchesContainer.style.display = "block";
      } else {
        matchesContainer.style.display = "none";
      }
    }

    // Add format-specific configuration based on format type
    const playerCount = parseInt(this.elements.playerCount?.value) || APP_CONFIG.DEFAULT_PLAYERS;
    const defaultConfig = format.getDefaultConfig(playerCount);

    switch (format.formatType) {
      case "swiss":
        configContainer.innerHTML = `
          <div class="form-group text-center">
            <label for="swissRounds" class="form-label">Number of Rounds:</label>
            <select id="swissRounds" class="form-select" aria-label="Select number of rounds">
              ${[3, 4, 5, 6, 7].map(r => `
                <option value="${r}" ${r === defaultConfig.rounds ? "selected" : ""}>${r} Rounds</option>
              `).join("")}
            </select>
            <div class="matches-info">Recommended: ${defaultConfig.rounds} rounds for ${playerCount} players</div>
          </div>
        `;
        break;

      case "single-elimination":
        configContainer.innerHTML = `
          <div class="form-group text-center">
            <label class="form-label">Bracket Options:</label>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" id="thirdPlaceMatch" />
                <span>Include 3rd Place Match</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" id="seededBracket" />
                <span>Use Seeded Bracket (players 1-N)</span>
              </label>
            </div>
          </div>
        `;
        break;

      case "double-elimination":
        configContainer.innerHTML = `
          <div class="form-group text-center">
            <label class="form-label">Bracket Options:</label>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" id="grandFinalReset" />
                <span>Grand Finals Reset (if losers bracket wins)</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" id="seededBracket" />
                <span>Use Seeded Bracket (players 1-N)</span>
              </label>
            </div>
          </div>
        `;
        break;

      case "group-stage":
        const numGroups = defaultConfig.numGroups;
        configContainer.innerHTML = `
          <div class="form-group text-center">
            <label for="numGroups" class="form-label">Number of Groups:</label>
            <select id="numGroups" class="form-select" aria-label="Select number of groups">
              ${[2, 3, 4, 6, 8].map(g => `
                <option value="${g}" ${g === numGroups ? "selected" : ""}>${g} Groups</option>
              `).join("")}
            </select>
          </div>
          <div class="form-group text-center">
            <label for="advancingPerGroup" class="form-label">Advancing Per Group:</label>
            <select id="advancingPerGroup" class="form-select" aria-label="Select advancing per group">
              ${[1, 2, 3, 4].map(a => `
                <option value="${a}" ${a === defaultConfig.advancingPerGroup ? "selected" : ""}>${a} Player${a !== 1 ? "s" : ""}</option>
              `).join("")}
            </select>
          </div>
        `;
        break;
    }
  }

  /**
   * Get current format configuration from UI
   * @returns {Object} Format configuration object
   */
  getFormatConfig() {
    if (!this.selectedFormat) return {};

    const format = tournamentFormats.factory.create(this.selectedFormat);
    const playerCount = parseInt(this.elements.playerCount?.value) || APP_CONFIG.DEFAULT_PLAYERS;
    const config = format.getDefaultConfig(playerCount);

    // Override with user selections
    switch (this.selectedFormat) {
      case "round-robin":
        config.matchesPerPlayer = parseInt(this.elements.matchesPerPlayer?.value) || config.matchesPerPlayer;
        break;

      case "swiss":
        const swissRounds = document.getElementById("swissRounds");
        if (swissRounds) config.rounds = parseInt(swissRounds.value);
        break;

      case "single-elimination":
        const thirdPlace = document.getElementById("thirdPlaceMatch");
        const seededSingle = document.getElementById("seededBracket");
        if (thirdPlace) config.thirdPlaceMatch = thirdPlace.checked;
        if (seededSingle) config.seedingMethod = seededSingle.checked ? "seeded" : "random";
        break;

      case "double-elimination":
        const grandFinalReset = document.getElementById("grandFinalReset");
        const seededDouble = document.getElementById("seededBracket");
        if (grandFinalReset) config.grandFinalReset = grandFinalReset.checked;
        if (seededDouble) config.seedingMethod = seededDouble.checked ? "seeded" : "random";
        break;

      case "group-stage":
        const numGroups = document.getElementById("numGroups");
        const advancingPerGroup = document.getElementById("advancingPerGroup");
        if (numGroups) config.numGroups = parseInt(numGroups.value);
        if (advancingPerGroup) config.advancingPerGroup = parseInt(advancingPerGroup.value);
        config.playersPerGroup = Math.floor(playerCount / config.numGroups);
        break;
    }

    return config;
  }
}

// Create global instance
const uiManager = new UIManager();
