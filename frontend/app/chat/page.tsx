"use client";

import {Sparkles} from "lucide-react";
import {useMemo} from "react";
import {useLocale} from "next-intl";

import {ChatInterface} from "@/components/chat/chat-interface";
import {DashboardShell} from "@/components/dashboard/dashboard-shell";
import {type DashboardNavItem} from "@/components/dashboard/dashboard-sidebar";
import {getDashboardCopy} from "@/lib/dashboard-copy";
import type {AppLocale} from "@/i18n/routing";

export default function ChatPage() {
	const locale = useLocale() as AppLocale;
	const copy = getDashboardCopy(locale).chatPage;
	const navItems = useMemo<DashboardNavItem[]>(() => {
		return [];
	}, []);

	return (
		<DashboardShell
			navItems={navItems}
			activeSection="chat"
			topBarLead={
				<div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
					<Sparkles className="h-3.5 w-3.5" />
					{copy.lead}
				</div>
			}
			contentClassName="overflow-hidden"
		>
			<section className="min-h-0 flex-1 overflow-hidden rounded-[1.75rem] border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
				<ChatInterface />
			</section>
		</DashboardShell>
	);
}
