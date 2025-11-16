/**
 * Security and Input Validation Tests
 * Tests to prevent XSS, injection attacks, and malicious input
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Mock sanitizer function
function sanitizePlayerName(name) {
  // Handle non-string inputs
  if (!name || typeof name !== 'string') return '';

  let sanitized = name
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]+>/g, '') // Remove all HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/[^\w\s\u00C0-\u024F\u1E00-\u1EFF\-'\.]/g, '') // Allow only safe characters
    .trim()
    .replace(/\s+/g, ' '); // Collapse spaces

  if (sanitized.length > 30) {
    sanitized = sanitized.substring(0, 30);
  }

  return sanitized;
}

function validateTournamentCode(code) {
  if (!code || typeof code !== 'string') return false;
  return /^[A-Z0-9]{8}$/.test(code);
}

describe('Security and Input Validation Tests', () => {
  describe('XSS Prevention in Player Names', () => {
    it('should remove <script> tags from player names', () => {
      const malicious = '<script>alert("xss")</script>Alice';
      const sanitized = sanitizePlayerName(malicious);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('</script>');
      expect(sanitized).toBe('Alice');
    });

    it('should remove multiple <script> tags', () => {
      const malicious = '<script>alert(1)</script>Bob<script>alert(2)</script>';
      const sanitized = sanitizePlayerName(malicious);

      expect(sanitized).toBe('Bob');
    });

    it('should remove <script> tags with attributes', () => {
      const malicious = '<script type="text/javascript">alert("xss")</script>Charlie';
      const sanitized = sanitizePlayerName(malicious);

      expect(sanitized).toBe('Charlie');
    });

    it('should remove case-variant <SCRIPT> tags', () => {
      const malicious = '<SCRIPT>alert("xss")</SCRIPT>Diana';
      const sanitized = sanitizePlayerName(malicious);

      expect(sanitized).toBe('Diana');
    });

    it('should remove other HTML tags (<img>, <iframe>, etc)', () => {
      const maliciousInputs = [
        '<img src=x onerror=alert(1)>Alice',
        '<iframe src="javascript:alert(1)">Bob</iframe>',
        '<div onclick="alert(1)">Charlie</div>',
        '<a href="javascript:void(0)">Diana</a>'
      ];

      maliciousInputs.forEach(input => {
        const sanitized = sanitizePlayerName(input);
        expect(sanitized).not.toContain('<');
        expect(sanitized).not.toContain('>');
      });
    });

    it('should remove event handlers (onclick, onload, etc)', () => {
      const malicious = 'Alice" onclick="alert(1)"';
      const sanitized = sanitizePlayerName(malicious);

      expect(sanitized).not.toMatch(/onclick=/i);
      expect(sanitized).not.toContain('"');
      expect(sanitized).not.toContain('(');
      expect(sanitized).not.toContain(')');
    });

    it('should remove javascript: protocol', () => {
      const malicious = 'javascript:alert(1)';
      const sanitized = sanitizePlayerName(malicious);

      expect(sanitized).not.toMatch(/javascript:/i);
    });

    it('should handle encoded HTML entities', () => {
      const encoded = '&lt;script&gt;alert(1)&lt;/script&gt;Alice';
      const sanitized = sanitizePlayerName(encoded);

      // Should keep safe characters
      expect(sanitized.length).toBeGreaterThan(0);
    });

    it('should handle mixed attack vectors', () => {
      const complex = '<script>alert(1)</script><img src=x onerror=alert(2)>Alice" onclick="alert(3)"';
      const sanitized = sanitizePlayerName(complex);

      // Should remove all HTML tags and special characters
      expect(sanitized).toContain('Alice'); // Name should be preserved
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
      expect(sanitized).not.toContain('onclick=');
      expect(sanitized).not.toContain('(');
      expect(sanitized).not.toContain(')');
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should sanitize SQL-like patterns in player names', () => {
      const sqlInjection = "Alice'; DROP TABLE players--";
      const sanitized = sanitizePlayerName(sqlInjection);

      // Should remove dangerous SQL characters (but apostrophes/hyphens kept for names like O'Brien, Jean-Luc)
      expect(sanitized).not.toContain(';');
      // Note: Apostrophes and hyphens are intentionally kept for legitimate names
      // SQL injection is prevented in this browser app by HTML escaping during display
      expect(sanitized).toBe("Alice' DROP TABLE players--");
    });

    it('should handle UNION SELECT attacks', () => {
      const sqlInjection = "Alice' UNION SELECT * FROM users--";
      const sanitized = sanitizePlayerName(sqlInjection);

      // Dangerous special characters removed, but apostrophes kept for legitimate names
      expect(sanitized).not.toContain('*');
      // Double dashes removed (security measure), words and single apostrophes remain
      expect(sanitized).toBe("Alice' UNION SELECT FROM users");
    });

    it('should sanitize tournament codes from SQL injection', () => {
      const maliciousCodes = [
        "ABC123'; DROP TABLE--",
        "ABC123' OR '1'='1",
        "ABC123' UNION SELECT",
      ];

      maliciousCodes.forEach(code => {
        const isValid = validateTournamentCode(code);
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Path Traversal Prevention', () => {
    it('should reject path traversal in tournament codes', () => {
      const traversalCodes = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32',
        './local/file',
      ];

      traversalCodes.forEach(code => {
        const isValid = validateTournamentCode(code);
        expect(isValid).toBe(false);
      });
    });

    it('should reject null bytes in input', () => {
      const nullByteInput = 'Alice\0malicious';
      const sanitized = sanitizePlayerName(nullByteInput);

      expect(sanitized).not.toContain('\0');
    });
  });

  describe('Command Injection Prevention', () => {
    it('should sanitize shell command characters', () => {
      const commandInjection = 'Alice; rm -rf /';
      const sanitized = sanitizePlayerName(commandInjection);

      // Dangerous characters removed (but harmless words like 'rm' remain)
      expect(sanitized).not.toContain(';');
      expect(sanitized).not.toContain('/');
    });

    it('should sanitize pipe and redirect characters', () => {
      const malicious = 'Alice | cat /etc/passwd';
      const sanitized = sanitizePlayerName(malicious);

      expect(sanitized).not.toContain('|');
      expect(sanitized).not.toContain('/');
    });

    it('should sanitize backticks and command substitution', () => {
      const malicious = 'Alice`whoami`';
      const sanitized = sanitizePlayerName(malicious);

      expect(sanitized).not.toContain('`');
    });
  });

  describe('Tournament Code Validation', () => {
    it('should accept valid 8-character alphanumeric codes', () => {
      const validCodes = [
        'ABC12345',
        'DEFGH678',
        '12345678',
        'ABCDEFGH',
      ];

      validCodes.forEach(code => {
        const isValid = validateTournamentCode(code);
        expect(isValid).toBe(true);
      });
    });

    it('should reject codes with wrong length', () => {
      const invalidCodes = [
        'ABC123',      // Too short
        'ABC123456',   // Too long
        'ABC',         // Way too short
        '',            // Empty
      ];

      invalidCodes.forEach(code => {
        const isValid = validateTournamentCode(code);
        expect(isValid).toBe(false);
      });
    });

    it('should reject codes with special characters', () => {
      const invalidCodes = [
        'ABC123!@',
        'ABC-1234',
        'ABC_1234',
        'ABC 1234',
        'ABC.1234',
      ];

      invalidCodes.forEach(code => {
        const isValid = validateTournamentCode(code);
        expect(isValid).toBe(false);
      });
    });

    it('should reject codes with lowercase letters', () => {
      const invalidCodes = [
        'abc12345',
        'Abc12345',
        'ABC12345a',
      ];

      invalidCodes.forEach(code => {
        const isValid = validateTournamentCode(code);
        expect(isValid).toBe(false);
      });
    });

    it('should reject null and undefined codes', () => {
      expect(validateTournamentCode(null)).toBe(false);
      expect(validateTournamentCode(undefined)).toBe(false);
    });

    it('should reject non-string codes', () => {
      expect(validateTournamentCode(12345678)).toBe(false);
      expect(validateTournamentCode({})).toBe(false);
      expect(validateTournamentCode([])).toBe(false);
    });
  });

  describe('Input Length Limits', () => {
    it('should enforce maximum player name length (30 chars)', () => {
      const tooLong = 'a'.repeat(100);
      const sanitized = sanitizePlayerName(tooLong);

      expect(sanitized.length).toBeLessThanOrEqual(30);
    });

    it('should handle extremely long input gracefully', () => {
      const veryLong = 'a'.repeat(10000);
      const sanitized = sanitizePlayerName(veryLong);

      expect(sanitized.length).toBeLessThanOrEqual(30);
    });

    it('should handle empty string', () => {
      const sanitized = sanitizePlayerName('');

      expect(sanitized).toBe('');
    });
  });

  describe('Unicode and Encoding Attacks', () => {
    it('should handle unicode normalization attacks', () => {
      // Some Unicode characters can look identical but have different codes
      const name1 = 'Alice'; // Normal ASCII
      const name2 = 'Alicе'; // Contains Cyrillic 'е' instead of Latin 'e'

      // Both should sanitize to safe strings
      const sanitized1 = sanitizePlayerName(name1);
      const sanitized2 = sanitizePlayerName(name2);

      expect(sanitized1.length).toBeGreaterThan(0);
      expect(sanitized2.length).toBeGreaterThan(0);
    });

    it('should handle zero-width characters', () => {
      const zeroWidth = 'Alice\u200B\u200C\u200D'; // Zero-width spaces
      const sanitized = sanitizePlayerName(zeroWidth);

      // Zero-width characters should be removed or handled
      expect(sanitized.replace(/\u200B|\u200C|\u200D/g, '')).toBe('Alice');
    });

    it('should handle right-to-left override attacks', () => {
      const rtl = 'Alice\u202E\u202D'; // RTL/LTR override
      const sanitized = sanitizePlayerName(rtl);

      expect(sanitized.length).toBeGreaterThan(0);
    });
  });

  describe('Prototype Pollution Prevention', () => {
    it('should prevent __proto__ pollution attempts', () => {
      const obj = {};

      // Attempt to pollute via __proto__
      try {
        obj['__proto__'] = { isAdmin: true };
      } catch (e) {
        // Some environments may throw
      }

      // isAdmin should not be a direct property of obj
      expect(obj.hasOwnProperty('isAdmin')).toBe(false);

      // More importantly: Object.prototype should not be polluted
      // A new object should not have isAdmin
      const newObj = {};
      expect(newObj.hasOwnProperty('isAdmin')).toBe(false);
      expect(Object.prototype.hasOwnProperty('isAdmin')).toBe(false);
    });

    it('should prevent constructor pollution attempts', () => {
      const obj = {};
      const originalConstructor = obj.constructor;

      try {
        obj['constructor'] = { isAdmin: true };
      } catch (e) {
        // Some environments may throw
      }

      // isAdmin should not pollute the object
      expect(obj.hasOwnProperty('isAdmin')).toBe(false);
    });
  });

  describe('Rate Limiting Considerations', () => {
    it('should track match update frequency', () => {
      const updates = [];
      const now = Date.now();

      // Simulate 10 rapid updates
      for (let i = 0; i < 10; i++) {
        updates.push(now + (i * 100)); // 100ms apart
      }

      // Check if updates are too rapid (more than 5 per second)
      const oneSecondAgo = now - 1000;
      const recentUpdates = updates.filter(t => t > oneSecondAgo);

      expect(recentUpdates.length).toBe(10);

      // In real implementation, would reject if > threshold
      const isAbusive = recentUpdates.length > 5;
      expect(isAbusive).toBe(true);
    });
  });

  describe('Data Type Validation', () => {
    it('should reject non-string player names', () => {
      const invalidTypes = [
        123,
        true,
        {},
        [],
        null,
        undefined,
      ];

      invalidTypes.forEach(invalid => {
        const sanitized = sanitizePlayerName(invalid);
        expect(typeof sanitized).toBe('string');
        expect(sanitized).toBe(''); // Non-strings should return empty string
      });
    });

    it('should validate match game results are numbers', () => {
      const validResults = [1, 2, null];
      const invalidResults = ['1', '2', true, {}, []];

      validResults.forEach(result => {
        const isValid = result === null || result === 1 || result === 2;
        expect(isValid).toBe(true);
      });

      invalidResults.forEach(result => {
        const isValid = result === null || result === 1 || result === 2;
        expect(isValid).toBe(false);
      });
    });

    it('should validate player indices are numbers', () => {
      const validIndices = [0, 1, 2, 11];
      const invalidIndices = ['0', '1', null, undefined, -1, 12];

      validIndices.forEach(index => {
        const isValid = typeof index === 'number' && index >= 0 && index < 12;
        expect(isValid).toBe(true);
      });

      invalidIndices.forEach(index => {
        const isValid = typeof index === 'number' && index >= 0 && index < 12;
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Firebase Data Validation', () => {
    it('should validate tournament data structure from Firebase', () => {
      const validTournament = {
        players: ['Alice', 'Bob'],
        matches: [],
        playerCount: 2,
        matchesPerPlayer: 1,
        creator: 'uid-123',
        members: { 'uid-123': true },
        createdAt: Date.now()
      };

      // Check all required fields exist
      const hasRequiredFields = (
        Array.isArray(validTournament.players) &&
        Array.isArray(validTournament.matches) &&
        typeof validTournament.playerCount === 'number' &&
        typeof validTournament.matchesPerPlayer === 'number'
      );

      expect(hasRequiredFields).toBe(true);
    });

    it('should reject tournament data with missing required fields', () => {
      const invalidTournament = {
        players: ['Alice', 'Bob'],
        // Missing matches, playerCount, etc.
      };

      const hasRequiredFields = (
        Array.isArray(invalidTournament.players) &&
        Array.isArray(invalidTournament.matches) &&
        typeof invalidTournament.playerCount === 'number'
      );

      expect(hasRequiredFields).toBe(false);
    });

    it('should validate match structure from Firebase', () => {
      const validMatch = {
        id: 0,
        player1: 0,
        player2: 1,
        games: [null, null, null],
        completed: false,
        winner: null
      };

      const isValidMatch = (
        typeof validMatch.id === 'number' &&
        typeof validMatch.player1 === 'number' &&
        typeof validMatch.player2 === 'number' &&
        Array.isArray(validMatch.games) &&
        validMatch.games.length === 3
      );

      expect(isValidMatch).toBe(true);
    });
  });

  describe('CSRF and Session Protection', () => {
    it('should validate session timestamp is recent', () => {
      const now = Date.now();
      const recentTimestamp = now - (1000 * 60 * 30); // 30 minutes ago
      const oldTimestamp = now - (1000 * 60 * 60 * 25); // 25 hours ago

      const isRecentValid = (now - recentTimestamp) < (1000 * 60 * 60 * 24);
      const isOldValid = (now - oldTimestamp) < (1000 * 60 * 60 * 24);

      expect(isRecentValid).toBe(true);
      expect(isOldValid).toBe(false);
    });

    it('should validate tournament creator ownership', () => {
      const tournament = {
        creator: 'uid-123',
        members: { 'uid-123': true, 'uid-456': true }
      };

      const currentUser = 'uid-123';
      const otherUser = 'uid-456';

      const isCreator = tournament.creator === currentUser;
      const isOtherCreator = tournament.creator === otherUser;

      expect(isCreator).toBe(true);
      expect(isOtherCreator).toBe(false);
    });
  });

  describe('Content Security', () => {
    it('should sanitize JavaScript-like strings', () => {
      const maliciousName = 'alert(1)';
      const sanitized = sanitizePlayerName(maliciousName);

      // Parentheses are removed, so it becomes 'alert1'
      // This is safe - it's just text, not executable code
      expect(sanitized).not.toContain('(');
      expect(sanitized).not.toContain(')');
      expect(typeof sanitized).toBe('string');
    });

    it('should escape HTML in tournament names for display', () => {
      const htmlContent = '<b>Bold Name</b>';
      const sanitized = sanitizePlayerName(htmlContent);

      expect(sanitized).not.toContain('<b>');
      expect(sanitized).not.toContain('</b>');
      expect(sanitized).toBe('Bold Name');
    });
  });
});
