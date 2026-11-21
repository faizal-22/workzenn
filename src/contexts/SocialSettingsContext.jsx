import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { defaultSocialSettings } from "../lib/socialSettings.js";
import { supabase } from "../lib/supabase.js";

const SocialSettingsContext = createContext(null);
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/+$/, "");
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export function SocialSettingsProvider({ children }) {
  const [settings, setSettings] = useState(defaultSocialSettings);
  const [loadError, setLoadError] = useState("");

  const loadSettings = useCallback(async () => {
    if (!supabaseConfigured) return;

    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/social_media_settings?select=business_email&id=eq.1`,
        {
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Social settings request failed (${response.status}).`);
      }

      const [data] = await response.json();
      if (data) {
        setSettings({
          ...defaultSocialSettings,
          ...data,
        });
        setLoadError("");
      }
    } catch (error) {
      console.error("Could not load public social settings:", error);
      setLoadError("Social links could not be refreshed. Please try again later.");
    }
  }, []);

  useEffect(() => {
    if (!supabaseConfigured) return undefined;

    loadSettings();
    const refreshOnFocus = () => {
      if (document.visibilityState === "visible") loadSettings();
    };
    document.addEventListener("visibilitychange", refreshOnFocus);
    return () => document.removeEventListener("visibilitychange", refreshOnFocus);
  }, [loadSettings]);

  const saveSettings = useCallback(async (nextSettings) => {
    if (!supabaseConfigured) {
      throw new Error("Supabase is not configured. Add the project URL and public anon key.");
    }

    if (!supabase) {
      throw new Error("Supabase could not be initialized. Check the project URL and public anon key.");
    }

    const { data, error } = await supabase
      .from("social_media_settings")
      .update(nextSettings)
      .eq("id", 1)
      .select("business_email")
      .single();

    if (error) throw error;

    setSettings({
      ...defaultSocialSettings,
      ...data,
    });
    setLoadError("");
    return data;
  }, []);

  const value = useMemo(
    () => ({ settings, loadError, loadSettings, saveSettings }),
    [settings, loadError, loadSettings, saveSettings],
  );

  return (
    <SocialSettingsContext.Provider value={value}>
      {children}
    </SocialSettingsContext.Provider>
  );
}

export function useSocialSettings() {
  const context = useContext(SocialSettingsContext);
  if (!context) {
    throw new Error("useSocialSettings must be used inside SocialSettingsProvider.");
  }
  return context;
}
