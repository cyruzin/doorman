import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const useOwnersMock = vi.fn();

vi.mock("@/hooks/use-debounced-value", () => ({
  useDebouncedValue: (value: unknown) => value,
}));

vi.mock("@/modules/owners/hooks/use-owners", () => ({
  useOwners: (params: unknown) => useOwnersMock(params),
}));

import { OwnerPicker } from "../owner-picker";

describe("OwnerPicker", () => {
  beforeEach(() => {
    useOwnersMock.mockReset();
    useOwnersMock.mockReturnValue({ data: { items: [], total: 0, page: 1, pageSize: 10 }, isFetching: false });
  });

  it("shows the previously selected owner's label without searching", () => {
    render(<OwnerPicker id="ownerId" value="o1" defaultLabel="Owner Person (apto 101)" onChange={vi.fn()} />);
    expect(screen.getByRole("textbox")).toHaveValue("Owner Person (apto 101)");
  });

  it("prompts for more characters before searching", async () => {
    render(<OwnerPicker id="ownerId" value="" onChange={vi.fn()} />);

    await userEvent.type(screen.getByRole("textbox"), "a");

    expect(screen.getByText(/digite ao menos 2 letras/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /apto/i })).not.toBeInTheDocument();
  });

  it("lists matching owners once enough characters are typed", async () => {
    useOwnersMock.mockReturnValue({
      data: { items: [{ id: "o1", name: "Owner Person", unit: "101" }], total: 1, page: 1, pageSize: 10 },
      isFetching: false,
    });
    render(<OwnerPicker id="ownerId" value="" onChange={vi.fn()} />);

    await userEvent.type(screen.getByRole("textbox"), "ow");

    expect(screen.getByRole("button", { name: "Owner Person (apto 101)" })).toBeInTheDocument();
  });

  it("selects an owner, fills the input and closes the dropdown", async () => {
    useOwnersMock.mockReturnValue({
      data: { items: [{ id: "o1", name: "Owner Person", unit: "101" }], total: 1, page: 1, pageSize: 10 },
      isFetching: false,
    });
    const onChange = vi.fn();
    render(<OwnerPicker id="ownerId" value="" onChange={onChange} />);

    await userEvent.type(screen.getByRole("textbox"), "ow");
    await userEvent.click(screen.getByRole("button", { name: "Owner Person (apto 101)" }));

    expect(onChange).toHaveBeenCalledWith("o1");
    expect(screen.getByRole("textbox")).toHaveValue("Owner Person (apto 101)");
    expect(screen.queryByRole("button", { name: "Owner Person (apto 101)" })).not.toBeInTheDocument();
  });

  it("shows a loading hint while the search is in flight", async () => {
    useOwnersMock.mockReturnValue({ data: undefined, isFetching: true });
    render(<OwnerPicker id="ownerId" value="" onChange={vi.fn()} />);

    await userEvent.type(screen.getByRole("textbox"), "ow");
    expect(screen.getByText(/buscando/i)).toBeInTheDocument();
  });

  it("shows a no-results hint when nothing matches", async () => {
    render(<OwnerPicker id="ownerId" value="" onChange={vi.fn()} />);

    await userEvent.type(screen.getByRole("textbox"), "zz");
    expect(screen.getByText(/nenhum proprietário encontrado/i)).toBeInTheDocument();
  });

  it("offers a Nenhum option to clear an existing selection", async () => {
    const onChange = vi.fn();
    render(<OwnerPicker id="ownerId" value="o1" defaultLabel="Owner Person (apto 101)" onChange={onChange} />);

    await userEvent.click(screen.getByRole("textbox"));
    await userEvent.click(screen.getByRole("button", { name: "Nenhum" }));

    expect(onChange).toHaveBeenCalledWith("");
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("invalidates the previous selection as soon as the user types again", async () => {
    const onChange = vi.fn();
    render(<OwnerPicker id="ownerId" value="o1" defaultLabel="Owner Person (apto 101)" onChange={onChange} />);

    await userEvent.type(screen.getByRole("textbox"), "x");
    expect(onChange).toHaveBeenCalledWith("");
  });
});
