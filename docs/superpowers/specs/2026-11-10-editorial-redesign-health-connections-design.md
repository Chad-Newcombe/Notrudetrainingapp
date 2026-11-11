# Editorial Redesign and Health Connections Design

## Intent

Replace the soft purple, 3D-character aesthetic with a sharper athletic editorial identity inspired by WHITESPACE's disciplined black/white structure, oversized condensed typography, full-bleed energy, and signal-orange accents. Controls must feel tactile, not flat. Health connections must stop simulating success and clearly distinguish a working integration from platform or partner requirements.

## Visual direction

- Palette: Snow `#f4f2eb`, Paper `#ffffff`, Ink `#111111`, Signal orange `#f15a24`, Slate `#6c737c`, Track `#d9d6cd`.
- Type: Barlow Condensed for display and navigation; Figtree for body copy.
- Coach identity: four transparent, two-dimensional editorial screen-print portraits. No WebGL, 3D model, loading spinner, or drag interaction.
- Layout: strong left alignment, oversized headlines, compact utility labels, black rules, and high-contrast sections. The Today/Coach hero is the memorable element; surrounding content remains restrained.
- Depth: primary and secondary controls use visible borders, offset hard shadows, and pressed states that move toward their shadow. Panels use lighter offset depth only when they represent an actionable object.
- Mobile: preserve the 430px app shell and safe-area behavior; minimum 44px touch targets; respect reduced motion.

## Health connection behavior

- Strava: real signed-in OAuth 2.0 authorization, server-side token storage, refresh, recent-activity sync, and revocation/disconnect. Credentials come from `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET`; missing configuration produces an honest unavailable state.
- Apple Health: disabled in the web app with a clear explanation that HealthKit requires a native iOS bridge.
- Garmin: disabled until Garmin Connect Developer Program access and credentials are available; do not simulate connection.
- Guest users: prompted to sign in before connecting Strava because OAuth tokens must be tied to an account.
- No raw access or refresh token is sent to the browser or stored in client IndexedDB.

## Non-goals

- Copying WHITESPACE's logo, commerce navigation, product photography, or exact layout.
- Building a native iOS wrapper in this change.
- Claiming Garmin access without program approval.
- Importing historical Apple Health exports.

## Sources

- Visual inspiration: https://whitespacesnow.com/
- Strava OAuth: https://developers.strava.com/docs/authentication/
- Apple HealthKit: https://developer.apple.com/documentation/healthkit
- Garmin Connect Developer Program: https://developer.garmin.com/gc-developer-program/
