import Script from "next/script";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { PIXEL_ID, pageView } from "@/lib/pixel";

/** Loads the Meta pixel only when NEXT_PUBLIC_META_PIXEL_ID is set. Tracks page views on client navigation. */
export default function MetaPixel() {
  const router = useRouter();
  useEffect(() => {
    if (!PIXEL_ID) return;
    router.events.on("routeChangeComplete", pageView);
    return () => router.events.off("routeChangeComplete", pageView);
  }, [router.events]);
  if (!PIXEL_ID) return null;
  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', ${JSON.stringify(PIXEL_ID)});
fbq('track', 'PageView');`}
    </Script>
  );
}
