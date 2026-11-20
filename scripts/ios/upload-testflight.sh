#!/usr/bin/env bash
# Archive, sign and upload Notrude to TestFlight from CI.
# Signing is automatic: an App Store Connect API key with the Admin role lets
# Xcode create the distribution certificate and profile itself, so no .p12 or
# .mobileprovision has to be exported and stored as a secret.
set -euo pipefail

[[ ${BUILD_NUMBER:-} =~ ^[1-9][0-9]*$ ]] || { echo 'BUILD_NUMBER must be a positive integer.' >&2; exit 1; }
for setting in TEAM_ID API_KEY API_KEY_ID API_ISSUER; do
  [[ -n ${!setting:-} ]] || { echo "Missing the GitHub secret behind $setting. See README, iOS app." >&2; exit 1; }
done
[[ $TEAM_ID =~ ^[A-Z0-9]{10}$ ]] || { echo 'APPLE_TEAM_ID must be the 10-character Team ID.' >&2; exit 1; }
[[ $API_KEY_ID =~ ^[A-Z0-9]+$ ]] || { echo 'ASC_API_KEY_ID must be the key ID shown in App Store Connect.' >&2; exit 1; }

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
key="$work/AuthKey_$API_KEY_ID.p8"
# Accept the .p8 text as Apple issues it, the whole file base64-encoded, or only the
# lines between BEGIN and END; then refuse anything that isn't a readable private key.
body=$(printf '%s' "$API_KEY" | tr -d ' \r\n\t')
(
  umask 077
  if [[ $API_KEY == *'BEGIN PRIVATE KEY'* ]]; then
    printf '%s\n' "$API_KEY" > "$key"
  elif printf '%s' "$body" | base64 -D 2>/dev/null | grep -q 'BEGIN PRIVATE KEY'; then
    printf '%s' "$body" | base64 -D > "$key"
  else
    { echo '-----BEGIN PRIVATE KEY-----'; printf '%s\n' "$body" | fold -w 64; echo '-----END PRIVATE KEY-----'; } > "$key"
  fi
)
openssl pkey -in "$key" -noout 2>/dev/null || { echo 'ASC_API_KEY_P8 is not a readable private key. Paste the full text of the .p8 file.' >&2; exit 1; }
auth=(-allowProvisioningUpdates -authenticationKeyPath "$key" -authenticationKeyID "$API_KEY_ID" -authenticationKeyIssuerID "$API_ISSUER")

xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$work/Notrude.xcarchive" archive \
  DEVELOPMENT_TEAM="$TEAM_ID" CODE_SIGN_STYLE=Automatic CURRENT_PROJECT_VERSION="$BUILD_NUMBER" \
  "${auth[@]}"

cat > "$work/ExportOptions.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>method</key><string>app-store-connect</string>
<key>destination</key><string>upload</string>
<key>signingStyle</key><string>automatic</string>
<key>teamID</key><string>$TEAM_ID</string>
<key>manageAppVersionAndBuildNumber</key><false/>
<key>uploadSymbols</key><true/>
</dict></plist>
PLIST

# destination=upload sends the signed build straight to App Store Connect.
xcodebuild -exportArchive -archivePath "$work/Notrude.xcarchive" \
  -exportPath "$work/export" -exportOptionsPlist "$work/ExportOptions.plist" "${auth[@]}"
echo "Uploaded build $BUILD_NUMBER of com.notrude.training. Apple processes it before it appears in TestFlight."
