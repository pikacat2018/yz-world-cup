import { useEffect, useState } from "react";
import AllGroupsOverview from "./components/AllGroupsOverview";
import AllSchedulePage from "./components/AllSchedulePage";
import EditorAccessGate from "./components/EditorAccessGate";
import Layout from "./components/Layout";
import { type AppTheme, isAppTheme, THEME_STORAGE_KEY } from "./components/ThemeToggle";
import { groups } from "./data/mockWorldCup";
import { useSingleActiveTab } from "./shared/singleActiveTab";

function PassiveWorkspaceNotice({ onRetry, status }: { onRetry: () => void; status: "checking" | "passive" }) {
  return (
    <main className="editor-access-page">
      <section className="editor-access-panel passive-workspace-panel" aria-live="polite">
        <span className="eyebrow">EDITOR ACCESS</span>
        <h1>工作台已在另一个标签页打开</h1>
        <p>{status === "checking" ? "正在检测活动标签页。" : "此页面已暂停同步、新闻刷新和编辑入口，避免重复消耗请求。"}</p>
        <button onClick={onRetry} type="button">
          刷新检测/尝试接管
        </button>
      </section>
    </main>
  );
}

function EditorWorkspace({ onThemeChange, theme }: { onThemeChange: (theme: AppTheme) => void; theme: AppTheme }) {
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
    <EditorAccessGate>
      <Layout
        onThemeChange={onThemeChange}
        selectedGroupId={selectedGroupId}
        theme={theme}
        onSelectGroup={setSelectedGroupId}
      />
    </EditorAccessGate>
  );
}

function LockedEditorApp() {
  const [theme, setTheme] = useState<AppTheme>(() => {
    if (typeof window === "undefined") return "dark-editorial";

    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isAppTheme(savedTheme) ? savedTheme : "dark-editorial";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const activeTab = useSingleActiveTab();
  if (activeTab.status !== "active") {
    return <PassiveWorkspaceNotice onRetry={activeTab.tryTakeover} status={activeTab.status} />;
  }

  return <EditorWorkspace onThemeChange={setTheme} theme={theme} />;
}

export default function App() {
  const routePath = typeof window === "undefined" ? "/" : window.location.pathname;

  if (routePath === "/all-groups") {
    return <AllGroupsOverview />;
  }

  if (routePath === "/schedule") {
    return <AllSchedulePage />;
  }

  return <LockedEditorApp />;
}
