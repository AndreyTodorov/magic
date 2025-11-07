/**
 * LOGGING UTILITY
 * Provides consistent logging with levels and optional persistence
 */

class Logger {
  constructor() {
    // Log levels: 0 = none, 1 = error, 2 = warn, 3 = info, 4 = debug
    this.level = this.getLogLevel();
    this.logs = [];
    this.maxLogs = 100; // Keep last 100 logs
  }

  /**
   * Get log level from localStorage or default to info
   */
  getLogLevel() {
    try {
      const stored = localStorage.getItem("mm_log_level");
      if (stored) {
        const level = parseInt(stored);
        if (!isNaN(level) && level >= 0 && level <= 4) {
          return level;
        }
      }
    } catch (e) {
      // Ignore localStorage errors
    }
    // Default to info in development, warn in production
    return window.location.hostname === "localhost" ? 3 : 2;
  }

  /**
   * Set log level
   */
  setLogLevel(level) {
    if (level >= 0 && level <= 4) {
      this.level = level;
      try {
        localStorage.setItem("mm_log_level", level.toString());
      } catch (e) {
        // Ignore localStorage errors
      }
    }
  }

  /**
   * Add log to history
   */
  addToHistory(level, category, message, data) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
    };

    this.logs.push(entry);

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  /**
   * Format log message
   */
  format(category, message) {
    const timestamp = new Date().toLocaleTimeString();
    return `[${timestamp}] [${category}] ${message}`;
  }

  /**
   * Error logging
   */
  error(category, message, data) {
    if (this.level < 1) return;

    this.addToHistory("error", category, message, data);

    const formatted = this.format(category, message);
    if (data !== undefined) {
      console.error(formatted, data);
    } else {
      console.error(formatted);
    }
  }

  /**
   * Warning logging
   */
  warn(category, message, data) {
    if (this.level < 2) return;

    this.addToHistory("warn", category, message, data);

    const formatted = this.format(category, message);
    if (data !== undefined) {
      console.warn(formatted, data);
    } else {
      console.warn(formatted);
    }
  }

  /**
   * Info logging
   */
  info(category, message, data) {
    if (this.level < 3) return;

    this.addToHistory("info", category, message, data);

    const formatted = this.format(category, message);
    if (data !== undefined) {
      console.log(formatted, data);
    } else {
      console.log(formatted);
    }
  }

  /**
   * Debug logging
   */
  debug(category, message, data) {
    if (this.level < 4) return;

    this.addToHistory("debug", category, message, data);

    const formatted = this.format(category, message);
    if (data !== undefined) {
      console.debug(formatted, data);
    } else {
      console.debug(formatted);
    }
  }

  /**
   * Get log history
   */
  getHistory(filterLevel = null) {
    if (filterLevel) {
      return this.logs.filter((log) => log.level === filterLevel);
    }
    return this.logs;
  }

  /**
   * Export logs as JSON
   */
  exportLogs() {
    const dataStr = JSON.stringify(this.logs, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `magic-mikes-logs-${Date.now()}.json`;
    link.click();

    URL.revokeObjectURL(url);
    this.info("Logger", "Logs exported");
  }

  /**
   * Clear log history
   */
  clearHistory() {
    this.logs = [];
    this.info("Logger", "Log history cleared");
  }
}

// Create global logger instance
const logger = new Logger();

// Add developer tools to window
if (typeof window !== "undefined") {
  window.mmLogger = {
    setLevel: (level) => logger.setLogLevel(level),
    getHistory: () => logger.getHistory(),
    exportLogs: () => logger.exportLogs(),
    clearHistory: () => logger.clearHistory(),
    levels: {
      NONE: 0,
      ERROR: 1,
      WARN: 2,
      INFO: 3,
      DEBUG: 4,
    },
  };

  // Log available commands in development
  if (window.location.hostname === "localhost") {
    console.log(
      "%cMagic Mikes Logger",
      "color: #667eea; font-weight: bold; font-size: 16px"
    );
    console.log("Available commands:");
    console.log("• window.mmLogger.setLevel(level) - Set log level (0-4)");
    console.log("• window.mmLogger.getHistory() - Get log history");
    console.log("• window.mmLogger.exportLogs() - Export logs to file");
    console.log("• window.mmLogger.clearHistory() - Clear log history");
    console.log("• window.mmLogger.levels - Available log levels");
  }
}
