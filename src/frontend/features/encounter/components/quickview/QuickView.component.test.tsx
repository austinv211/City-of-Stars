import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuickViewProvider, useQuickView } from "../../context/QuickViewContext";
import { combatant, scimitarAttack } from "../../lib/participantFixture";
import { RollLog } from "../RollLog";
import { AbilityQuickView } from "./AbilityQuickView";
import { CombatantQuickView } from "./CombatantQuickView";
import { QuickLink } from "./QuickLink";

const SCIMITAR =
  "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) slashing damage.";

const grizzle = combatant("g1", 1, {
  name: "Grizzle",
  is_player: false,
  ac: 15,
  hp_current: 4,
  hp_max: 7,
  conditions: ["Prone"],
  description: "A one-eared goblin with a grudge.",
  actions: [{ name: "Scimitar", desc: SCIMITAR }],
});
const isolde = combatant("isolde", 2, { name: "Isolde", ac: 16, hp_current: 21, hp_max: 28 });

const attack = scimitarAttack();

describe("AbilityQuickView", () => {
  const scimitar = { type: "monster_action", name: "Scimitar" } as const;

  it("gives the DM the full text", () => {
    render(<AbilityQuickView source={scimitar} actor={grizzle} viewerIsDM />);
    expect(screen.getByText(/\+4 to hit/)).toBeInTheDocument();
  });

  it("gives players the flavour without the numbers, and the monster's description", () => {
    render(<AbilityQuickView source={scimitar} actor={grizzle} viewerIsDM={false} />);
    expect(screen.getByText(/Hit: slashing damage\./)).toBeInTheDocument();
    expect(screen.queryByText(/\+4 to hit/)).not.toBeInTheDocument();
    expect(screen.getByText("A one-eared goblin with a grudge.")).toBeInTheDocument();
  });
});

describe("CombatantQuickView", () => {
  function renderAs(viewerIsDM: boolean, who = grizzle) {
    render(
      <CombatantQuickView
        participant={who}
        participants={[grizzle, isolde]}
        history={[attack]}
        effects={[]}
        viewerIsDM={viewerIsDM}
      />,
    );
  }
  const fact = (label: string) => screen.getByText(label).nextElementSibling?.textContent;

  it("hides a monster's HP and AC from players, but not its condition", () => {
    renderAs(false);
    expect(fact("HP")).toBe("?");
    expect(fact("AC")).toBe("?");
    expect(screen.getByText("Prone")).toBeInTheDocument();
  });

  it("shows the DM a monster's numbers", () => {
    renderAs(true);
    expect(fact("HP")).toBe("4/7");
    expect(fact("AC")).toBe("15");
  });

  it("shows a player another player's numbers", () => {
    renderAs(false, isolde);
    expect(fact("HP")).toBe("21/28");
    expect(fact("AC")).toBe("16");
  });

  it("lists what it has done lately", () => {
    renderAs(true);
    const lately = screen.getByRole("region", { name: "Recent actions" });
    expect(within(lately).getByText("Scimitar")).toBeInTheDocument();
    expect(within(lately).getByText(/→ Isolde/)).toBeInTheDocument();
  });
});

/** Shows whatever the quick view was asked to open. */
function Opened() {
  const quickView = useQuickView();
  const s = quickView?.subject;
  if (!s) return <p>closed</p>;
  return <p>{s.kind === "combatant" ? `combatant ${s.id}` : `ability ${s.source.name}`}</p>;
}

describe("quick view links", () => {
  it("open the combatant or ability they name, from the log", async () => {
    render(
      <QuickViewProvider>
        <RollLog entries={[attack]} participants={[grizzle, isolde]} viewerIsDM={false} />
        <Opened />
      </QuickViewProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Isolde" }));
    expect(screen.getByText("combatant isolde")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Scimitar" }));
    expect(screen.getByText("ability Scimitar")).toBeInTheDocument();
  });

  it("are plain text where there's no quick view", () => {
    render(<QuickLink subject={{ kind: "combatant", id: "isolde" }}>Isolde</QuickLink>);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("Isolde")).toBeInTheDocument();
  });
});
