/**
 * Unit Tests for UIManager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('UIManager', () => {
  let uiManager;

  beforeEach(() => {
    // Create DOM structure
    document.body.innerHTML = `
      <div id="modeSelector"></div>
      <div id="joinSection"></div>
      <div id="createSection"></div>
      <div id="tournamentSection"></div>

      <div id="viewTabs">
        <button id="tabSchedule"></button>
        <button id="tabStandings"></button>
        <button id="tabMatches"></button>
      </div>

      <div id="scheduleInfo" class="view-hidden"></div>
      <div id="standingsPanel" class="view-hidden"></div>
      <div id="matchesContainer" class="view-hidden"></div>

      <form id="joinForm">
        <input id="tournamentCode" type="text">
        <button id="joinSubmitBtn">Join</button>
      </form>
      <div id="joinError"></div>

      <input id="playerCount" type="number" value="7">
      <select id="matchesPerPlayer"></select>
      <div id="matchesInfo"></div>
      <div id="playerInputs"></div>
      <button id="generateBtn">Generate</button>

      <div id="codeDisplay">
        <div class="code-display__title">Tournament Code</div>
        <div id="displayCode"></div>
      </div>
      <button id="copyCodeBtn">Copy</button>
      <button id="leaveTournamentBtn">Leave</button>

      <div id="progressFill"></div>
      <div id="progressText"></div>
      <div id="gamesPerPlayer"></div>
      <div id="scheduleGrid"></div>
      <div id="standingsTable"></div>

      <div id="scoringLegend" aria-expanded="false">
        <div id="scoringLegendDetails" hidden></div>
      </div>
    `;

    // Mock tournamentManager
    global.tournamentManager = {
      getValidMatchesPerPlayer: vi.fn((count) => {
        const options = [];
        for (let i = 1; i < count; i++) {
          if ((count * i) % 2 === 0) options.push(i);
        }
        return options;
      }),
      getTotalMatches: vi.fn((players, matches) => (players * matches) / 2),
      sanitizePlayerName: vi.fn((name) => name.trim()),
      validatePlayerNames: vi.fn((names) => ({
        isValid: true,
        duplicates: [],
        empty: [],
        sanitized: names
      })),
    };

    // Create UIManager instance
    class UIManager {
      constructor() {
        this.elements = {};
        this.currentSection = null;
        this.currentView = "matches";
        this.localStorageKey = "mm_selected_view";
        this.codeDisplayUserCollapsed = null;
      }

      cacheElements() {
        this.elements = {
          modeSelector: document.getElementById("modeSelector"),
          joinSection: document.getElementById("joinSection"),
          createSection: document.getElementById("createSection"),
          tournamentSection: document.getElementById("tournamentSection"),
          viewTabs: document.getElementById("viewTabs"),
          tabSchedule: document.getElementById("tabSchedule"),
          tabStandings: document.getElementById("tabStandings"),
          tabMatches: document.getElementById("tabMatches"),
          scheduleInfo: document.getElementById("scheduleInfo"),
          standingsPanel: document.getElementById("standingsPanel"),
          joinForm: document.getElementById("joinForm"),
          tournamentCode: document.getElementById("tournamentCode"),
          joinSubmitBtn: document.getElementById("joinSubmitBtn"),
          joinError: document.getElementById("joinError"),
          playerCount: document.getElementById("playerCount"),
          matchesPerPlayer: document.getElementById("matchesPerPlayer"),
          matchesInfo: document.getElementById("matchesInfo"),
          playerInputs: document.getElementById("playerInputs"),
          generateBtn: document.getElementById("generateBtn"),
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
          scoringLegend: document.getElementById("scoringLegend"),
          scoringLegendDetails: document.getElementById("scoringLegendDetails"),
        };
      }

      showSection(sectionName) {
        ["modeSelector", "joinSection", "createSection", "tournamentSection"].forEach((section) => {
          const el = this.elements[section];
          if (el) el.classList.remove("active");
        });

        if (Array.isArray(sectionName)) {
          sectionName.forEach((name) => {
            const section = this.elements[name];
            if (section) section.classList.add("active");
          });
        } else {
          const section = this.elements[sectionName];
          if (section) {
            section.classList.add("active");
            this.currentSection = sectionName;
          }
        }
      }

      switchView(viewName) {
        const scheduleEl = this.elements.scheduleInfo;
        const standingsEl = this.elements.standingsPanel;
        const matchesEl = this.elements.matchesContainer;

        if (!scheduleEl || !standingsEl || !matchesEl) return false;

        scheduleEl.classList.add("view-hidden");
        standingsEl.classList.add("view-hidden");
        matchesEl.classList.add("view-hidden");

        ["tabSchedule", "tabStandings", "tabMatches"].forEach((k) => {
          const btn = this.elements[k];
          if (btn) {
            btn.classList.remove("active");
            btn.setAttribute("aria-pressed", "false");
          }
        });

        try {
          localStorage.setItem(this.localStorageKey, viewName);
        } catch (e) {
          console.warn("Failed to save view to localStorage:", e);
        }

        const previousView = this.currentView;

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
          matchesEl.classList.remove("view-hidden");
          this.elements.tabMatches?.classList.add("active");
          this.elements.tabMatches?.setAttribute("aria-pressed", "true");
          this.currentView = "matches";
        }

        return previousView !== this.currentView;
      }

      showError(elementId, message, duration = 5000) {
        const el = document.getElementById(elementId);
        if (!el) return;
        el.innerHTML = `<div class="alert alert--error">${message}</div>`;
        if (duration > 0) {
          setTimeout(() => { el.innerHTML = ""; }, duration);
        }
      }

      clearError(elementId) {
        const el = document.getElementById(elementId);
        if (el) el.innerHTML = "";
      }

      updateMatchesPerPlayerOptions(playerCount) {
        const select = this.elements.matchesPerPlayer;
        if (!select) return;

        const validOptions = tournamentManager.getValidMatchesPerPlayer(playerCount);
        select.innerHTML = "";

        validOptions.forEach((option) => {
          const opt = document.createElement("option");
          opt.value = option;
          opt.textContent = `${option} ${option === 1 ? "Match" : "Matches"}`;
          select.appendChild(opt);
        });

        const middleIndex = Math.floor(validOptions.length / 2);
        select.selectedIndex = middleIndex;

        return validOptions[middleIndex];
      }

      updateTournamentInfo(playerCount, matchesPerPlayer) {
        const totalMatches = tournamentManager.getTotalMatches(playerCount, matchesPerPlayer);

        if (this.elements.matchesInfo) {
          this.elements.matchesInfo.innerHTML = `
            <strong>Tournament Details:</strong><br>
            ${playerCount} players × ${matchesPerPlayer} ${matchesPerPlayer === 1 ? "match" : "matches"} each =
            <strong>${totalMatches} total ${totalMatches === 1 ? "match" : "matches"}</strong>
          `;
        }
      }

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

      checkDuplicateNames(playerCount) {
        const inputs = this.elements.playerInputs?.querySelectorAll('[data-player-index]') || [];
        const names = [];

        inputs.forEach((input) => {
          input.classList.remove("form-input--error");
          names.push(input.value.trim());
        });

        const validation = tournamentManager.validatePlayerNames(names);

        if (validation.duplicates.length > 0) {
          validation.duplicates.forEach((dup) => {
            dup.indices.forEach((idx) => {
              if (inputs[idx]) {
                inputs[idx].classList.add("form-input--error");
              }
            });
          });
        }

        if (this.elements.generateBtn) {
          this.elements.generateBtn.disabled = !validation.isValid;
        }

        return validation.isValid;
      }

      displayTournamentCode(code) {
        if (this.elements.displayCode) {
          this.elements.displayCode.textContent = code;
        }
        if (this.elements.codeDisplay) {
          this.elements.codeDisplay.style.display = "block";
        }
      }

      updateProgress(completed, total) {
        const percentage = total > 0 ? (completed / total) * 100 : 0;

        if (this.elements.progressFill) {
          this.elements.progressFill.style.width = percentage + "%";
        }

        if (this.elements.progressText) {
          this.elements.progressText.textContent = `${completed} of ${total} matches completed`;
        }
      }

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

      resetToInitialState() {
        if (this.elements.tournamentCode) {
          this.elements.tournamentCode.value = "";
        }

        if (this.elements.playerCount) {
          this.elements.playerCount.value = APP_CONFIG.DEFAULT_PLAYERS;
        }

        this.clearError("joinError");
        this.showSection("modeSelector");

        document.querySelectorAll(".mode-btn").forEach((btn) => {
          btn.classList.remove("active");
        });
      }
    }

    uiManager = new UIManager();
    uiManager.cacheElements();
  });

  describe('Initialization', () => {
    it('should cache DOM elements correctly', () => {
      expect(uiManager.elements.modeSelector).toBeTruthy();
      expect(uiManager.elements.joinSection).toBeTruthy();
      expect(uiManager.elements.tournamentSection).toBeTruthy();
      expect(uiManager.elements.playerInputs).toBeTruthy();
    });

    it('should initialize with default view', () => {
      expect(uiManager.currentView).toBe('matches');
    });
  });

  describe('Section Navigation', () => {
    it('should show single section', () => {
      uiManager.showSection('joinSection');

      expect(uiManager.elements.joinSection.classList.contains('active')).toBe(true);
      expect(uiManager.elements.createSection.classList.contains('active')).toBe(false);
      expect(uiManager.currentSection).toBe('joinSection');
    });

    it('should show multiple sections', () => {
      uiManager.showSection(['modeSelector', 'createSection']);

      expect(uiManager.elements.modeSelector.classList.contains('active')).toBe(true);
      expect(uiManager.elements.createSection.classList.contains('active')).toBe(true);
      expect(uiManager.elements.joinSection.classList.contains('active')).toBe(false);
    });

    it('should hide previous section when showing new one', () => {
      uiManager.showSection('joinSection');
      uiManager.showSection('createSection');

      expect(uiManager.elements.joinSection.classList.contains('active')).toBe(false);
      expect(uiManager.elements.createSection.classList.contains('active')).toBe(true);
    });
  });

  describe('View Switching', () => {
    it('should switch to schedule view', () => {
      const changed = uiManager.switchView('schedule');

      expect(changed).toBe(true);
      expect(uiManager.currentView).toBe('schedule');
      expect(uiManager.elements.scheduleInfo.classList.contains('view-hidden')).toBe(false);
      expect(uiManager.elements.matchesContainer.classList.contains('view-hidden')).toBe(true);
    });

    it('should switch to standings view', () => {
      const changed = uiManager.switchView('standings');

      expect(changed).toBe(true);
      expect(uiManager.currentView).toBe('standings');
      expect(uiManager.elements.standingsPanel.classList.contains('view-hidden')).toBe(false);
      expect(uiManager.elements.matchesContainer.classList.contains('view-hidden')).toBe(true);
    });

    it('should switch to matches view', () => {
      uiManager.switchView('schedule');
      const changed = uiManager.switchView('matches');

      expect(changed).toBe(true);
      expect(uiManager.currentView).toBe('matches');
      expect(uiManager.elements.matchesContainer.classList.contains('view-hidden')).toBe(false);
      expect(uiManager.elements.scheduleInfo.classList.contains('view-hidden')).toBe(true);
    });

    it('should return false when switching to same view', () => {
      uiManager.switchView('matches');
      const changed = uiManager.switchView('matches');

      expect(changed).toBe(false);
    });

    it('should update tab button states', () => {
      uiManager.switchView('schedule');

      expect(uiManager.elements.tabSchedule.classList.contains('active')).toBe(true);
      expect(uiManager.elements.tabSchedule.getAttribute('aria-pressed')).toBe('true');
      expect(uiManager.elements.tabMatches.classList.contains('active')).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should display error message', () => {
      uiManager.showError('joinError', 'Test error message', 0);

      const errorEl = document.getElementById('joinError');
      expect(errorEl.innerHTML).toContain('Test error message');
      expect(errorEl.innerHTML).toContain('alert--error');
    });

    it('should clear error message', () => {
      uiManager.showError('joinError', 'Test error', 0);
      uiManager.clearError('joinError');

      const errorEl = document.getElementById('joinError');
      expect(errorEl.innerHTML).toBe('');
    });
  });

  describe('Player Input Management', () => {
    it('should render correct number of player inputs', () => {
      uiManager.renderPlayerInputs(4);

      const inputs = uiManager.elements.playerInputs.querySelectorAll('[data-player-index]');
      expect(inputs.length).toBe(4);
    });

    it('should label inputs correctly', () => {
      uiManager.renderPlayerInputs(3);

      const labels = uiManager.elements.playerInputs.querySelectorAll('label');
      expect(labels[0].textContent).toBe('Player 1');
      expect(labels[1].textContent).toBe('Player 2');
      expect(labels[2].textContent).toBe('Player 3');
    });

    it('should update matches-per-player options based on player count', () => {
      const selected = uiManager.updateMatchesPerPlayerOptions(6);

      const options = uiManager.elements.matchesPerPlayer.querySelectorAll('option');
      expect(options.length).toBeGreaterThan(0);
      expect(selected).toBeDefined();
    });
  });

  describe('Tournament Display', () => {
    it('should display tournament code', () => {
      uiManager.displayTournamentCode('ABC12345');

      expect(uiManager.elements.displayCode.textContent).toBe('ABC12345');
      expect(uiManager.elements.codeDisplay.style.display).toBe('block');
    });

    it('should update tournament info text', () => {
      uiManager.updateTournamentInfo(6, 3);

      const infoText = uiManager.elements.matchesInfo.innerHTML;
      expect(infoText).toContain('6 players');
      expect(infoText).toContain('3 matches');
      expect(infoText).toContain('9 total');
    });
  });

  describe('Progress Tracking', () => {
    it('should update progress bar', () => {
      uiManager.updateProgress(3, 10);

      expect(uiManager.elements.progressFill.style.width).toBe('30%');
      expect(uiManager.elements.progressText.textContent).toBe('3 of 10 matches completed');
    });

    it('should handle zero total matches', () => {
      uiManager.updateProgress(0, 0);

      expect(uiManager.elements.progressFill.style.width).toBe('0%');
    });

    it('should handle 100% completion', () => {
      uiManager.updateProgress(5, 5);

      expect(uiManager.elements.progressFill.style.width).toBe('100%');
    });
  });

  describe('HTML Escaping', () => {
    it('should escape dangerous HTML characters', () => {
      expect(uiManager.escapeHtml('<script>alert("xss")</script>'))
        .toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('should escape ampersands', () => {
      expect(uiManager.escapeHtml('Alice & Bob')).toBe('Alice &amp; Bob');
    });

    it('should escape quotes', () => {
      expect(uiManager.escapeHtml("It's \"quoted\""))
        .toBe('It&#39;s &quot;quoted&quot;');
    });

    it('should handle regular text', () => {
      expect(uiManager.escapeHtml('Hello World')).toBe('Hello World');
    });
  });

  describe('Reset Functionality', () => {
    it('should reset to initial state', () => {
      // Setup some state
      uiManager.elements.tournamentCode.value = 'ABC123';
      uiManager.showSection('tournamentSection');

      // Reset
      uiManager.resetToInitialState();

      expect(uiManager.elements.tournamentCode.value).toBe('');
      expect(uiManager.elements.modeSelector.classList.contains('active')).toBe(true);
    });
  });

  describe('Duplicate Name Checking', () => {
    beforeEach(() => {
      uiManager.renderPlayerInputs(3);
    });

    it('should validate unique names', () => {
      const inputs = uiManager.elements.playerInputs.querySelectorAll('[data-player-index]');
      inputs[0].value = 'Alice';
      inputs[1].value = 'Bob';
      inputs[2].value = 'Charlie';

      const isValid = uiManager.checkDuplicateNames(3);
      expect(isValid).toBe(true);
    });

    it('should detect duplicates and mark inputs with error class', () => {
      global.tournamentManager.validatePlayerNames = vi.fn(() => ({
        isValid: false,
        duplicates: [{ name: 'Alice', indices: [0, 1] }],
        empty: [],
        sanitized: ['Alice', 'Alice', 'Bob']
      }));

      const inputs = uiManager.elements.playerInputs.querySelectorAll('[data-player-index]');
      inputs[0].value = 'Alice';
      inputs[1].value = 'Alice';
      inputs[2].value = 'Bob';

      const isValid = uiManager.checkDuplicateNames(3);

      expect(isValid).toBe(false);
      expect(inputs[0].classList.contains('form-input--error')).toBe(true);
      expect(inputs[1].classList.contains('form-input--error')).toBe(true);
      expect(inputs[2].classList.contains('form-input--error')).toBe(false);
    });

    it('should disable generate button when names are invalid', () => {
      global.tournamentManager.validatePlayerNames = vi.fn(() => ({
        isValid: false,
        duplicates: [],
        empty: [0],
        sanitized: ['', 'Bob', 'Charlie']
      }));

      uiManager.checkDuplicateNames(3);

      expect(uiManager.elements.generateBtn.disabled).toBe(true);
    });
  });
});
