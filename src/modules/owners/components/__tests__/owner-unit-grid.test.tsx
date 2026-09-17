import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { OwnerUnitGrid } from "../owner-unit-grid";

function unitButton(unit: string) {
  return screen.getAllByRole("button", { name: unit })[0];
}

describe("OwnerUnitGrid", () => {
  it("blocks a locked unit but still explains why on hover", async () => {
    const onToggle = vi.fn();
    render(<OwnerUnitGrid selectedUnits={["506"]} onToggle={onToggle} lockedUnits={["506"]} />);

    const locked = unitButton("506");
    expect(locked).toHaveAttribute("aria-disabled", "true");
    expect(locked.closest("[data-tooltip]")).toHaveAttribute("data-tooltip", 'Use "Desvincular" para remover');

    await userEvent.click(locked);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("still toggles a unit that isn't locked", async () => {
    const onToggle = vi.fn();
    render(<OwnerUnitGrid selectedUnits={["506"]} onToggle={onToggle} lockedUnits={["506"]} />);

    await userEvent.click(unitButton("505"));
    expect(onToggle).toHaveBeenCalledWith("505");
  });
});
