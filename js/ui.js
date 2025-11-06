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
  }

  /**
   * Cache DOM elements
   */
  cacheElements() {
    this.elements = {
      // Sections
      modeSelector: document.getElementById("modeSelector"),
      joinSection: document.getElementById("joinSection"),
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
      gamesPerPlayer: document.getElementById("gamesPerPlayer"),
      scheduleGrid: document.getElementById("scheduleGrid"),
      standingsTable: document.getElementById("standingsTable"),
      matchesContainer: document.getElementById("matchesContainer"),
      // Scoring legend (expandable explanation)
      scoringLegend: document.getElementById("scoringLegend"),
      scoringLegendDetails: document.getElementById("scoringLegendDetails"),
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
      console.warn('Failed to restore view from localStorage:', e);
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
  switchView(viewName) {
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
      console.warn('Failed to save view to localStorage:', e);
    }

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
  setButtonLoading(button, isLoading, loadingText = "🔄 Loading...") {
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
   */
  checkDuplicateNames(playerCount) {
    const names = [];
    const inputs = [];

    for (let i = 1; i <= playerCount; i++) {
      const input = document.getElementById(`p${i}`);
      if (input) {
        inputs.push(input);
        names.push(input.value.trim());
        input.classList.remove("form-input--error");
      }
    }

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
      this.setCodeDisplayCollapsed(true);
    }
  }

  /**
   * Collapse or expand the code display programmatically
   */
  setCodeDisplayCollapsed(collapsed) {
    const el = this.elements.codeDisplay;
    if (!el) return;

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
   */
  renderSchedule(players, matches) {
    const container = this.elements.scheduleGrid;
    if (!container) return;

    container.innerHTML = "";

    // Pull current standings so we can show overall rating when a player
    // has completed all their matches.
    const { rankedStats } = tournamentManager.getStandings();
    const statsByIndex = new Map();
    rankedStats.forEach((s) => statsByIndex.set(s.playerIndex, s));

    players.forEach((player, index) => {
      const playerMatches = matches.filter(
        (m) => m.player1 === index || m.player2 === index
      );

      const opponents = playerMatches.map((m) => {
        const opponentIndex = m.player1 === index ? m.player2 : m.player1;
        return players[opponentIndex];
      });

      // Consider a player 'completed' when all their matches have a winner
      const allCompleted =
        playerMatches.length > 0 &&
        playerMatches.every((m) => m.winner !== null);

      const scheduleItem = document.createElement("div");
      scheduleItem.className = `schedule-item${
        allCompleted ? " completed" : ""
      }`;

      // If completed, show overall rating (rank + points) if available
      const stat = statsByIndex.get(index);
      const ratingHtml =
        allCompleted && stat
          ? `<div class="player-rating">Rank ${
              stat.rank
            } · ${stat.points.toFixed(1)} pts</div>`
          : "";

      const statusHtml = allCompleted
        ? `<div class="player-status">✅ Done</div>`
        : "";

      scheduleItem.innerHTML = `
        <div class="schedule-item__title">
          <strong>${this.escapeHtml(player)}</strong>
          ${ratingHtml}
          ${statusHtml}
        </div>
        <div class="schedule-item__opponents">vs ${opponents
          .map((o) => this.escapeHtml(o))
          .join(", ")}</div>
      `;

      container.appendChild(scheduleItem);
    });
  }

  /**
   * Render all matches
   */
  renderMatches(matches, players) {
    const container = this.elements.matchesContainer;
    if (!container) return;

    container.innerHTML = "";

    matches.forEach((match) => {
      if (!match || !match.games || !Array.isArray(match.games)) {
        console.warn("Invalid match data:", match);
        return;
      }

      const card = this.createMatchCard(match, players);
      container.appendChild(card);
    });
  }

  /**
   * Create match card element
   */
  createMatchCard(match, players) {
    const card = document.createElement("div");
    card.className = "match-card";
    card.setAttribute("role", "listitem");

    if (match.winner !== null) {
      card.classList.add("completed");
    }

    const p1Name = players[match.player1];
    const p2Name = players[match.player2];
    const p1Wins = match.games.filter((g) => g === 1).length;
    const p2Wins = match.games.filter((g) => g === 2).length;

    let winnerBanner = "";
    if (match.winner !== null) {
      const winnerName = match.winner === 1 ? p1Name : p2Name;
      winnerBanner = `<div class="winner-banner">🏆 ${this.escapeHtml(
        winnerName
      )} wins!</div>`;
    }

    card.innerHTML = `
      <div class="match-card__header">
        <div class="match-number">Match ${match.id + 1}</div>
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

    return `
      <div class="player-row ${isWinner ? "winner" : ""}">
        <div class="player-name">${this.escapeHtml(playerName)}</div>
        <div class="game-score">
          ${[0, 1, 2]
            .map((gameNum) => this.createGameResult(match, gameNum, playerNum))
            .join("")}
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
   */
  renderStandings(rankedStats, tiedRanks, players) {
    const container = this.elements.standingsTable;
    if (!container) return;

    container.innerHTML = "";

    rankedStats.forEach((stat) => {
      const row = this.createStandingRow(stat, tiedRanks, rankedStats, players);
      container.appendChild(row);
    });
  }

  /**
   * Create standing row element
   */
  createStandingRow(stat, tiedRanks, rankedStats, players) {
    const row = document.createElement("div");
    row.className = "standing-row";
    row.setAttribute("role", "button");
    row.setAttribute("tabindex", "0");
    row.setAttribute("aria-expanded", "false");
    row.setAttribute("aria-label", `View details for ${stat.player}, rank ${stat.rank}, ${stat.points.toFixed(1)} points`);

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
    if (stat.rank === 1) rankClass = "gold";
    else if (stat.rank === 2) rankClass = "silver";
    else if (stat.rank === 3) rankClass = "bronze";

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

    row.innerHTML = `
      <div class="standing-rank ${rankClass}${tiedIndicator}">${stat.rank}</div>
      <div class="standing-info">
        <div class="standing-name">${this.escapeHtml(stat.player)}</div>
        <div class="standing-record">${stat.wins}-${stat.losses} matches</div>
        <div class="standing-details">
          ${stat.gamesWon}-${
      stat.gamesLost
    } games | Quality: ${stat.qualityScore.toFixed(1)}
        </div>
        <div class="standing-breakdown">
          <div class="breakdown-section">
            <strong>Points Breakdown:</strong><br>
            Match Wins: ${stat.wins} × 3 = ${stat.wins * 3} pts<br>
            Games Won: ${stat.gamesWon} × 1 = ${stat.gamesWon} pts<br>
            Games Lost: ${stat.gamesLost} × -0.5 = ${(
      stat.gamesLost * -0.5
    ).toFixed(1)} pts<br>
            <strong>Total: ${stat.points.toFixed(1)} pts</strong>
          </div>
          ${
            beatenList
              ? `
            <div class="breakdown-section">
              <strong>Victories Against:</strong>
              <div class="opponent-list">${beatenList}</div>
            </div>
          `
              : ""
          }
          ${
            lostToList
              ? `
            <div class="breakdown-section">
              <strong>Losses Against:</strong>
              <div class="opponent-list">${lostToList}</div>
            </div>
          `
              : ""
          }
          <div class="breakdown-section">
            <strong>Quality Score:</strong> ${stat.qualityScore.toFixed(1)}<br>
            <em style="font-size: 0.9em; color: #666;">
              (Sum of beaten opponents' points)
            </em>
          </div>
        </div>
      </div>
      <div class="standing-points">${stat.points.toFixed(
        1
      )}<span style="font-size: 0.6em; color: #999;">pts</span></div>
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
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
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
}

// Create global instance
const uiManager = new UIManager();
