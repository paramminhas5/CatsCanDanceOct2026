import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { applyTheme, THEME_PRESETS, ThemeConfig, DEFAULT_THEME, FRONTEND_PRESET_IDS } from "@/lib/theme";

const FRONTEND_IDS = FRONTEND_PRESET_IDS.filter((id) => THEME_PRESETS[id]);

type Ctx = {
  config: ThemeConfig;
  setPreset: (preset: string) => void;
  clearOverride: () => void;
  hasLocalOverride: boolean;
  presetIds: string[];
};

const ThemeCtx = createContext<Ctx>({
  config: { preset: "default" },
  setPreset: () => {},
  clearOverride: () => {},
  hasLocalOverride: false,
  presetIds: FRONTEND_IDS,
});

const LOCAL_KEY = "ccd_theme_preset";

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  // Always start with the default preset on both server and client to avoid
  // hydration mismatch. localStorage is read in useEffect (client-only).
  const [config, setConfig] = useState<ThemeConfig>({ preset: DEFAULT_THEME.id });
  const [hasLocalOverride, setHasLocalOverride] = useState(false);
  const cmsConfigRef = useRef<ThemeConfig | null>(null);
  // Track whether the initial localStorage read has been applied so the
  // config-change effect doesn't fire a redundant applyTheme on first mount.
  const skipFirstApply = useRef(true);

  // On mount: read localStorage and apply the correct theme immediately —
  // single call, no flash from default → stored.
  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_KEY);
    if (stored && THEME_PRESETS[stored]) {
      setConfig({ preset: stored });
      setHasLocalOverride(true);
      applyTheme({ preset: stored });
    } else {
      applyTheme({ preset: DEFAULT_THEME.id });
    }
    skipFirstApply.current = false;
  }, []);

  // Apply theme on every subsequent config change (ThemeSwitcher, Shift+T, CMS)
  useEffect(() => {
    if (skipFirstApply.current) return;
    applyTheme(config);
  }, [config]);

  // Fetch CMS theme on mount and subscribe to realtime changes
  useEffect(() => {
    const loadCms = async () => {
      try {
        const { data } = await supabase
          .from("site_settings")
          .select("theme")
          .eq("id", "main")
          .maybeSingle();
        const t = (data?.theme ?? null) as ThemeConfig | null;
        if (t && t.preset && THEME_PRESETS[t.preset]) {
          cmsConfigRef.current = t;
          // Only auto-apply if the user has not picked their own preset
          if (!localStorage.getItem(LOCAL_KEY)) setConfig(t);
        }
      } catch {
        // site_settings table may not exist — silently use defaults
      }
    };
    loadCms();

    // Realtime subscription — only created when Supabase is fully configured.
    // Without this guard the SDK opens a WebSocket to the placeholder URL and
    // retries the failed connection on a loop, spamming the console with errors.
    // The try/catch alone is not enough because WebSocket errors are async.
    let channel: any;
    if (isSupabaseConfigured) {
      try {
        channel = supabase
          .channel("site_settings_theme")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "site_settings", filter: "id=eq.main" },
            (payload) => {
              const t = (payload.new as any)?.theme as ThemeConfig | null;
              if (t && t.preset && THEME_PRESETS[t.preset]) {
                cmsConfigRef.current = t;
                if (!localStorage.getItem(LOCAL_KEY)) setConfig(t);
              }
            }
          )
          .subscribe();
      } catch {
        // Realtime not available — theme still works from defaults
      }
    }

    return () => {
      if (channel) {
        try { supabase.removeChannel(channel); } catch {}
      }
    };
  }, []);

  const setPreset = useCallback((preset: string) => {
    if (!THEME_PRESETS[preset]) return;
    setConfig({ preset });
    try {
      localStorage.setItem(LOCAL_KEY, preset);
      setHasLocalOverride(true);
    } catch { /* ignore */ }
  }, []);

  const clearOverride = useCallback(() => {
    try { localStorage.removeItem(LOCAL_KEY); } catch { /* ignore */ }
    setHasLocalOverride(false);
    setConfig(cmsConfigRef.current ?? { preset: DEFAULT_THEME.id });
  }, []);

  // Cycle presets on Shift+T (easter-egg keyboard shortcut)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === "T" || e.key === "t") && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
        const ids = FRONTEND_IDS;
        const currentIdx = ids.indexOf(config.preset);
        const next = ids[(currentIdx + 1) % ids.length] ?? ids[0];
        setPreset(next);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [config.preset, setPreset]);

  return (
    <ThemeCtx.Provider
      value={{ config, setPreset, clearOverride, hasLocalOverride, presetIds: FRONTEND_IDS }}
    >
      {children}
    </ThemeCtx.Provider>
  );
};

export const useTheme = () => useContext(ThemeCtx);
