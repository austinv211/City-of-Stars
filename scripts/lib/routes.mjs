/**
 * Every top-level route, by the seeded user who can reach it. The responsive
 * e2e spec and the Android check both walk this list.
 */
export const ROUTES = {
  player1: ["/characters", "/campaigns", "/encounter", "/schedule"],
  dm: [
    "/dm/campaigns",
    "/dm/members",
    "/dm/characters",
    "/dm/sessions",
    "/dm/encounters",
    "/dm/monsters",
    "/dm/wild-magic",
    "/schedule",
  ],
};
