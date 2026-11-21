import { SocialLogin } from "@capgo/capacitor-social-login";
import { GOOGLE_IOS_CLIENT_ID } from "@/lib/account/providers";

let ready: Promise<void> | null = null;

/**
 * Google refuses sign-in inside an app's web view, so the iOS app signs in natively and hands the
 * provider's ID token to better-auth, which verifies it against the provider before making a session.
 */
export async function nativeSignInBody(provider: "google" | "apple") {
  ready ??= SocialLogin.initialize({
    google: { iOSClientId: GOOGLE_IOS_CLIENT_ID },
    apple: { redirectUrl: "" },
  }).catch((error) => { ready = null; throw error; });
  await ready;

  const nonce = crypto.randomUUID();
  if (provider === "google") {
    const { result } = await SocialLogin.login({ provider: "google", options: { scopes: ["email", "profile"], nonce } });
    const idToken = "idToken" in result ? result.idToken : null;
    if (!idToken) throw new Error("Google didn’t return a sign-in token.");
    return { provider, idToken: { token: idToken, nonce } };
  }

  const { result } = await SocialLogin.login({ provider: "apple", options: { scopes: ["name", "email"], nonce } });
  if (!result.idToken) throw new Error("Apple didn’t return a sign-in token.");
  const { givenName, familyName, email } = result.profile;
  return {
    provider,
    // Apple sends the name only on the first sign-in, so pass it along for the new account.
    idToken: { token: result.idToken, nonce, user: { name: { firstName: givenName ?? undefined, lastName: familyName ?? undefined }, email: email ?? undefined } },
  };
}
