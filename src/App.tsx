import { useEffect, useMemo, useState } from "react";
import AllGroupsOverview from "./components/AllGroupsOverview";
import AllSchedulePage from "./components/AllSchedulePage";
import EditorAccessGate from "./components/EditorAccessGate";
import Layout from "./components/Layout";
import { type AppTheme, isAppTheme, THEME_STORAGE_KEY } from "./components/ThemeToggle";
import { useWorldCupData } from "./matches/worldCupDataStore";
import { useSingleActiveTab } from "./shared/singleActiveTab";

function PassiveWorkspaceNotice({ onRetry, status }: { onRetry: () => void; status: "checking" | "passive" }) {
  return (
    <main className="editor-access-page">
      <section className="editor-access-panel passive-workspace-panel" aria-live="polite">
        <span className="eyebrow">EDITOR ACCESS</span>
        <h1>工作台已在另一个标签页打开</h1>
        <p>{status === "checking" ? "正在检测活动标签页。" : "当前页面已暂停同步、新闻刷新和编辑入口，避免重复消耗请求。"}</p>
        <button onClick={onRetry} type="button">
          刷新检测并尝试接管
        </button>
      </section>
    </main>
  );
}

function getInitialSelectedGroupId(validGroupIds: string[]) {
  if (typeof window === "undefined") return validGroupIds[0] ?? "A";

  const groupId = new URLSearchParams(window.location.search).get("group");
  return groupId && validGroupIds.includes(groupId) ? groupId : (validGroupIds[0] ?? "A");
}

function EditorWorkspace({ onThemeChange, theme }: { onThemeChange: (theme: AppTheme) => void; theme: AppTheme }) {
  const { groups } = useWorldCupData();
  const validGroupIds = useMemo(() => groups.map((group) => group.id), [groups]);
  const [selectedGroupId, setSelectedGroupId] = useState(() => getInitialSelectedGroupId(validGroupIds));

  useEffect(() => {
    if (!validGroupIds.includes(selectedGroupId)) {
      setSelectedGroupId(validGroupIds[0] ?? "A");
    }
  }, [selectedGroupId, validGroupIds]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "select-group") return;
      if (!validGroupIds.includes(event.data.groupId)) return;

      setSelectedGroupId(event.data.groupId);
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [validGroupIds]);

  return (
    <EditorAccessGate>
      <Layout
        onThemeChange={onThemeChange}
        onSelectGroup={setSelectedGroupId}
        selectedGroupId={selectedGroupId}
        theme={theme}
      />
    </EditorAccessGate>
  );
}

function getInitialTheme(): AppTheme {
  if (typeof window === "undefined") return "dark-editorial";

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isAppTheme(savedTheme) ? savedTheme : "dark-editorial";
}

function LockedEditorApp({ onThemeChange, theme }: { onThemeChange: (theme: AppTheme) => void; theme: AppTheme }) {
  const activeTab = useSingleActiveTab();
  if (activeTab.status !== "active") {
    return <PassiveWorkspaceNotice onRetry={activeTab.tryTakeover} status={activeTab.status} />;
  }

  return <EditorWorkspace onThemeChange={onThemeChange} theme={theme} />;
}

export default function App() {
  const routePath = typeof window === "undefined" ? "/" : window.location.pathname;
  const [theme, setTheme] = useState<AppTheme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  if (routePath === "/all-groups") {
    return <AllGroupsOverview />;
  }

  if (routePath === "/schedule") {
    return <AllSchedulePage />;
  }

  return <LockedEditorApp onThemeChange={setTheme} theme={theme} />;
}
