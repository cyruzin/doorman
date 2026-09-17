import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Modal } from "../modal";

describe("Modal", () => {
  it("closes on the X button", async () => {
    const onClose = vi.fn();
    render(
      <Modal title="Desvincular" onClose={onClose}>
        <p>conteúdo</p>
      </Modal>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes on Esc", async () => {
    const onClose = vi.fn();
    render(
      <Modal title="Desvincular" onClose={onClose}>
        <p>conteúdo</p>
      </Modal>,
    );

    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes on the backdrop but not on a click inside the card", async () => {
    const onClose = vi.fn();
    render(
      <Modal title="Desvincular" onClose={onClose}>
        <p>conteúdo</p>
      </Modal>,
    );

    await userEvent.click(screen.getByText("conteúdo"));
    expect(onClose).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("dialog").parentElement!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("labels the dialog with its title", () => {
    render(
      <Modal title="Desativar proprietário" onClose={vi.fn()} role="alertdialog">
        <p>conteúdo</p>
      </Modal>,
    );

    expect(screen.getByRole("alertdialog", { name: "Desativar proprietário" })).toBeInTheDocument();
  });

  it("stops listening for Esc once closed", async () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <Modal title="Desvincular" onClose={onClose}>
        <p>conteúdo</p>
      </Modal>,
    );

    unmount();
    await userEvent.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
  });
});
