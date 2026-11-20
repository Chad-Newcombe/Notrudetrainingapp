import type { CapacitorConfig } from "@capacitor/cli";
import { KeyboardResize } from "@capacitor/keyboard";

// The app needs its Next.js server (coach, plan, sign-in), so the iOS shell loads the hosted app.
// NOTRUDE_APP_URL is read when you run `npx cap sync ios`: your deployed https address for TestFlight,
// or http://<this Mac's LAN address>:3100 to try a dev server on a phone on your own network.
const url = process.env.NOTRUDE_APP_URL?.trim();

const config: CapacitorConfig = {
  appId: "com.notrude.training",
  appName: "Not Rude Training",
  // Bundled fallback, shown only when no server address was set at sync time.
  webDir: "native/www",
  server: url ? { url, cleartext: url.startsWith("http://") } : undefined,
  ios: { contentInset: "never", backgroundColor: "#050506" },
  plugins: {
    // The launch image stays up until the web loader, which draws the same orb, has painted and hides it.
    // The cap only matters if the page never loads, so the user isn't stuck on the launch image.
    // Shrink the app above the keyboard rather than letting iOS slide the whole page up and off screen.
    Keyboard: { resize: KeyboardResize.Native, resizeOnFullScreen: true },
    SplashScreen: { launchAutoHide: true, launchShowDuration: 8000, launchFadeOutDuration: 150, backgroundColor: "#050506", showSpinner: false },
  },
};

export default config;
