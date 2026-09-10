import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { CodexProSetup } from "@/components/providers/CodexProSetup";
import { providersApi, settingsApi } from "@/lib/api";
import { LOCKED_CODEX_PROVIDER } from "@/config/productScope";
import { resetProviderState, setProviders } from "../msw/state";

const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

const renderSetup = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <CodexProSetup />
    </QueryClientProvider>,
  );
};

describe("CodexProSetup", () => {
  beforeEach(() => {
    resetProviderState();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
  });

  it("saves a new CodexPRO provider without showing the URL or compaction hint", async () => {
    const addSpy = vi.spyOn(providersApi, "add");
    const switchSpy = vi.spyOn(providersApi, "switch");
    renderSetup();

    expect(await screen.findByLabelText("codexPro.apiKey")).toBeInTheDocument();
    expect(
      screen.queryByDisplayValue(LOCKED_CODEX_PROVIDER.baseUrl),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("codexPro.remoteCompaction"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("codexPro.baseUrl")).not.toBeInTheDocument();

    const saveButton = screen.getByRole("button", {
      name: "codexPro.saveAndApply",
    });
    expect(saveButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("codexPro.apiKey"), {
      target: { value: "sk-codexpro" },
    });
    expect(saveButton).toBeEnabled();
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(addSpy).toHaveBeenCalled();
      expect(switchSpy).toHaveBeenCalledWith("codexpro", "codex");
    });
    expect(addSpy.mock.calls[0][0]).toMatchObject({
      id: "codexpro",
      name: "CodexPRO",
      settingsConfig: {
        auth: { OPENAI_API_KEY: "sk-codexpro" },
      },
    });
    expect(addSpy.mock.calls[0][0].settingsConfig.config).toContain(
      LOCKED_CODEX_PROVIDER.baseUrl,
    );
    expect(addSpy.mock.calls[0][0].settingsConfig.config).toContain(
      'name = "OpenAI"',
    );
    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalled();
    });
  });

  it("updates an existing CodexPRO provider instead of adding a second one", async () => {
    setProviders("codex", {
      "legacy-id": {
        id: "legacy-id",
        name: "CodexPRO",
        settingsConfig: {
          auth: { OPENAI_API_KEY: "old-key" },
          config: "",
        },
        category: "custom",
      },
    });
    const addSpy = vi.spyOn(providersApi, "add");
    const updateSpy = vi.spyOn(providersApi, "update");
    const switchSpy = vi.spyOn(providersApi, "switch");

    renderSetup();

    const keyInput = await screen.findByLabelText("codexPro.apiKey");
    await waitFor(() => expect(keyInput).toHaveValue("old-key"));
    fireEvent.change(keyInput, { target: { value: "new-key" } });
    fireEvent.click(
      screen.getByRole("button", { name: "codexPro.saveAndApply" }),
    );

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalled();
      expect(switchSpy).toHaveBeenCalledWith("legacy-id", "codex");
    });
    expect(addSpy).not.toHaveBeenCalled();
    expect(updateSpy.mock.calls[0][0]).toMatchObject({
      id: "legacy-id",
      settingsConfig: { auth: { OPENAI_API_KEY: "new-key" } },
    });
  });

  it("opens the official website from the bottom button", async () => {
    const openSpy = vi
      .spyOn(settingsApi, "openExternal")
      .mockResolvedValue(undefined);
    renderSetup();

    fireEvent.click(
      await screen.findByRole("button", { name: "codexPro.openWebsite" }),
    );

    await waitFor(() => {
      expect(openSpy).toHaveBeenCalledWith(LOCKED_CODEX_PROVIDER.websiteUrl);
    });
  });
});
