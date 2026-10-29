/**
 * Unit tests for FirebaseManager.deleteAccount (Art. 17 GDPR).
 * Loads the real js/firebase.js with a fake Firebase SDK.
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';

let manager;
let calls;
let user;
let tournaments;

const fakeDatabase = () => ({
  ref: (path = '') => ({
    orderByChild: (field) => ({
      equalTo: (value) => ({
        once: async () => {
          calls.push(['query', path, field, value]);
          const matching = Object.entries(tournaments).filter(([, t]) => t[field] === value);
          return { forEach: (fn) => matching.forEach(([key]) => fn({ key })) };
        },
      }),
    }),
    update: async (updates) => {
      calls.push(['update', path, updates]);
    },
  }),
});

beforeAll(() => {
  globalThis.ENVIRONMENT = 'production';
  globalThis.firebase = {
    auth: { EmailAuthProvider: { credential: (email, password) => ({ email, password }) } },
  };
  (0, eval)(readFileSync('js/firebase.js', 'utf8') + '\n;globalThis.__FirebaseManager = FirebaseManager;');
});

beforeEach(() => {
  calls = [];
  tournaments = {
    MINE0001: { creator: 'u1' },
    MINE0002: { creator: 'u1' },
    THEIRS01: { creator: 'u2' },
  };
  user = {
    uid: 'u1',
    email: 'ada@example.com',
    reauthenticateWithCredential: vi.fn(async (credential) => calls.push(['reauth', credential])),
    delete: vi.fn(async () => calls.push(['deleteUser'])),
  };
  manager = new globalThis.__FirebaseManager();
  manager.isInitialized = true;
  manager.database = fakeDatabase();
  manager.auth = { currentUser: user };
});

describe('FirebaseManager.deleteAccount', () => {
  it('confirms the password, deletes own tournaments, then the sign-in account', async () => {
    await manager.deleteAccount('secret');

    expect(calls.map((c) => c[0])).toEqual(['reauth', 'query', 'update', 'deleteUser']);
    expect(calls[0][1]).toEqual({ email: 'ada@example.com', password: 'secret' });
  });

  it('deletes only the tournaments this user created, in one write', async () => {
    await manager.deleteAccount('secret');

    const updates = calls.filter((c) => c[0] === 'update');
    expect(updates).toHaveLength(1);
    expect(updates[0][2]).toEqual({ 'tournaments/MINE0001': null, 'tournaments/MINE0002': null });
  });

  it('skips the write when the user created no tournaments', async () => {
    tournaments = {};

    await manager.deleteAccount('secret');

    expect(calls.map((c) => c[0])).toEqual(['reauth', 'query', 'deleteUser']);
  });

  it('deletes nothing when the password is wrong', async () => {
    user.reauthenticateWithCredential.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'auth/wrong-password' }));

    await expect(manager.deleteAccount('nope')).rejects.toThrow();
    expect(calls.map((c) => c[0])).toEqual([]);
    expect(user.delete).not.toHaveBeenCalled();
  });

  it('keeps the account when its tournaments cannot be deleted, so it can be retried', async () => {
    manager.database.ref = (path = '') => ({
      ...fakeDatabase().ref(path),
      update: async () => { throw new Error('PERMISSION_DENIED'); },
    });

    await expect(manager.deleteAccount('secret')).rejects.toThrow('PERMISSION_DENIED');
    expect(user.delete).not.toHaveBeenCalled();
  });

  it('refuses when nobody is signed in', async () => {
    manager.auth = { currentUser: null };

    await expect(manager.deleteAccount('secret')).rejects.toThrow();
  });
});
