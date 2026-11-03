import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { combatant, scimitarAttack } from "../lib/participantFixture";
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

const attack = scimitarAttack();

function renderAs(viewerIsDM: boolean) {
  render(<RollLog entries={[attack]} participants={[grizzle, isolde]} viewerIsDM={viewerIsDM} />);
}

describe("RollLog", () => {
  it("tells the DM who attacked whom, the modifiers and the verdict", () => {
    renderAs(true);
    expect(screen.getByText("Grizzle")).toBeInTheDocument();
    expect(screen.getByText("Isolde")).toBeInTheDocument();
    expect(screen.getByText("1d20 (14+4)")).toBeInTheDocument();
    expect(screen.getByText(/vs AC 16/)).toBeInTheDocument();
  });

  it("tells a player the same story without the monster's numbers", () => {
    renderAs(false);
    expect(screen.getByText("Isolde")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.queryByText("1d20 (14+4)")).not.toBeInTheDocument();
    expect(screen.queryByText(/vs AC/)).not.toBeInTheDocument();
  });
});
