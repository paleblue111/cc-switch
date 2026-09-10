import type { Provider } from "@/types";
import {
  generateThirdPartyAuth,
  generateThirdPartyConfig,
} from "@/config/codexProviderPresets";
import { setCodexRemoteCompaction } from "@/utils/providerConfigUtils";
import { LOCKED_CODEX_PROVIDER } from "@/config/productScope";

export function findLockedCodexProvider(
  providers: Record<string, Provider>,
): Provider | undefined {
  return (
    providers[LOCKED_CODEX_PROVIDER.id] ||
    Object.values(providers).find(
      (provider) => provider.name === LOCKED_CODEX_PROVIDER.name,
    )
  );
}

export function extractCodexProApiKey(provider?: Provider): string {
  const apiKey = provider?.settingsConfig?.auth?.OPENAI_API_KEY;
  return typeof apiKey === "string" ? apiKey : "";
}

export function buildCodexProConfig(): string {
  const config = generateThirdPartyConfig(
    LOCKED_CODEX_PROVIDER.name,
    LOCKED_CODEX_PROVIDER.baseUrl,
  );
  if (!LOCKED_CODEX_PROVIDER.remoteCompaction) {
    return config;
  }
  return setCodexRemoteCompaction(config, true, LOCKED_CODEX_PROVIDER.name);
}

export function buildCodexProProvider(
  apiKey: string,
  existing?: Provider,
): Provider {
  return {
    id: existing?.id ?? LOCKED_CODEX_PROVIDER.id,
    name: LOCKED_CODEX_PROVIDER.name,
    websiteUrl: LOCKED_CODEX_PROVIDER.websiteUrl,
    category: "custom",
    icon: "openai",
    createdAt: existing?.createdAt ?? Date.now(),
    sortIndex: existing?.sortIndex ?? 0,
    settingsConfig: {
      auth: generateThirdPartyAuth(apiKey),
      config: buildCodexProConfig(),
    },
  };
}
