"use client";
import "client-only";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@prisma/client";
import type { Icon } from "@phosphor-icons/react";
import {
  AddressBook,
  Bank,
  CaretDoubleLeft,
  CaretDoubleRight,
  Coins,
  Export,
  HandHeart,
  Link as LinkIcon,
  LinkSimple,
  ListBullets,
  SignOut,
  Trash,
  UploadSimple,
  User,
  UserCircle,
  Users,
} from "@phosphor-icons/react/dist/ssr";
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@/client/components/ui";
import { BrandWordmark } from "@/client/components/layout/BrandWordmark";
import { cn } from "@/client/lib/index";
import {
  getVisibleNavSections,
  isNavItemActive,
  type NavIconName,
} from "@/client/components/layout/sidebar-nav";

const NAV_ICONS: Record<NavIconName, Icon> = {
  user: User,
  bank: Bank,
  users: Users,
  "list-bullets": ListBullets,
  trash: Trash,
  "upload-simple": UploadSimple,
  coins: Coins,
  "address-book": AddressBook,
  link: LinkIcon,
  "hand-heart": HandHeart,
  "link-simple": LinkSimple,
  export: Export,
};

type SidebarProps = {
  logoutAction: (formData: FormData) => Promise<void>;
  userRole: UserRole | null;
  userEmail: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

/**
 * 折りたたみ時のみツールチップでラベルを補う（展開時はラベルが見えているので不要）
 */
function CollapsibleTooltip({
  label,
  collapsed,
  children,
}: {
  label: string;
  collapsed: boolean;
  children: React.ReactElement;
}) {
  if (!collapsed) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export default function Sidebar({
  logoutAction,
  userRole,
  userEmail,
  collapsed,
  onToggleCollapsed,
}: SidebarProps) {
  const pathname = usePathname();
  const navSections = getVisibleNavSections(userRole);
  const ToggleIcon = collapsed ? CaretDoubleRight : CaretDoubleLeft;
  const toggleLabel = collapsed ? "サイドバーを開く" : "サイドバーを折りたたむ";

  return (
    <aside
      data-collapsed={collapsed}
      className="sticky top-0 flex h-screen flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar px-3.5 pt-6 pb-5"
    >
      <div
        className={cn(
          "flex items-center gap-2 px-1.5 pb-5",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        {!collapsed && <BrandWordmark />}
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={toggleLabel}
          aria-expanded={!collapsed}
          title={toggleLabel}
          className="inline-flex size-[26px] shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-transparent p-0 text-disabled-foreground transition-colors duration-150 ease-out outline-none hover:bg-secondary hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ToggleIcon size={13} aria-hidden="true" />
        </button>
      </div>

      <nav aria-label="メインナビゲーション" className="flex flex-1 flex-col gap-5">
        {navSections.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <div className="mx-3 mb-1.5 text-[11px] font-semibold tracking-[0.12em] text-subtle-foreground">
                {section.title}
              </div>
            )}
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const ItemIcon = NAV_ICONS[item.icon];
                const active = isNavItemActive(pathname, item.href);
                return (
                  <CollapsibleTooltip key={item.href} label={item.label} collapsed={collapsed}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 whitespace-nowrap rounded-full text-[13px] no-underline outline-none transition-colors duration-150 ease-out hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        collapsed ? "justify-center px-0 py-[9px]" : "px-3.5 py-2",
                        active
                          ? "bg-sidebar-accent font-bold text-sidebar-accent-foreground"
                          : "font-medium text-sidebar-foreground",
                      )}
                    >
                      <ItemIcon size={16} className="shrink-0" aria-hidden="true" />
                      <span className={cn(collapsed && "sr-only")}>{item.label}</span>
                    </Link>
                  </CollapsibleTooltip>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-4 flex flex-col gap-2.5 border-t border-sidebar-border pt-4">
        <div
          className={cn("flex items-center gap-2 px-2.5", collapsed && "justify-center px-0")}
          title={userEmail}
        >
          <UserCircle size={20} className="shrink-0 text-primary-active" aria-hidden="true" />
          <span
            className={cn(
              "truncate font-latin text-xs text-muted-foreground",
              collapsed && "sr-only",
            )}
          >
            {userEmail}
          </span>
        </div>
        <form action={logoutAction}>
          <CollapsibleTooltip label="ログアウト" collapsed={collapsed}>
            <Button
              type="submit"
              variant="secondary"
              className={cn("w-full text-[13px] tracking-[0.06em]", collapsed && "px-0")}
            >
              <SignOut size={16} aria-hidden="true" />
              <span className={cn(collapsed && "sr-only")}>ログアウト</span>
            </Button>
          </CollapsibleTooltip>
        </form>
      </div>
    </aside>
  );
}
