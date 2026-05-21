export type AppTheme = "light-blue" | "dark-editorial";

type ThemeToggleProps = {
  onThemeChange: (theme: AppTheme) => void;
  theme: AppTheme;
};

export const THEME_STORAGE_KEY = "yz-world-cup-theme";

export function isAppTheme(value: string | null): value is AppTheme {
  return value === "light-blue" || value === "dark-editorial";
}

export default function ThemeToggle({ onThemeChange, theme }: ThemeToggleProps) {
  const isLight = theme === "light-blue";
  const nextTheme = isLight ? "dark-editorial" : "light-blue";

  return (
    <button
      aria-label={`切换到${isLight ? "暗" : "浅"}主题`}
      aria-pressed={!isLight}
      className="theme-toggle"
      onClick={() => onThemeChange(nextTheme)}
      title={`切换到${isLight ? "暗" : "浅"}主题`}
      type="button"
    >
      <span>{isLight ? "暗" : "浅"}</span>
    </button>
  );
}
