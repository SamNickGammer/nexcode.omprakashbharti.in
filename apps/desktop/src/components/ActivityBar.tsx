// Far-left activity bar — switches the sidebar between the file explorer and
// source control (the VSCode pattern). More views (search, run, extensions)
// slot in here over time.

export type SidebarView = "explorer" | "git";

const ITEMS: { view: SidebarView; icon: string; label: string }[] = [
  { view: "explorer", icon: "🗂", label: "Explorer" },
  { view: "git", icon: "⎇", label: "Source Control" },
];

export function ActivityBar({
  view,
  onChange,
}: {
  view: SidebarView;
  onChange: (view: SidebarView) => void;
}) {
  return (
    <nav className="activity-bar">
      {ITEMS.map((item) => (
        <button
          key={item.view}
          className={`activity-item${view === item.view ? " is-active" : ""}`}
          onClick={() => onChange(item.view)}
          title={item.label}
          aria-label={item.label}
          aria-pressed={view === item.view}
        >
          {item.icon}
        </button>
      ))}
    </nav>
  );
}
