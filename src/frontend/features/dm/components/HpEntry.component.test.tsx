import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HpEntry } from "./HpEntry";

function Harness({ start = 20 }: { start?: number }) {
  const [hp, setHp] = useState(start);
  return <HpEntry label="Isolde starting HP" value={hp} max={28} onChange={setHp} />;
}

const input = () => screen.getByRole("spinbutton", { name: "Isolde starting HP" });

describe("HpEntry", () => {
  it("won't go above the character's max when typed", async () => {
    render(<Harness />);
    await userEvent.clear(input());
    await userEvent.type(input(), "99");
    expect(input()).toHaveValue(28);
  });

  it("fills to max and steps by one", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Isolde starting HP: one less" }));
    expect(input()).toHaveValue(19);
    await userEvent.click(screen.getByRole("button", { name: "Full" }));
    expect(input()).toHaveValue(28);
    expect(screen.getByRole("button", { name: "Isolde starting HP: one more" })).toBeDisabled();
  });

  it("shows the max beside the value", () => {
    render(<Harness />);
    expect(screen.getByText("/ 28")).toBeInTheDocument();
  });
});
