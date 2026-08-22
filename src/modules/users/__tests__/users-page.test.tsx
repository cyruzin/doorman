import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/toast/toast-provider";
import { ConfirmProvider } from "@/components/confirm/confirm-provider";

const mutateAsyncCreate = vi.fn().mockResolvedValue({});

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "1", name: "admin", role: "ADMIN" } } }),
}));

vi.mock("../hooks/use-users", () => ({
  useUsers: () => ({ data: { items: [], total: 0, page: 1, pageSize: 20 }, isLoading: false }),
  useCreateUser: () => ({ mutateAsync: mutateAsyncCreate }),
  useUpdateUser: () => ({ mutateAsync: vi.fn() }),
  useDeleteUser: () => ({ mutateAsync: vi.fn() }),
}));

import { UsersPage } from "../components/users-page";

function renderUsersPage() {
  return render(
    <ToastProvider>
      <ConfirmProvider>
        <UsersPage />
      </ConfirmProvider>
    </ToastProvider>,
  );
}

describe("UsersPage", () => {
  beforeEach(() => {
    mutateAsyncCreate.mockClear();
  });

  it("blocks creating a user without a password", async () => {
    renderUsersPage();

    await userEvent.click(screen.getByRole("button", { name: /novo usuário/i }));
    await userEvent.type(screen.getByLabelText(/^usuário$/i), "porteiro2");
    await userEvent.click(screen.getByRole("button", { name: /^criar$/i }));

    await waitFor(() => {
      expect(screen.getByText(/senha é obrigatória/i)).toBeInTheDocument();
    });
    expect(mutateAsyncCreate).not.toHaveBeenCalled();
  });

  it("creates a user once a password is provided", async () => {
    renderUsersPage();

    await userEvent.click(screen.getByRole("button", { name: /novo usuário/i }));
    await userEvent.type(screen.getByLabelText(/^usuário$/i), "porteiro2");
    await userEvent.type(screen.getByLabelText(/senha/i), "senha123");
    await userEvent.click(screen.getByRole("button", { name: /^criar$/i }));

    await waitFor(() => {
      expect(mutateAsyncCreate).toHaveBeenCalledWith({
        username: "porteiro2",
        password: "senha123",
        role: "DOORMAN",
      });
    });
  });
});
