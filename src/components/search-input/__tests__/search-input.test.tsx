import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchInput } from "../search-input";

describe("SearchInput", () => {
  it("hides the clear button when empty", () => {
    render(<SearchInput value="" onChange={vi.fn()} aria-label="Buscar" />);
    expect(screen.queryByRole("button", { name: /limpar busca/i })).not.toBeInTheDocument();
  });

  it("clears the value when the button is clicked", async () => {
    const onChange = vi.fn();
    render(<SearchInput value="admin" onChange={onChange} aria-label="Buscar" />);

    await userEvent.click(screen.getByRole("button", { name: /limpar busca/i }));

    expect(onChange).toHaveBeenCalledWith("");
  });
});
