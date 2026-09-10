import { describe, expect, it } from "vitest";
import type { Provider } from "@/types";
import {
  buildCodexProConfig,
  buildCodexProProvider,
  extractCodexProApiKey,
  findLockedCodexProvider,
} from "@/config/codexProProvider";
import { isCodexRemoteCompactionEnabled } from "@/utils/providerConfigUtils";
import { LOCKED_CODEX_PROVIDER } from "@/config/productScope";

describe("codexProProvider", () => {
  it("builds CodexPRO config with the locked URL and remote compaction on", () => {
    const config = buildCodexProConfig();
    expect(config).toContain(`base_url = "${LOCKED_CODEX_PROVIDER.baseUrl}"`);
    expect(isCodexRemoteCompactionEnabled(config)).toBe(true);
    expect(config).toContain('name = "OpenAI"');
  });

  it("builds a stable provider and preserves an existing id", () => {
    const created = buildCodexProProvider("sk-test");
    expect(created.id).toBe("codexpro");
    expect(created.name).toBe("CodexPRO");
    expect(created.settingsConfig.auth.OPENAI_API_KEY).toBe("sk-test");
    expect(created.settingsConfig.config).toContain(
      LOCKED_CODEX_PROVIDER.baseUrl,
    );

    const existing: Provider = {
      id: "legacy-uuid",
      name: "CodexPRO",
      settingsConfig: { auth: { OPENAI_API_KEY: "old" }, config: "" },
      createdAt: 123,
      sortIndex: 4,
    };
    const updated = buildCodexProProvider("sk-new", existing);
    expect(updated.id).toBe("legacy-uuid");
    expect(updated.createdAt).toBe(123);
    expect(updated.sortIndex).toBe(4);
    expect(extractCodexProApiKey(updated)).toBe("sk-new");
  });

  it("finds the locked provider by id or name", () => {
    const byId = {
      codexpro: buildCodexProProvider("sk-1"),
    };
    expect(findLockedCodexProvider(byId)?.id).toBe("codexpro");

    const byName = {
      "other-id": {
        id: "other-id",
        name: "CodexPRO",
        settingsConfig: {},
      },
    };
    expect(findLockedCodexProvider(byName)?.id).toBe("other-id");
  });
});
