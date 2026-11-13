import { ICON_PATHS } from "./icon-paths";

export function Icon({ name, size, filled, className }: { name: string; size?: "sm"; filled?: boolean; className?: string }) {
  return (
    <svg
      className={["ico", size === "sm" ? "sm" : "", filled ? "filled" : "", className ?? ""].join(" ")}
      viewBox="0 0 24 24"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] ?? "" }}
    />
  );
}
