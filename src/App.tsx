import { useEffect, useState } from "react";
import AllGroupsOverview from "./components/AllGroupsOverview";
import AllSchedulePage from "./components/AllSchedulePage";
import Layout from "./components/Layout";
import { type AppTheme, isAppTheme, THEME_STORAGE_KEY } from "./components/ThemeToggle";
import { groups } from "./data/mockWorldCup";

export default function App() {
  const [theme, setTheme] = useState<AppTheme>(() => {
    if (typeof window === "undefined") return "light-blue";

    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isAppTheme(savedTheme) ? savedTheme : "light-blue";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  if (window.location.pathname === "/all-groups") {
    return <AllGroupsOverview />;
  }

  if (window.location.pathname === "/schedule") {
    return <AllSchedulePage />;
  }

  const [selectedGroupId, setSelectedGroupId] = useState("A");

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "select-group") return;
      if (!groups.some((group) => group.id === event.data.groupId)) return;

      setSelectedGroupId(event.data.groupId);
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <Layout
      onThemeChange={setTheme}
      selectedGroupId={selectedGroupId}
      theme={theme}
      onSelectGroup={setSelectedGroupId}
    />
  );
}
