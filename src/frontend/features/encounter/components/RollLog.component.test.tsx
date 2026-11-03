import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RollEntry } from "../context/DiceContext";
import { combatant } from "../lib/participantFixture";
import { RollLog } from "./RollLog";

const grizzle = combatant("g1", 1, {
  name: "Grizzle",
  is_player: false,
  ac: 15,
  description: "A one-eared goblin with a grudge.",
  actions: [
    {
      name: "Scimitar",
      desc: "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) slashing damage.",
    },
  ],
});
const isolde = combatant("isolde", 2, { name: "Isolde", ac: 16 });

const attack: RollEntry = {
  id: "r1",
  ts: 0,
  encounterId: "e",
  characterName: "Grizzle",
  rolledByDm: true,
  diceType: "1d20",
  result: 14,
  modifier: 4,
  total: 18,
  rollType: "Scimitar Attack",
  context: {
    kind: "attack",
    actorId: "g1",
    targetId: "isolde",
    source: { type: "monster_action", name: "Scimitar" },
  },
};

function renderAs(viewerIsDM: boolean) {
  render(<RollLog entries={[attack]} participants={[grizzle, isolde]} viewerIsDM={viewerIsDM} />);
}

describe("RollLog", () => {
  it("tells the DM who attacked whom, the modifiers and the verdict", () => {
    renderAs(true);
    expect(screen.getByText("Grizzle")).toBeInTheDocument();
    expect(screen.getByText(/→ Isolde/)).toBeInTheDocument();
    expect(screen.getByText("1d20 (14+4)")).toBeInTheDocument();
    expect(screen.getByText(/vs AC 16/)).toBeInTheDocument();
  });

  it("tells a player the same story without the monster's numbers", () => {
    renderAs(false);
    expect(screen.getByText(/→ Isolde/)).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.queryByText("1d20 (14+4)")).not.toBeInTheDocument();
    expect(screen.queryByText(/vs AC/)).not.toBeInTheDocument();
  });

  it("shows a player the ability's flavour, scrubbed of its stats", async () => {
    renderAs(false);
    await userEvent.click(screen.getByRole("button", { name: "Scimitar" }));
    expect(await screen.findByText(/reach 5 ft\., one target\. Hit: slashing damage\./)).toBeInTheDocument();
    expect(screen.queryByText(/\+4 to hit/)).not.toBeInTheDocument();
    expect(screen.getByText("A one-eared goblin with a grudge.")).toBeInTheDocument();
  });

  it("shows the DM the full text", async () => {
    renderAs(true);
    await userEvent.click(screen.getByRole("button", { name: "Scimitar" }));
    expect(await screen.findByText(/\+4 to hit/)).toBeInTheDocument();
  });
});
