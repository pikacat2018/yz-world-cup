import { getTeam, getTeamFlag, getTeamFlagImageUrl } from "../data/mockWorldCup";

type TeamFlagProps = {
  teamId: string;
};

export default function TeamFlag({ teamId }: TeamFlagProps) {
  const team = getTeam(teamId);
  const emoji = getTeamFlag(teamId);
  const imageUrl = getTeamFlagImageUrl(teamId);

  return (
    <span className="flag" title={`${emoji} ${team.name}`}>
      {imageUrl ? <img alt={`${team.name} 国旗`} src={imageUrl} /> : emoji}
      <span className="copy-emoji" aria-hidden="true">
        {emoji}
      </span>
    </span>
  );
}
