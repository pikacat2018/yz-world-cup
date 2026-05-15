import { getTeam } from "../data/mockWorldCup";
import TeamFlag from "./TeamFlag";

type TeamNameProps = {
  fallback?: string;
  teamId?: string;
};

export default function TeamName({ fallback = "待定", teamId }: TeamNameProps) {
  if (!teamId) return <>{fallback}</>;

  const team = getTeam(teamId);

  return (
    <>
      <TeamFlag teamId={teamId} />
      <span className="team-name-text">{team.name}</span>
    </>
  );
}
