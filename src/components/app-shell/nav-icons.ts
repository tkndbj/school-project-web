import {
  BookOpenIcon,
  BuildingIcon,
  CalendarCheckIcon,
  CalendarDaysIcon,
  GraduationCapIcon,
  HistoryIcon,
  LayoutDashboardIcon,
  LinkIcon,
  NotebookPenIcon,
  SettingsIcon,
  UserRoundIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

// Navigation items are defined on the server, so icons are referenced by name.
export const navIcons = {
  dashboard: LayoutDashboardIcon,
  schools: BuildingIcon,
  students: GraduationCapIcon,
  teachers: UserRoundIcon,
  guardians: UsersIcon,
  courses: BookOpenIcon,
  attendance: CalendarCheckIcon,
  events: CalendarDaysIcon,
  notes: NotebookPenIcon,
  settings: SettingsIcon,
  audit: HistoryIcon,
  link: LinkIcon,
} satisfies Record<string, LucideIcon>;

export type NavIcon = keyof typeof navIcons;

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  /** Match only the exact path (for index routes such as dashboards). */
  exact?: boolean;
};

export type NavSection = { label?: string; items: NavItem[] };
