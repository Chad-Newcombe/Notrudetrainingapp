"use client";

import { SplashScreen } from "@capacitor/splash-screen";
import { useEffect, useState } from "react";

/**
 * The app's loading screen: the launch image's orb, drawn at the same size and place, now breathing
 * while the ring of coaches turns. It is in the server HTML, so it paints with the first frame, and it
 * fades out as soon as the app is interactive. Shown only in the installed app (see BOOT_SCRIPT).
 */
export function BootSplash({ orb, ring, cloud }: { orb: string; ring: string; cloud: string }) {
  const [state, setState] = useState<"on" | "done" | "gone">("on");

  useEffect(() => {
    void SplashScreen.hide({ fadeOutDuration: 150 }).catch(() => undefined); // in case the early hide missed
    // Hidden in a browser tab, so there's no fade to wait for.
    if (!document.documentElement.classList.contains("boot-on")) return setState("gone");
    const frame = requestAnimationFrame(() => setState("done"));
    return () => cancelAnimationFrame(frame);
  }, []);

  if (state === "gone") return null;
  return (
    <div className="boot" data-done={state === "done" ? "" : undefined} onTransitionEnd={() => setState("gone")} style={{ backgroundImage: `url(${cloud})` }} aria-hidden="true">
      <div className="boot-mark">
        <div className="boot-ring" dangerouslySetInnerHTML={{ __html: ring }} />
        <div className="boot-orb" dangerouslySetInnerHTML={{ __html: orb }} />
      </div>
    </div>
  );
}

// Runs as the HTML parses, before the first paint: turn the loader on only inside the iOS app or a
// home-screen install, then let the native launch image go, since the loader now shows the same orb.
export const BOOT_SCRIPT = `(function(){var C=window.Capacitor;var app=(C&&C.isNativePlatform&&C.isNativePlatform())||(window.matchMedia&&matchMedia("(display-mode: standalone)").matches)||navigator.standalone===true;if(!app)return;document.documentElement.classList.add("boot-on");try{C&&C.nativePromise&&C.nativePromise("SplashScreen","hide",{fadeOutDuration:150}).catch(function(){})}catch(e){}})();`;
