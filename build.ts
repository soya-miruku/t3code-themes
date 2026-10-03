import { mkdirSync, writeFileSync } from "node:fs";
import { wcagContrast } from "culori";

import {
  createVividThemeColors,
  parseThemeFile,
  serializeThemeFile,
  themeColorToHex,
  THEME_COLOR_ROLES,
  updateThemeColorFamily,
  type ThemeAppearance,
  type ThemeColorRole,
  type ThemeColors,
  type ThemeDefinition,
} from "./vendor/themePalette.ts";

/**
 * Hermes Desktop skins expressed as T3 theme roles. Source of truth is
 * apps/shared/src/theme-presets.ts in NousResearch/hermes-agent (`nous`,
 * `nous-alt`, each with `colors` = light and `darkColors` = dark). Anything a
 * skin does not define (toolbar controls, scrollbars, warning, sidebar control
 * surface, ...) keeps the contrast-solved value createVividThemeColors derives
 * from the seeds.
 *
 * Usage: bun run build.ts [theme-id ...]   (default: every theme below)
 * Writes themes/<id>.json after round-tripping it through T3's own parser.
 */
type Role = ThemeColorRole;
type Spec = {
  canvas: string;
  accent: string;
  /** Plain role -> hex overrides, applied over the generated base. */
  set: Partial<Record<Role, string>>;
  /** Representative roles pushed through the editor's own family logic. */
  families: ReadonlyArray<readonly [Role, string]>;
  /** Final overrides, for roles a family call would otherwise recompute. */
  after: Partial<Record<Role, string>>;
};
type ThemeSpec = {
  id: string;
  label: string;
  light: Spec;
  dark: Spec;
};

const group = (value: string, roles: ReadonlyArray<Role>): Partial<Record<Role, string>> =>
  Object.fromEntries(roles.map((role) => [role, value]));

