import { useRouter } from "next/router";
import Head from "next/head";
import DoorGate from "@/components/door/DoorGate";
import DoorApp from "@/components/door/DoorApp";

export default function DoorNightPage() {
  const { query, isReady } = useRouter();
  const slug = typeof query.slug === "string" ? query.slug : "";
  return (
    <>
      <Head>
        <title>Door | Cats Can Dance</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="theme-color" content="#0a0a0a" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>
      {isReady && slug ? <DoorGate next={`/door/${slug}`}><DoorApp slug={slug} /></DoorGate> : <div className="min-h-[100dvh] bg-ink" />}
    </>
  );
}
