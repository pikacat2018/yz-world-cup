import type { Group } from "../data/mockWorldCup";
import MatchImpact from "./MatchImpact";

type GroupDetailProps = {
  group: Group;
};

export default function GroupDetail({ group }: GroupDetailProps) {
  return (
    <main className="panel group-detail">
      <section className="detail-section schedule-detail-section">
        <MatchImpact matches={group.matches} />
      </section>
    </main>
  );
}