const rgbOf = (hex: string) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
const hexOf = (channels: ReadonlyArray<number>) =>
  `#${channels.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
/** `amount` of `top` laid over `base`, in sRGB: the same blend as CSS color-mix(in srgb). */
const blend = (base: string, top: string, amount: number) =>
  hexOf(rgbOf(base).map((v, i) => v * (1 - amount) + rgbOf(top)[i]! * amount));

// ---------------------------------------------------------------------------
// Nous: GitHub Light/Dark Default chrome with a Nous-blue accent.

const NOUS: ThemeSpec = {
  id: "nous",
  label: "Nous",
  light: {
    canvas: "#ffffff",
    accent: "#0053fd",
    set: {
      ...group("#ffffff", ["canvas", "chrome", "toolbar", "surface", "surfaceOverlay"]),
      surfaceRaised: "#f6f8fa",
      ...group("#1f2328", [
        "text",
        "toolbarForeground",
        "toolbarControlForeground",
        "secondaryForeground",
        "accentSurfaceForeground",
        "messageForeground",
        "codeForeground",
        "sidebarForeground",
        "terminalForeground",
      ]),
      ...group("#656d76", [
        "textMuted",
        "mutedForeground",
        "placeholder",
        "secondaryLabel",
        "iconMuted",
        "sidebarMutedForeground",
      ]),
      ...group("#d0d7de", ["border", "toolbarBorder", "sidebarBorder"]),
      ...group("#0053fd", ["accent", "focus", "update", "messageAction", "terminalCursor"]),
      secondary: "#deeaff",
      muted: "#f6f6f6",
      accentSurface: "#e3edff",
      messageSurface: "#dae7fd",
      codeBackground: "#f6f8fa",
      sidebar: "#f6f8fa",
      terminalBackground: "#ffffff",
    },
    families: [
      ["messageAction", "#0053fd"],
      ["error", "#cf222e"],
      ["sidebarRowSelected", "#e3edff"],
    ],
    after: {
      ...group("#ffffff", ["accentForeground", "messageActionForeground"]),
      terminalForeground: "#1f2328",
    },
  },
  dark: {
    canvas: "#0d1117",
    accent: "#4a84fe",
    set: {
      ...group("#0d1117", ["canvas", "chrome", "toolbar", "surface", "terminalBackground"]),
      ...group("#161b22", ["surfaceRaised", "surfaceOverlay", "codeBackground"]),
      ...group("#e6edf3", [
        "text",
        "toolbarForeground",
        "toolbarControlForeground",
        "secondaryForeground",
        "accentSurfaceForeground",
        "messageForeground",
        "codeForeground",
        "sidebarForeground",
        "terminalForeground",
      ]),
      ...group("#7d8590", [
        "textMuted",
        "mutedForeground",
        "placeholder",
        "secondaryLabel",
        "iconMuted",
        "sidebarMutedForeground",
      ]),
      ...group("#30363d", ["border", "toolbarBorder", "sidebarBorder"]),
      ...group("#4a84fe", ["accent", "focus", "update", "messageAction", "terminalCursor"]),
      secondary: "#1d2e4f",
      muted: "#1a1e24",
      accentSurface: "#17243a",
      messageSurface: "#07162c",
      sidebar: "#010409",
    },
    families: [
      ["messageAction", "#4a84fe"],
      ["error", "#f85149"],
      ["sidebarRowSelected", "#17243a"],
    ],
    after: {
      ...group("#161616", ["accentForeground", "messageActionForeground"]),
      terminalForeground: "#e6edf3",
      // Hermes pairs #7d8590 with #1a1e24 at 4.49:1, a hair under AA; lifted
      // just enough to clear it. The other muted roles keep Hermes's value.
      mutedForeground: "#808993",
    },
  },
};

// ---------------------------------------------------------------------------
// Nous Alt: the hand-authored Nous. Light is glass neutrals with brand blue;
// dark is cream on mission-blue (the all-blue Hermes Desktop look).

const ALT_BLUE = "#0053fd";
const ALT_NAVY = "#1540b1";
const ALT_CREAM = "#ffe6cb";
/** Hermes `nousAltTint(pct)`: brand blue at pct% over white. */
const altTint = (pct: number) => blend("#ffffff", ALT_BLUE, pct / 100);
/** Hermes `nousAltTintTransparent(pct)` flattened over the surface it sits on. */
const altOver = (pct: number, backdrop: string) => blend(backdrop, ALT_BLUE, pct / 100);

const NOUS_ALT: ThemeSpec = {
  id: "nous-alt",
  label: "Nous Alt",
  light: {
    canvas: "#f8faff",
    accent: ALT_BLUE,
    set: {
      ...group("#f8faff", ["canvas", "chrome", "toolbar", "terminalBackground"]),
      ...group("#ffffff", ["surface", "surfaceRaised", "surfaceOverlay"]),
      ...group("#17171a", [
        "text",
        "toolbarForeground",
        "toolbarControlForeground",
        "messageForeground",
        "codeForeground",
        "sidebarForeground",
        "terminalForeground",
      ]),
      ...group("#666678", [
        "textMuted",
        "mutedForeground",
        "placeholder",
        "secondaryLabel",
        "iconMuted",
        "sidebarMutedForeground",
      ]),
      ...group(altOver(22, "#f8faff"), ["border", "toolbarBorder"]),
      sidebarBorder: altOver(18, "#f3f7ff"),
      input: altOver(30, "#f8faff"),
      ...group(ALT_BLUE, ["accent", "focus", "update", "messageAction", "terminalCursor"]),
      secondary: altTint(7),
      secondaryForeground: "#242432",
      muted: altTint(5),
      accentSurface: altTint(10),
      accentSurfaceForeground: "#202030",
      messageSurface: altTint(6),
      codeBackground: altTint(5),
      sidebar: "#f3f7ff",
    },
    families: [
      ["messageAction", ALT_BLUE],
      ["error", "#c72e4d"],
      ["sidebarRowSelected", altTint(10)],
    ],
    after: {
      ...group("#fcfcfc", ["accentForeground", "messageActionForeground"]),
    },
  },
  dark: {
    // The blue seed, not the cream primary: the generator tints every role it
    // derives toward the accent hue, and a cream seed would turn the unspecified
    // chrome (toolbar controls, scrollbars, sidebar rows) yellow on a blue canvas.
    canvas: "#0d2f86",
    accent: ALT_BLUE,
    set: {
      ...group("#0d2f86", ["canvas", "chrome", "toolbar", "terminalBackground"]),
      surface: "#12378f",
      surfaceRaised: "#183f9a",
      surfaceOverlay: "#123a96",
      ...group(ALT_CREAM, [
        "text",
        "toolbarForeground",
        "toolbarControlForeground",
        "messageForeground",
        "codeForeground",
        "sidebarForeground",
        "terminalForeground",
      ]),
      ...group("#b5c7f3", [
        "textMuted",
        "mutedForeground",
        "placeholder",
        "secondaryLabel",
        "iconMuted",
        "sidebarMutedForeground",
      ]),
      ...group("#3158ad", ["border", "toolbarBorder"]),
      sidebarBorder: "#234a9c",
      input: "#0b2566",
      // Cream is the primary in dark: send button, focus ring, cursor.
      ...group(ALT_CREAM, ["accent", "focus", "update", "messageAction", "terminalCursor"]),
      secondary: "#1b45a4",
      secondaryForeground: "#e0e8ff",
      muted: "#183f9a",
      accentSurface: ALT_NAVY,
      accentSurfaceForeground: "#f0f4ff",
      messageSurface: "#143b91",
      codeBackground: "#0b2566",
      sidebar: "#09286f",
    },
    families: [
      ["messageAction", ALT_CREAM],
      ["error", "#c0473a"],
      ["sidebarRowSelected", "#14347f"],
    ],
    after: {
      ...group("#0d2f86", ["accentForeground", "messageActionForeground"]),
    },
  },
};

const THEMES: ReadonlyArray<ThemeSpec> = [NOUS, NOUS_ALT];

function buildColors(spec: Spec, appearance: ThemeAppearance): ThemeColors {
  let colors: ThemeColors = { ...createVividThemeColors(appearance, spec.canvas, spec.accent) };
  colors = { ...colors, ...spec.set } as ThemeColors;
  for (const [role, value] of spec.families) {
    colors = updateThemeColorFamily(appearance, colors, role, value);
  }
  return { ...colors, ...spec.after } as ThemeColors;
}

// Foreground/background pairs that carry text, with the WCAG floor each should clear.
const PAIRS: ReadonlyArray<readonly [Role, Role, number]> = [
  ["text", "canvas", 7],
  ["text", "surface", 4.5],
  ["text", "surfaceRaised", 4.5],
  ["textMuted", "canvas", 4.5],
  ["mutedForeground", "muted", 4.5],
  ["placeholder", "surfaceRaised", 4.5],
  ["accentForeground", "accent", 4.5],
  ["messageActionForeground", "messageAction", 4.5],
  ["secondaryForeground", "secondary", 4.5],
  ["accentSurfaceForeground", "accentSurface", 4.5],
  ["messageForeground", "messageSurface", 4.5],
  ["sidebarForeground", "sidebar", 4.5],
  ["sidebarMutedForeground", "sidebar", 4.5],
  ["codeForeground", "codeBackground", 4.5],
  ["errorForeground", "errorSurface", 4.5],
  ["warningForeground", "warningSurface", 4.5],
  ["updateForeground", "updateSurface", 4.5],
  ["toolbarForeground", "toolbar", 4.5],
  ["terminalForeground", "terminalBackground", 4.5],
];
const hex = (value: string) => themeColorToHex(value) ?? value;

function run(spec: ThemeSpec): boolean {
  const theme: ThemeDefinition = {
    id: spec.id,
    label: spec.label,
    appearance: "light",
    colors: buildColors(spec.light, "light"),
    variants: { dark: buildColors(spec.dark, "dark") },
  };

  // Serialize with the app's own writer, then read it back with the app's own
  // importer parser: the file we ship is exactly what the importer accepts.
  const text = serializeThemeFile(theme);
  const reparsed = parseThemeFile(JSON.parse(text));

  const problems: string[] = [];
  const light = reparsed.colors;
  const dark = reparsed.variants?.dark;
  if (!dark) problems.push("dark variant missing after round-trip");

  const report: string[] = [];
  for (const [label, colors] of [["light", light], ["dark", dark]] as const) {
    if (!colors) continue;
    for (const role of THEME_COLOR_ROLES) {
      if (!colors[role]) problems.push(`${label}: missing role ${role}`);
    }
    if (Object.keys(colors).length !== THEME_COLOR_ROLES.length) {
      problems.push(`${label}: ${Object.keys(colors).length} roles, expected ${THEME_COLOR_ROLES.length}`);
    }
    for (const [fg, bg, floor] of PAIRS) {
      const ratio = wcagContrast(hex(colors[fg]), hex(colors[bg]));
      if (ratio < floor) problems.push(`${label}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1 (< ${floor})`);
      report.push(
        `${ratio >= floor ? "ok " : "LOW"} ${label.padEnd(5)} ${fg.padEnd(24)} on ${bg.padEnd(18)} ${ratio.toFixed(2)}:1`,
      );
    }
  }

  mkdirSync("themes", { recursive: true });
  writeFileSync(`themes/${spec.id}.json`, text);

  console.log(`\n=== ${spec.id} (${spec.label}) ===`);
  console.log(report.join("\n"));
  console.log(`bytes: ${Buffer.byteLength(text)}  roles/appearance: ${THEME_COLOR_ROLES.length}`);
  console.log(problems.length === 0 ? "VALID: round-trips through parseThemeFile" : `PROBLEMS:\n${problems.join("\n")}`);
  return problems.length === 0;
}

const wanted = process.argv.slice(2);
const selected = wanted.length === 0 ? THEMES : THEMES.filter((theme) => wanted.includes(theme.id));
if (selected.length === 0) {
  console.error(`No such theme. Known: ${THEMES.map((theme) => theme.id).join(", ")}`);
  process.exit(2);
}
const results = selected.map(run);
process.exit(results.every(Boolean) ? 0 : 1);
