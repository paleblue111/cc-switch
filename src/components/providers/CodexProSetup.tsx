import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { providersApi, settingsApi } from "@/lib/api";
import { useProvidersQuery } from "@/lib/query";
import { extractErrorMessage } from "@/utils/errorUtils";
import { LOCKED_CODEX_PROVIDER, PRODUCT_APP_ID } from "@/config/productScope";
import {
  buildCodexProProvider,
  extractCodexProApiKey,
  findLockedCodexProvider,
} from "@/config/codexProProvider";

export function CodexProSetup() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data, isLoading } = useProvidersQuery(PRODUCT_APP_ID);
  const existing = useMemo(
    () => findLockedCodexProvider(data?.providers ?? {}),
    [data?.providers],
  );
  const savedKey = extractCodexProApiKey(existing);
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const isApplied = Boolean(
    existing && data?.currentProviderId === existing.id,
  );

  useEffect(() => {
    setApiKey(savedKey);
  }, [savedKey]);

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
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 justify-center px-6 py-8">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {LOCKED_CODEX_PROVIDER.name}
              {isApplied && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t("codexPro.applied")}
                </span>
              )}
            </CardTitle>
            <CardDescription>{t("codexPro.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="codexpro-api-key">{t("codexPro.apiKey")}</Label>
              <Input
                id="codexpro-api-key"
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={t("codexPro.apiKeyPlaceholder")}
                autoComplete="off"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={() => void handleSave()}
              disabled={saving || !apiKey.trim()}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? t("common.saving") : t("codexPro.saveAndApply")}
            </Button>
          </CardFooter>
        </Card>
      </div>
      <div className="flex justify-center px-6 pb-6">
        <Button variant="outline" onClick={() => void handleOpenWebsite()}>
          <ExternalLink className="h-4 w-4" />
          {t("codexPro.openWebsite")}
        </Button>
      </div>
    </div>
  );
}
