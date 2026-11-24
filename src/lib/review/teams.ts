import teamsData from "@/lib/review/teams.json";

export type ReviewTeamId = (typeof teamsData.teams)[number]["id"];

export type ReviewTeam = {
  id: ReviewTeamId;
  label: string;
};

/** 所感の場面語彙ヒント用。メンバーマスタには持たない（その日の下書きだけ）。 */
export const REVIEW_TEAMS: readonly ReviewTeam[] = teamsData.teams;

const TEAM_BY_ID = new Map(
  REVIEW_TEAMS.map((team) => [team.id, team] as const),
);

export function isReviewTeamId(value: string): value is ReviewTeamId {
  return TEAM_BY_ID.has(value as ReviewTeamId);
}

export function reviewTeamLabel(teamId: string | undefined | null): string {
  const id = teamId?.trim() ?? "";
  if (!id) return "";
  return TEAM_BY_ID.get(id as ReviewTeamId)?.label ?? "";
}

/** Select の「未選択」値（空文字は Radix Select で使えない） */
export const REVIEW_TEAM_NONE_VALUE = "__none__";
