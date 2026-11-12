"use client";
import { usePathname } from "next/navigation";
import { Tabs } from "@ccd/ui";

const ITEMS = [
  { href: "/me", label: "Today" },
  { href: "/bookings", label: "Bookings" },
  { href: "/me/tour", label: "Tour" },
  { href: "/me/fans", label: "Fans" },
  { href: "/me/contract", label: "Contracts" },
  { href: "/me/page", label: "Your page" },
];

export default function MeTabs() {
  const path = usePathname();
  return <Tabs label="Artist" current={ITEMS.find((i) => i.href === path)?.href ?? "/me"} items={ITEMS} />;
}
