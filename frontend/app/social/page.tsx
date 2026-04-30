import { MessagesSquare } from "lucide-react";
import { cookies } from "next/headers";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { type DashboardNavItem } from "@/components/dashboard/dashboard-sidebar";
import { SocialHub } from "@/components/profile/social-hub";
import { routing, type AppLocale } from "@/i18n/routing";

function getLeadLabel(locale: AppLocale) {
  switch (locale) {
    case "ar":
      return "التواصل";
    case "hi":
      return "सोशल";
    case "zh":
      return "社交";
    case "es":
      return "Social";
    default:
      return "Social";
  }
}

export default async function SocialPage() {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  const locale = routing.locales.includes(cookieLocale as AppLocale)
    ? (cookieLocale as AppLocale)
    : routing.defaultLocale;
  const navItems: DashboardNavItem[] = [];

  return (
    <DashboardShell
      navItems={navItems}
      activeSection="social"
      localeOverride={locale}
      topBarLead={
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
          <MessagesSquare className="h-3.5 w-3.5" />
          {getLeadLabel(locale)}
        </div>
      }
      contentClassName="overflow-auto"
    >
      <SocialHub locale={locale} />
    </DashboardShell>
  );
}
