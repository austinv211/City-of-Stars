/**
 * The deterministic users from scripts/seed-test-users.mjs that the suite
 * signs in as. Duplicated rather than imported because that module is untyped
 * .mjs; the ids are fixed, so drift fails loudly at sign-in.
 */
export const USERS = {
  dm: {
    id: "00000000-0000-4000-8000-000000000001",
    email: "dm@test.local",
    password: "test-password-dm",
  },
  player1: {
    id: "00000000-0000-4000-8000-000000000002",
    email: "player1@test.local",
    password: "test-password-p1",
  },
  player2: {
    id: "00000000-0000-4000-8000-000000000003",
    email: "player2@test.local",
    password: "test-password-p2",
  },
} as const;

export type Role = keyof typeof USERS;

/** Where global-setup leaves each role's signed-in browser state. */
export const storageStatePath = (role: Role) => `e2e/.auth/${role}.json`;
