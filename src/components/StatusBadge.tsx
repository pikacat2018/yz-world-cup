import type { Status } from "../data/mockWorldCup";

const labels: Record<Status, string> = {
  qualified: "已出线",
  fighting: "争二",
  possible: "理论可能",
  eliminated: "已出局",
  pending: "未开赛",
};

type StatusBadgeProps = {
  status: Status;
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  return <span className={`status-badge status-${status}`}>{labels[status]}</span>;
}
