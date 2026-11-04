import { describe, expect, it } from "vitest";
import { candidateAction, candidateStatus, looksLikeEmail } from "./candidates";
import type { Candidate } from "../hooks/useCandidateSearch";

const person = (over: Partial<Candidate> = {}): Candidate => ({
  user_id: "u1",
  display_name: "Mira",
  email: "mira@example.com",
  member_roles: [],
  invited_roles: [],
  ...over,
});

describe("candidateAction", () => {
  it("adds a signed-up person who lacks the role", () => {
    expect(candidateAction(person(), "player")).toEqual({ kind: "add", userId: "u1" });
  });

  it("invites someone who has not signed up", () => {
    expect(candidateAction(person({ user_id: null }), "player")).toEqual({ kind: "invite" });
  });

  it("reports an existing role or invite instead of offering it again", () => {
    expect(candidateAction(person({ member_roles: ["player"] }), "player").kind).toBe("member");
    expect(candidateAction(person({ user_id: null, invited_roles: ["dm"] }), "dm").kind).toBe("invited");
  });

  it("still offers the other role to an existing member", () => {
    expect(candidateAction(person({ member_roles: ["player"] }), "dm").kind).toBe("add");
  });
});

describe("candidateStatus", () => {
  it("explains each state", () => {
    expect(candidateStatus(person({ member_roles: ["player"] }), "player")).toBe("Already a player here");
    expect(candidateStatus(person({ member_roles: ["player"] }), "dm")).toBe("Also a player here");
    expect(candidateStatus(person({ user_id: null }), "player")).toBe("Hasn't signed up yet");
    expect(candidateStatus(person(), "player")).toBe("");
  });
});

describe("looksLikeEmail", () => {
  it("accepts addresses and rejects names", () => {
    expect(looksLikeEmail(" a@b.co ")).toBe(true);
    expect(looksLikeEmail("Mira")).toBe(false);
  });
});
