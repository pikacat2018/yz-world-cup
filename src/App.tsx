import { useEffect, useMemo, useState } from "react";
import AllGroupsOverview from "./components/AllGroupsOverview";
import AllSchedulePage from "./components/AllSchedulePage";
import Layout from "./components/Layout";
import { groups } from "./data/mockWorldCup";

export default function App() {
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

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? groups[0],
    [selectedGroupId],
  );

  return (
    <Layout
      selectedGroup={selectedGroup}
      selectedGroupId={selectedGroupId}
      onSelectGroup={setSelectedGroupId}
    />
  );
}
