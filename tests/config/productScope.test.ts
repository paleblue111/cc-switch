import { describe, expect, it } from "vitest";
import {
  APP_DISPLAY_NAME,
  PRODUCT_APP_ID,
  PRODUCT_UI,
  isProductApp,
  isProductViewEnabled,
  resolveProductApp,
} from "@/config/productScope";

describe("productScope", () => {
  it("locks the frontend to Codex provider switching", () => {
    expect(APP_DISPLAY_NAME).toBe("CodexPRO Tool");
    expect(PRODUCT_APP_ID).toBe("codex");
    expect(resolveProductApp()).toBe("codex");
    expect(isProductApp("codex")).toBe(true);
    expect(isProductApp("claude")).toBe(false);
    expect(isProductViewEnabled("providers")).toBe(true);
    expect(isProductViewEnabled("settings")).toBe(false);
    expect(isProductViewEnabled("mcp")).toBe(false);
    expect(PRODUCT_UI.appSwitcher).toBe(false);
    expect(PRODUCT_UI.extraPanels).toBe(false);
    expect(PRODUCT_UI.providerList).toBe(false);
    expect(PRODUCT_UI.addProvider).toBe(false);
  });
});
