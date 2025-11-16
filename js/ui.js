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
   * Shows all matches with win/loss status
   */
  renderDefaultSchedule(fragment, players, playerMatchesMap) {
    players.forEach((player, index) => {
      const playerMatches = playerMatchesMap.get(index) || [];

      const allCompleted =
        playerMatches.length > 0 &&
        playerMatches.every((m) => m.winner !== null);

      // Calculate record
      let wins = 0, losses = 0;
      playerMatches.forEach((m) => {
        if (m.winner !== null) {
          const isPlayer1 = m.player1 === index;
          const won = m.winner === (isPlayer1 ? 1 : 2);
          if (won) wins++;
          else losses++;
        }
      });

      const scheduleItem = document.createElement("div");
      scheduleItem.className = `schedule-item${
        allCompleted ? " completed" : ""
      }`;

      const statusHtml = allCompleted
        ? `<div class="player-status">Done</div>`
        : `<div class="player-status active">${wins}-${losses}</div>`;

      // Build match list with status
      let matchesHtml = '<div class="match-list">';
      playerMatches.forEach((m) => {
        const opponentIndex = m.player1 === index ? m.player2 : m.player1;
        const opponentName = players[opponentIndex];
        const isPlayer1 = m.player1 === index;
        const isWon = m.winner === (isPlayer1 ? 1 : 2);
        const isLost = m.winner !== null && !isWon;
        const isPending = m.winner === null;

        let statusIcon = '○';
        let statusClass = '';
        if (isWon) {
          statusIcon = '✓';
          statusClass = 'win';
        } else if (isLost) {
          statusIcon = '✗';
          statusClass = 'loss';
        } else if (isPending) {
          statusIcon = '○';
          statusClass = 'pending';
        }

        matchesHtml += `<div class="match-item ${statusClass}">`;
        matchesHtml += `<span class="match-status">${statusIcon}</span> vs ${this.escapeHtml(opponentName)}`;
        matchesHtml += '</div>';
      });
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
   * Render elimination bracket schedule (shows progression path)
   */
  renderEliminationSchedule(fragment, players, playerMatchesMap) {
    players.forEach((player, index) => {
      const playerMatches = playerMatchesMap.get(index) || [];

      // Group matches by round/bracket
      const matchesByRound = {};
      let isInLosersBracket = false;
      let wins = 0, losses = 0;

      playerMatches.forEach((m) => {
        if (m.isPlaceholder && m.player1 === null && m.player2 === null) {
          return; // Skip empty placeholders
        }

        // Count wins/losses
        if (m.winner !== null) {
          const isPlayer1 = m.player1 === index;
          const won = m.winner === (isPlayer1 ? 1 : 2);
          if (won) wins++;
          else losses++;
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
        statusHtml = `<div class="player-status eliminated">Eliminated (${wins}-${losses})</div>`;
      } else if (isChampion) {
        statusHtml = `<div class="player-status">🏆 Champion (${wins}-${losses})</div>`;
      } else if (allCompleted) {
        // Completed but not champion = placed (e.g., 2nd, 3rd-4th, etc.)
        statusHtml = `<div class="player-status">Eliminated (${wins}-${losses})</div>`;
      } else if (currentRound) {
        const roundName = this.getRoundName(currentRound, rounds.length);
        const bracketInfo = isInLosersBracket ? ' (Losers)' : '';
        statusHtml = `<div class="player-status active">→ ${roundName}${bracketInfo} (${wins}-${losses})</div>`;
      } else if (playerMatches.length > 0) {
        statusHtml = `<div class="player-status active">${wins}-${losses}</div>`;
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

        const bracketLabel = match.bracket === 'losers' ? ' (Losers)' : match.bracket === 'winners' ? ' (Winners)' : '';

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
      let wins = 0, losses = 0, draws = 0;

      playerMatches.forEach((m) => {
        if (m.isPlaceholder && m.player1 === null && m.player2 === null) {
          return;
        }

        // Count record
        if (m.winner !== null) {
          const isPlayer1 = m.player1 === index;
          const won = m.winner === (isPlayer1 ? 1 : 2);
          if (won) wins++;
          else losses++;
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
        ? `<div class="player-status">Done (${wins}-${losses})</div>`
        : currentMatches.length > 0
        ? `<div class="player-status active">→ Round ${currentRound} (${wins}-${losses})</div>`
        : `<div class="player-status">${wins}-${losses}</div>`;

      let matchesHtml = '<div class="swiss-rounds">';

      // Past rounds (completed)
      if (pastMatches.length > 0) {
        matchesHtml += '<div class="round-section past">';
        matchesHtml += '<div class="round-header">Past Rounds</div>';

        // Group by round
        const pastByRound = {};
        pastMatches.forEach((m) => {
          if (!pastByRound[m.round]) pastByRound[m.round] = [];
          pastByRound[m.round].push(m);
        });

        Object.keys(pastByRound).sort((a, b) => a - b).forEach((round) => {
          pastByRound[round].forEach((m) => {
            const opponentIndex = m.player1 === index ? m.player2 : m.player1;
            const opponentName = opponentIndex !== null ? players[opponentIndex] : 'BYE';
            const isPlayer1 = m.player1 === index;
            const isWon = m.winner === (isPlayer1 ? 1 : 2);
            const isLost = m.winner !== null && !isWon;
            const statusIcon = isWon ? '✓' : isLost ? '✗' : '○';

            matchesHtml += `<div class="round-match ${isWon ? 'win' : ''} ${isLost ? 'loss' : ''}">`;
            matchesHtml += `<span class="match-status">${statusIcon}</span> R${round}: vs ${this.escapeHtml(opponentName)}`;
            matchesHtml += '</div>';
          });
        });
        matchesHtml += '</div>';
      }

      // Current round (highlighted)
      if (currentMatches.length > 0) {
        matchesHtml += '<div class="round-section current">';
        matchesHtml += `<div class="round-header">⚡ Round ${currentRound}</div>`;
        currentMatches.forEach((m) => {
          const opponentIndex = m.player1 === index ? m.player2 : m.player1;
          const opponentName = opponentIndex !== null ? players[opponentIndex] : 'BYE';
          matchesHtml += `<div class="round-match active">vs ${this.escapeHtml(opponentName)}</div>`;
        });
        matchesHtml += '</div>';
      }

      // Future rounds (grayed out)
      if (futureMatches.length > 0) {
        matchesHtml += '<div class="round-section future">';
        matchesHtml += '<div class="round-header">Upcoming Rounds</div>';
        matchesHtml += `<div class="round-match tbd">${futureMatches.length} more round${futureMatches.length > 1 ? 's' : ''} (pairings TBD)</div>`;
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
  renderRoundNavigation(matches, format, currentStage = null) {
    const navContainer = this.elements.roundNavigation;
    const buttonsContainer = this.elements.roundNavigationButtons;

    if (!navContainer || !buttonsContainer) return;

    // Group Stage: Show stage navigation (Groups, playoff rounds)
    if (format === TOURNAMENT_FORMATS.GROUP_STAGE) {
      this.renderStageNavigation(matches, currentStage);
      return;
    }

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
    rounds.forEach((round, index) => {
      const btn = document.createElement('button');
      btn.className = 'round-nav-btn' + (this.selectedRound === round ? ' active' : '');

      // Check if this round is unlocked (for elimination formats)
      const isElimination = format === TOURNAMENT_FORMATS.SINGLE_ELIMINATION ||
                            format === TOURNAMENT_FORMATS.DOUBLE_ELIMINATION;

      let roundUnlocked = true;
      if (isElimination && index > 0) {
        // For elimination formats, check if previous round is complete
        const previousRound = rounds[index - 1];
        const previousRoundMatches = matches.filter(m => m.round === previousRound && !m.isBye);
        const previousRoundComplete = previousRoundMatches.length > 0 &&
                                     previousRoundMatches.every(m => m.winner !== null);

        // Round is unlocked if previous round is complete OR current round has non-placeholder matches
        const currentRoundMatches = matches.filter(m => m.round === round);
        const hasActiveMatches = currentRoundMatches.some(m => !m.isPlaceholder);

        roundUnlocked = previousRoundComplete || hasActiveMatches;
      }

      if (!roundUnlocked) {
        btn.classList.add('disabled');
        btn.disabled = true;
      }

      // Get round label based on format
      const label = this.getRoundLabel(round, rounds.length, format);
      btn.textContent = label;
      btn.dataset.round = round;

      fragment.appendChild(btn);
    });

    buttonsContainer.appendChild(fragment);
  }

  /**
   * Render stage navigation for Group Stage tournaments
   */
  renderStageNavigation(matches, currentStage) {
    const navContainer = this.elements.roundNavigation;
    const buttonsContainer = this.elements.roundNavigationButtons;

    if (!navContainer || !buttonsContainer) return;

    // Get unique stages and playoff rounds
    const hasGroups = matches.some(m => m.stage === 'groups');
    const groupMatches = matches.filter(m => m.stage === 'groups');
    const playoffMatches = matches.filter(m => m.stage === 'playoffs');
    const playoffRounds = [...new Set(playoffMatches.map(m => m.round).filter(r => r !== undefined))].sort((a, b) => a - b);

    // Check if groups are complete (all group matches have winners)
    const groupsComplete = groupMatches.length > 0 && groupMatches.every(m => m.winner !== null);

    // Show navigation
    navContainer.style.display = 'block';
    buttonsContainer.innerHTML = '';

    // Initialize selected stage if not set
    if (this.selectedStage === undefined) {
      this.selectedStage = currentStage || 'groups';
    }

    // Create navigation buttons
    const fragment = document.createDocumentFragment();

    // Groups button (always enabled)
    if (hasGroups) {
      const groupsBtn = document.createElement('button');
      groupsBtn.className = 'round-nav-btn stage-nav-btn' + (this.selectedStage === 'groups' ? ' active' : '');
      groupsBtn.textContent = '📦 Groups';
      groupsBtn.dataset.stage = 'groups';
      fragment.appendChild(groupsBtn);
    }

    // Playoff round buttons
    if (playoffRounds.length > 0) {
      playoffRounds.forEach(round => {
        const btn = document.createElement('button');
        const isSelected = this.selectedStage === 'playoffs' && this.selectedRound === round;

        // Check if this round is unlocked (groups complete and round has active matches)
        const roundMatches = playoffMatches.filter(m => m.round === round);
        const roundUnlocked = groupsComplete && roundMatches.some(m => !m.isPlaceholder);

        btn.className = 'round-nav-btn stage-nav-btn' + (isSelected ? ' active' : '');
        if (!roundUnlocked) {
          btn.classList.add('disabled');
          btn.disabled = true;
        }

        // Get playoff round label
        const label = this.getRoundLabel(round, playoffRounds.length, TOURNAMENT_FORMATS.SINGLE_ELIMINATION);
        btn.textContent = `🏆 ${label}`;
        btn.dataset.stage = 'playoffs';
        btn.dataset.round = round;

        fragment.appendChild(btn);
      });
    }

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
   * Set selected stage for Group Stage tournaments
   */
  setSelectedStage(stage, round = null) {
    this.selectedStage = stage;
    if (round !== null) {
      this.selectedRound = round;
    }
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

      // For multi-stage formats (Group Stage + Playoffs), filter by selected stage
      if (match.stage && this.selectedStage !== undefined && this.selectedStage !== null) {
        // If a specific stage is selected, only show matches from that stage
        if (match.stage !== this.selectedStage) {
          return;
        }
        // For playoff stage, also filter by round if selected
        if (this.selectedStage === 'playoffs' && this.selectedRound !== null && this.selectedRound !== 'all') {
          if (match.round !== this.selectedRound) {
            return;
          }
        }
      } else if (currentStage && match.stage && match.stage !== currentStage) {
        // Fallback: use currentStage if selectedStage is not set
        return;
      }

      // Filter by selected round if set (for non-stage tournaments)
      if (!match.stage && this.selectedRound !== null && this.selectedRound !== 'all') {
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

    // Add group label for Group Stage matches
    const groupLabel = match.group && match.stage === 'groups'
      ? `<div class="badge badge-group">Group ${match.group}</div>`
      : '';

    card.innerHTML = `
      <div class="match-card__header">
        <div class="match-number">${matchLabel}</div>
        ${groupLabel}
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
   * Update scoring legend based on tournament format
   * @param {string} format - Tournament format type
   */
  updateScoringLegend(format) {
    const details = this.elements.scoringLegendDetails;
    if (!details) return;

    let html = '';

    if (format === TOURNAMENT_FORMATS.SINGLE_ELIMINATION ||
        format === TOURNAMENT_FORMATS.DOUBLE_ELIMINATION ||
        (format === TOURNAMENT_FORMATS.GROUP_STAGE)) {
      // Elimination formats: No points, bracket-based ranking
      html = `
        <div style="margin-bottom: 1rem;">
          <strong>How the winner is determined:</strong>
          <p style="margin: 0.5rem 0;">Players advance through bracket rounds by winning matches. The tournament winner is the player who wins the final match.</p>
        </div>

        <h4>Ranking System</h4>
        <ul>
          <li><strong>Primary — Bracket Position:</strong> Players are ranked by how far they advanced in the tournament. Later elimination = better placement.</li>
          ${format === TOURNAMENT_FORMATS.DOUBLE_ELIMINATION ?
            '<li><strong>Second Chance:</strong> Players who lose in the winners bracket drop to the losers bracket. A second loss eliminates them.</li>' :
            ''}
          <li><strong>Secondary — Total Wins:</strong> If eliminated in the same round, more match wins = better rank.</li>
          <li><strong>Tertiary — Game Differential:</strong> Games won minus games lost (tiebreaker).</li>
        </ul>

        ${format === TOURNAMENT_FORMATS.GROUP_STAGE ?
          `<p style="margin-top: 1rem; font-style: italic; font-size: 0.9rem;">
            Note: Group stage uses points (Match Win: +3 pts, Game Won: +1 pt, Game Lost: -0.5 pts) to determine who advances to playoffs. Playoff rounds use bracket positioning.</p>` :
          ''}
      `;
    } else if (format === TOURNAMENT_FORMATS.SWISS) {
      // Swiss: Match wins only (games are tiebreakers)
      html = `
        <h4>Scoring</h4>
        <ul>
          <li>Match Win: +3 pts</li>
          <li>Match Loss: 0 pts</li>
          <li>Individual Games: 0 pts (used for tiebreakers only)</li>
        </ul>

        <h4>How tiebreaking works</h4>
        <ul>
          <li><strong>Primary — Match Wins:</strong> Players are ranked by total match wins (3 points per match win).</li>
          <li><strong>Secondary — OMW% (Opponent Match Win %):</strong> Average match win percentage of all opponents faced. Rewards playing stronger opponents.</li>
          <li><strong>Tertiary — GW% (Game Win %):</strong> Your percentage of individual games won (used as tiebreaker, not for points).</li>
          <li><strong>Quaternary — OGW% (Opponent Game Win %):</strong> Average game win percentage of all opponents faced.</li>
        </ul>

        <p style="margin-top: 1rem; font-style: italic; font-size: 0.9rem;">
          Note: Swiss format focuses on match wins. Individual game results only matter for tiebreakers and pairing strength-of-schedule calculations.</p>
      `;
    } else {
      // Round Robin: Points + quality score
      html = `
        <h4>Scoring</h4>
        <ul>
          <li>Match Win: +3 pts</li>
          <li>Game Won: +1 pt</li>
          <li>Game Lost: -0.5 pts</li>
        </ul>

        <h4>How tiebreaking works</h4>
        <ul>
          <li><strong>Primary — Total Points:</strong> Players are ranked by total points (match wins × 3 + games won × 1 + games lost × -0.5).</li>
          <li><strong>Secondary — Head-to-head:</strong> If two players are tied on points and played each other, the winner of that match is ranked higher.</li>
          <li><strong>Tertiary — Quality Score:</strong> Sum of match wins of all opponents you defeated (strength of victories).</li>
          <li><strong>Quaternary — Game Win %:</strong> Percentage of games won.</li>
        </ul>
      `;
    }

    details.innerHTML = html;
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

    // Update scoring legend for this format
    this.updateScoringLegend(format);

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
    if (!this.elements.stageAdvancement) {
      // Try to get the element if it wasn't cached
      const elem = document.getElementById('stageAdvancement');
      if (elem) {
        this.elements.stageAdvancement = elem;
      } else {
        return;
      }
    }

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
      // For Swiss, only show recommended counts (8, 16, 32) to avoid BYEs
      // Swiss requires even player counts for best experience
      playerOptions = recommendedCounts.filter(n => n <= 64);
      if (playerOptions.length === 0) {
        // Fallback: only even numbers up to 32
        const maxDisplay = Math.min(format.maxPlayers, 32);
        for (let i = format.minPlayers; i <= maxDisplay; i += 2) {
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

    // Get format's optimal default player count
    const formatDefault = format.getDefaultPlayerCount();

    // Determine which value to select (prefer format default for new selections)
    let selectedValue = null;
    if (playerOptions.includes(formatDefault)) {
      selectedValue = formatDefault;
    } else if (playerOptions.includes(currentValue)) {
      selectedValue = currentValue;
    } else if (playerOptions.length > 0) {
      selectedValue = playerOptions[0];
    }

    // Create option elements
    playerOptions.forEach(count => {
      const option = document.createElement("option");
      option.value = count;
      option.textContent = `${count} Player${count !== 1 ? "s" : ""}`;

      if (count === selectedValue) {
        option.selected = true;
      }

      playerCountSelect.appendChild(option);
    });

    // Ensure the value is set
    if (selectedValue !== null) {
      playerCountSelect.value = selectedValue;
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
        // Get valid configurations for this player count
        // playerCount already declared at function scope (line 2184)
        const formatHandler = tournamentFormats.factory.create('group-stage');
        const validConfigs = formatHandler.getValidConfigurations(playerCount);

        if (validConfigs.length === 0) {
          configContainer.innerHTML = `
            <div class="form-group text-center">
              <p class="error-message">⚠️ No optimal configurations available for ${playerCount} players. Recommended player counts: 8, 12, 16, 20, 24, or 32.</p>
            </div>
          `;
        } else {
          // Find default selection (first config matches defaults)
          const defaultIndex = validConfigs.findIndex(c =>
            c.numGroups === defaultConfig.numGroups &&
            c.advancingPerGroup === defaultConfig.advancingPerGroup
          );

          configContainer.innerHTML = `
            <div class="form-group text-center">
              <label for="groupStageConfig" class="form-label">Tournament Structure:</label>
              <select id="groupStageConfig" class="form-select" aria-label="Select group stage configuration">
                ${validConfigs.map((cfg, idx) => `
                  <option value="${idx}" ${idx === Math.max(0, defaultIndex) ? "selected" : ""}>
                    ${cfg.description}
                  </option>
                `).join("")}
              </select>
            </div>
          `;
        }
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
        const groupStageConfig = document.getElementById("groupStageConfig");
        if (groupStageConfig) {
          const formatHandler = tournamentFormats.factory.create('group-stage');
          const validConfigs = formatHandler.getValidConfigurations(playerCount);
          const selectedIndex = parseInt(groupStageConfig.value);

          if (validConfigs[selectedIndex]) {
            const selectedConfig = validConfigs[selectedIndex];
            config.numGroups = selectedConfig.numGroups;
            config.playersPerGroup = selectedConfig.playersPerGroup;
            config.advancingPerGroup = selectedConfig.advancingPerGroup;
          }
        }
        break;
    }

    return config;
  }
}

// Create global instance
const uiManager = new UIManager();
