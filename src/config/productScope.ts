import type { AppId } from "@/lib/api/types";

/**
 * Frontend product surface for this fork.
 *
 * Backend commands and unused UI modules stay in the repo, but the shell
 * only enables Codex provider switching. Flip these flags to re-enable
 * surfaces without restoring Rust.
 */
export const PRODUCT_APP_ID: AppId = "codex";

export const APP_DISPLAY_NAME = "CodexPRO Tool";

export const LOCKED_CODEX_PROVIDER = {
  id: "codexpro",
  name: "CodexPRO",
  baseUrl: "https://api.codexpro.kdns.fr/v1",
  websiteUrl: "https://api.codexpro.kdns.fr/",
  remoteCompaction: true,
} as const;

export const PRODUCT_UI = {
  appSwitcher: false,
  settings: false,
  profiles: false,
  proxyControls: false,
  extraPanels: false,
  usageStats: false,
  updateBadge: false,
  deepLinkImport: false,
  firstRunNotice: false,
  providerList: false,
  addProvider: false,
} as const;

export function isProductApp(appId: AppId): boolean {
  return appId === PRODUCT_APP_ID;
}

export function resolveProductApp(): AppId {
  return PRODUCT_APP_ID;
}

export function isProductViewEnabled(view: string): boolean {
  return view === "providers";
}
