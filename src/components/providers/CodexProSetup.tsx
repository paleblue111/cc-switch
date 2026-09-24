import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  Loader2,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { providersApi, settingsApi } from "@/lib/api";
import { subscriptionApi } from "@/lib/api/subscription";
import { useProvidersQuery } from "@/lib/query";
import { extractErrorMessage } from "@/utils/errorUtils";
import { LOCKED_CODEX_PROVIDER, PRODUCT_APP_ID } from "@/config/productScope";
import {
  buildCodexProProvider,
  extractCodexProApiKey,
  findLockedCodexProvider,
} from "@/config/codexProProvider";

const BALANCE_POLL_MS = 5 * 60 * 1000;

type AppLanguage = "en" | "zh";

function resolveAppLanguage(raw: string | undefined): AppLanguage {
  return raw?.toLowerCase().startsWith("zh") ? "zh" : "en";
}

function persistLanguage(lang: AppLanguage) {
  try {
    window.localStorage.setItem("language", lang);
  } catch {
    // ignore storage failures
  }
}

export function CodexProSetup() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { data, isLoading } = useProvidersQuery(PRODUCT_APP_ID);
  const existing = useMemo(
    () => findLockedCodexProvider(data?.providers ?? {}),
    [data?.providers],
  );
  const savedKey = extractCodexProApiKey(existing);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const requestIdRef = useRef(0);
  const isApplied = Boolean(
    existing && data?.currentProviderId === existing.id,
  );
  const language = resolveAppLanguage(i18n.language);

  useEffect(() => {
    setApiKey(savedKey);
  }, [savedKey]);

  const fetchBalance = useCallback(
    async (key: string, opts?: { silent?: boolean }) => {
      const trimmed = key.trim();
      if (!trimmed) {
        setCredits(null);
        setBalanceError(null);
        return;
      }

      const requestId = ++requestIdRef.current;
      if (!opts?.silent) {
        setBalanceLoading(true);
      }
      try {
        const result = await subscriptionApi.getBalance(
          LOCKED_CODEX_PROVIDER.baseUrl,
          trimmed,
        );
        if (requestId !== requestIdRef.current) return;

        if (!result.success) {
          setCredits(null);
          setBalanceError(result.error || t("codexPro.balanceQueryFailed"));
          return;
        }

        const remaining = result.data?.[0]?.remaining;
        setCredits(typeof remaining === "number" ? remaining : null);
        setBalanceError(null);
      } catch (error) {
        if (requestId !== requestIdRef.current) return;
        setCredits(null);
        setBalanceError(
          extractErrorMessage(error) || t("codexPro.balanceQueryFailed"),
        );
      } finally {
        if (requestId === requestIdRef.current) {
          setBalanceLoading(false);
        }
      }
    },
    [t],
  );

  useEffect(() => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setCredits(null);
      setBalanceError(null);
      return;
    }

    void fetchBalance(trimmed);
    const timer = window.setInterval(() => {
      void fetchBalance(trimmed, { silent: true });
    }, BALANCE_POLL_MS);
    return () => window.clearInterval(timer);
  }, [apiKey, fetchBalance]);

  const handleLanguageToggle = () => {
    const next: AppLanguage = language === "en" ? "zh" : "en";
    void i18n.changeLanguage(next);
    persistLanguage(next);
    void settingsApi
      .get()
      .then((settings) => settingsApi.save({ ...settings, language: next }))
      .catch((error) =>
        console.error("[CodexProSetup] Failed to persist language", error),
      );
  };

  const handleSave = async () => {
    const nextKey = apiKey.trim();
    if (!nextKey) {
      toast.error(t("codexPro.keyRequired"));
      return;
    }

    setSaving(true);
    try {
      const provider = buildCodexProProvider(nextKey, existing);
      if (existing) {
        await providersApi.update(provider, PRODUCT_APP_ID, existing.id);
      } else {
        await providersApi.add(provider, PRODUCT_APP_ID);
      }
      await providersApi.switch(provider.id, PRODUCT_APP_ID);
      await queryClient.invalidateQueries({
        queryKey: ["providers", PRODUCT_APP_ID],
      });
      try {
        await providersApi.updateTrayMenu();
      } catch (error) {
        console.error("[CodexProSetup] Failed to update tray menu", error);
      }
      toast.success(t("codexPro.saved"));
      void fetchBalance(nextKey);
    } catch (error) {
      toast.error(extractErrorMessage(error) || t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const handleOpenWebsite = async () => {
    const url = LOCKED_CODEX_PROVIDER.websiteUrl;
    try {
      await settingsApi.openExternal(url);
    } catch (error) {
      const popup = window.open(url, "_blank", "noopener,noreferrer");
      if (!popup) {
        toast.error(extractErrorMessage(error) || t("common.error"));
      }
    }
  };

  if (isLoading && !data) {
    return (
      <div
        className="flex flex-1 items-center justify-center text-[#71717A]"
        style={{
          fontFamily:
            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          backgroundColor: "#F7F7F8",
        }}
      >
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {t("common.loading")}
      </div>
    );
  }

  const lowCredits =
    typeof credits === "number" && credits > 0 && credits < 10;
  const emptyCredits = typeof credits === "number" && credits <= 0;

  const creditNumberClass = emptyCredits
    ? "text-[#B91C1C]"
    : lowCredits
      ? "text-[#B45309]"
      : "text-[#15803D]";

  return (
    <div
      className="flex flex-1 flex-col"
      style={{
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        backgroundColor: "#F7F7F8",
      }}
    >
      {/* Single flat surface — no floating card */}
      <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col px-5 pb-5 pt-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[19px] font-semibold leading-tight tracking-tight text-[#18181B]">
                {LOCKED_CODEX_PROVIDER.name}
              </h1>
              {isApplied && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] px-2 py-0.5 text-[11px] font-medium text-[#166534]">
                  <CheckCircle2 className="h-3 w-3" />
                  {t("codexPro.applied")}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-[13px] leading-snug text-[#71717A]">
              {t("codexPro.subtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLanguageToggle}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] px-2.5 py-1.5 text-[12px] text-[#52525B] transition-colors duration-150 hover:bg-[#F4F4F5]"
          >
            <span aria-hidden>🌐</span>
            {language === "en"
              ? t("codexPro.switchToChinese")
              : t("codexPro.switchToEnglish")}
          </button>
        </div>

        {/* Body */}
        <div className="mt-5 space-y-4">
          {/* API Key */}
          <div className="space-y-2">
            <Label
              htmlFor="codexpro-api-key"
              className="text-[13px] font-medium text-[#18181B]"
            >
              {t("codexPro.apiKey")}
            </Label>
            <div className="relative">
              <Input
                id="codexpro-api-key"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={t("codexPro.apiKeyPlaceholder")}
                autoComplete="off"
                className="h-11 rounded-lg border-[#E4E4E7] bg-white pr-10 text-[14px] text-[#18181B] shadow-none transition-[border-color,box-shadow] duration-150 placeholder:text-[#A1A1AA] focus:border-[#A1A1AA] focus:ring-1 focus:ring-[#18181B]/20 dark:focus:ring-[#18181B]/20"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[#71717A] transition-colors duration-150 hover:bg-[#F4F4F5] hover:text-[#18181B]"
                aria-label={showKey ? "Hide API key" : "Show API key"}
                title={showKey ? "Hide" : "Show"}
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Credits — compact inset */}
          <div
            className="rounded-[10px] border border-[#E4E4E7] px-4 py-3"
            style={{ backgroundColor: "#FAFAFA", minHeight: 80 }}
          >
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <div className="text-[13px] font-medium text-[#52525B]">
                {t("codexPro.credits")}
              </div>
              <button
                type="button"
                onClick={() => void fetchBalance(apiKey)}
                disabled={balanceLoading || !apiKey.trim()}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#71717A] transition-colors duration-150 hover:bg-[#F4F4F5] disabled:opacity-40"
                title={t("codexPro.refreshBalance")}
                aria-label={t("codexPro.refreshBalance")}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${balanceLoading ? "animate-spin" : ""}`}
                />
              </button>
            </div>

            {!apiKey.trim() ? (
              <div className="text-[28px] font-semibold leading-none tabular-nums text-[#A1A1AA]">
                —
              </div>
            ) : balanceLoading && credits === null && !balanceError ? (
              <div className="flex h-7 items-center gap-2 text-[13px] text-[#71717A]">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : balanceError ? (
              <div className="flex items-start gap-2 text-[13px] text-[#B91C1C]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="leading-snug">{balanceError}</span>
              </div>
            ) : (
              <div className="flex items-baseline gap-1.5">
                <span
                  className={`text-[28px] font-semibold leading-none tabular-nums ${creditNumberClass}`}
                >
                  {typeof credits === "number" ? credits.toFixed(2) : "—"}
                </span>
                <span className="text-[13px] text-[#71717A]">
                  {t("codexPro.creditUnit")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-auto flex flex-col gap-2.5 pt-5">
          <Button
            onClick={() => void handleSave()}
            disabled={saving || !apiKey.trim()}
            className="h-[42px] w-full rounded-lg bg-[#18181B] text-[14px] font-medium text-white transition-colors duration-150 hover:bg-[#27272A] disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? t("common.saving") : t("codexPro.saveAndApply")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleOpenWebsite()}
            className="h-[42px] w-full rounded-lg border-[#E4E4E7] bg-white text-[14px] font-medium text-[#3F3F46] shadow-none transition-colors duration-150 hover:bg-[#FAFAFA] hover:text-[#18181B]"
          >
            {t("codexPro.openWebsite")}
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
