export type StravaActivity = {
  id: number;
  name: string;
  moving_time: number;
  start_date: string;
  type: string;
};

export function stravaAuthorizationUrl({
  clientId,
  redirectUri,
  state,
}: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL("https://www.strava.com/oauth/authorize");
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    approval_prompt: "auto",
    scope: "activity:read_all",
    state,
  }).toString();
  return url.toString();
}

export function summarizeStravaActivities(activities: StravaActivity[]): string {
  if (activities.length === 0) return "Connected · no recent activities found";
  const minutes = Math.round(
    activities.reduce((total, activity) => total + activity.moving_time, 0) / 60,
  );
  return `${activities.length} recent activities · ${minutes} min moving`;
}
