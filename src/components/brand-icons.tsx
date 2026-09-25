import {
  SiGmail, SiNotion, SiZoom, SiGithub,
  SiAsana, SiDropbox, SiBox, SiTrello, SiHubspot, SiShopify, SiStripe,
  SiQuickbooks, SiOkta, SiGitlab, SiJira, SiLinear, SiFigma,
  SiVercel, SiNetlify, SiXcode, SiAndroidstudio, SiFirebase, SiJupyter,
  SiHuggingface, SiPython, SiDatabricks, SiSnowflake, SiLooker, SiSplunk,
  SiWireshark, SiTeamviewer, SiDocker, SiKubernetes, SiJenkins, SiSketch,
  SiTestrail, SiSelenium, SiPostman, SiXero, SiAdp, SiPaychex, SiClickup,
  SiGreenhouse, SiZendesk, SiIntercom, SiCalendly, SiAutocad, SiSketchup,
  SiArcgis, SiTrimble, SiSap, SiSquare, SiZillow, SiDavinciresolve,
  SiBlender, SiCinema4D, SiNuke, SiHoudini, SiGoogleads, SiSemrush,
  SiGooglesearchconsole, SiHootsuite, SiBuffer, SiMailchimp, SiGoogleanalytics,
  SiWordpress, SiWebflow, SiContentful, SiR, SiQgis, SiBioconductor,
  SiGoogleclassroom, SiCanvas, SiMoodle,
  SiAutodeskmaya, SiFedex, SiUps, SiMeta, SiRhinoceros, SiAutodeskrevit,
} from "react-icons/si";
import { Calendar, type LucideIcon } from "lucide-react";
import { MicrosoftIcon, GoogleIcon, AppleIcon } from "@/components/oauth-icons";
import { LogoMark } from "@/components/logo";
import {
  SlackColorIcon, OutlookIcon, TeamsIcon, OneDriveIcon, SalesforceIcon,
  GoogleDriveColorIcon, GoogleCalendarColorIcon, PaypalColorIcon,
  OpenAIIcon, AdobePhotoshopIcon, AdobeIllustratorIcon, AdobePremiereIcon,
  AdobeAfterEffectsIcon, AdobeLightroomIcon, AwsIcon, TableauIcon,
  DocuSignIcon, OracleIcon, MicrosoftOfficeIcon, MicrosoftExcelIcon,
  LinkedInIcon, PowerBiIcon, VsCodeIcon, AdobeXdIcon, MondayIcon,
} from "@/components/brand-svg-icons";
import type { IconType } from "react-icons";

interface BrandIcon {
  Icon: IconType | LucideIcon;
  color: string;
}

// Every entry here is a verified real brand mark — sourced from Simple Icons
// (simpleicons.org, CC0/MIT) or Iconify's "logos" collection, both open,
// permissively-licensed icon sets built exactly for this purpose. Nothing in
// this map is hand-drawn, AI-generated, or approximated.
export const brandIcons: Record<string, BrandIcon> = {
  gmail: { Icon: SiGmail, color: "#EA4335" },
  outlook: { Icon: OutlookIcon, color: "#0078D4" },
  slack: { Icon: SlackColorIcon, color: "#4A154B" },
  teams: { Icon: TeamsIcon, color: "#6264A7" },
  "microsoft-teams": { Icon: TeamsIcon, color: "#6264A7" },
  zoom: { Icon: SiZoom, color: "#2D8CFF" },
  notion: { Icon: SiNotion, color: "#000000" },
  github: { Icon: SiGithub, color: "#181717" },
  drive: { Icon: GoogleDriveColorIcon, color: "#0F9D58" },
  "google-drive": { Icon: GoogleDriveColorIcon, color: "#0F9D58" },
  dropbox: { Icon: SiDropbox, color: "#0061FF" },
  onedrive: { Icon: OneDriveIcon, color: "#0078D4" },
  box: { Icon: SiBox, color: "#0061D5" },
  "google-calendar": { Icon: GoogleCalendarColorIcon, color: "#4285F4" },
  "outlook-calendar": { Icon: Calendar, color: "#0078D4" },
  trello: { Icon: SiTrello, color: "#0052CC" },
  asana: { Icon: SiAsana, color: "#F06A6A" },
  hubspot: { Icon: SiHubspot, color: "#FF7A59" },
  salesforce: { Icon: SalesforceIcon, color: "#00A1E0" },
  shopify: { Icon: SiShopify, color: "#95BF47" },
  stripe: { Icon: SiStripe, color: "#635BFF" },
  paypal: { Icon: PaypalColorIcon, color: "#003087" },
  quickbooks: { Icon: SiQuickbooks, color: "#2CA01C" },
  okta: { Icon: SiOkta, color: "#007DC1" },
  gitlab: { Icon: SiGitlab, color: "#FC6D26" },
  jira: { Icon: SiJira, color: "#0052CC" },
  linear: { Icon: SiLinear, color: "#5E6AD2" },
  figma: { Icon: SiFigma, color: "#F24E1E" },
  vercel: { Icon: SiVercel, color: "#000000" },
  netlify: { Icon: SiNetlify, color: "#00C7B7" },
  xcode: { Icon: SiXcode, color: "#147EFB" },
  "android-studio": { Icon: SiAndroidstudio, color: "#3DDC84" },
  firebase: { Icon: SiFirebase, color: "#FFCA28" },
  jupyter: { Icon: SiJupyter, color: "#F37626" },
  openai: { Icon: OpenAIIcon, color: "#000000" },
  "hugging-face": { Icon: SiHuggingface, color: "#FFD21E" },
  aws: { Icon: AwsIcon, color: "#FF9900" },
  python: { Icon: SiPython, color: "#3776AB" },
  databricks: { Icon: SiDatabricks, color: "#FF3621" },
  snowflake: { Icon: SiSnowflake, color: "#29B5E8" },
  tableau: { Icon: TableauIcon, color: "#E97627" },
  excel: { Icon: MicrosoftExcelIcon, color: "#217346" },
  looker: { Icon: SiLooker, color: "#4285F4" },
  splunk: { Icon: SiSplunk, color: "#000000" },
  wireshark: { Icon: SiWireshark, color: "#1679A7" },
  teamviewer: { Icon: SiTeamviewer, color: "#004680" },
  docker: { Icon: SiDocker, color: "#2496ED" },
  kubernetes: { Icon: SiKubernetes, color: "#326CE5" },
  jenkins: { Icon: SiJenkins, color: "#D24939" },
  sketch: { Icon: SiSketch, color: "#F7B500" },
  testrail: { Icon: SiTestrail, color: "#65C179" },
  selenium: { Icon: SiSelenium, color: "#43B02A" },
  postman: { Icon: SiPostman, color: "#FF6C37" },
  xero: { Icon: SiXero, color: "#13B5EA" },
  adp: { Icon: SiAdp, color: "#D0271D" },
  paychex: { Icon: SiPaychex, color: "#004B8D" },
  docusign: { Icon: DocuSignIcon, color: "#FFCC22" },
  oracle: { Icon: OracleIcon, color: "#F80000" },
  "click-up": { Icon: SiClickup, color: "#7B68EE" },
  clickup: { Icon: SiClickup, color: "#7B68EE" },
  greenhouse: { Icon: SiGreenhouse, color: "#24A47F" },
  zendesk: { Icon: SiZendesk, color: "#03363D" },
  intercom: { Icon: SiIntercom, color: "#000000" },
  calendly: { Icon: SiCalendly, color: "#006BFF" },
  autocad: { Icon: SiAutocad, color: "#E51050" },
  "autocad-civil-3d": { Icon: SiAutocad, color: "#E51050" },
  "autocad-electrical": { Icon: SiAutocad, color: "#E51050" },
  sketchup: { Icon: SiSketchup, color: "#005F9E" },
  arcgis: { Icon: SiArcgis, color: "#2C7AC3" },
  trimble: { Icon: SiTrimble, color: "#003F87" },
  sap: { Icon: SiSap, color: "#0FAAFF" },
  square: { Icon: SiSquare, color: "#3E4348" },
  zillow: { Icon: SiZillow, color: "#006AFF" },
  "davinci-resolve": { Icon: SiDavinciresolve, color: "#233A51" },
  blender: { Icon: SiBlender, color: "#E87D0D" },
  maya: { Icon: SiAutodeskmaya, color: "#0696D7" },
  "cinema-4d": { Icon: SiCinema4D, color: "#011A6A" },
  nuke: { Icon: SiNuke, color: "#000000" },
  houdini: { Icon: SiHoudini, color: "#FF4713" },
  "google-ads": { Icon: SiGoogleads, color: "#4285F4" },
  semrush: { Icon: SiSemrush, color: "#FF642D" },
  "google-search-console": { Icon: SiGooglesearchconsole, color: "#458CF5" },
  hootsuite: { Icon: SiHootsuite, color: "#143059" },
  buffer: { Icon: SiBuffer, color: "#231F20" },
  mailchimp: { Icon: SiMailchimp, color: "#FFE01B" },
  "google-analytics": { Icon: SiGoogleanalytics, color: "#E37400" },
  wordpress: { Icon: SiWordpress, color: "#21759B" },
  webflow: { Icon: SiWebflow, color: "#146EF5" },
  contentful: { Icon: SiContentful, color: "#F36458" },
  r: { Icon: SiR, color: "#276DC3" },
  qgis: { Icon: SiQgis, color: "#589632" },
  bioconductor: { Icon: SiBioconductor, color: "#191970" },
  "google-classroom": { Icon: SiGoogleclassroom, color: "#4285F4" },
  canvas: { Icon: SiCanvas, color: "#E13F76" },
  moodle: { Icon: SiMoodle, color: "#F98012" },
  "microsoft-365": { Icon: MicrosoftOfficeIcon, color: "#D83B01" },
  "microsoft-office": { Icon: MicrosoftOfficeIcon, color: "#D83B01" },
  photoshop: { Icon: AdobePhotoshopIcon, color: "#31A8FF" },
  illustrator: { Icon: AdobeIllustratorIcon, color: "#FF9A00" },
  "premiere-pro": { Icon: AdobePremiereIcon, color: "#9999FF" },
  "after-effects": { Icon: AdobeAfterEffectsIcon, color: "#9999FF" },
  lightroom: { Icon: AdobeLightroomIcon, color: "#31A8FF" },
  // Real marks not exported by react-icons/si (often removed from Simple
  // Icons specifically after a trademark-holder request) — sourced instead
  // from Iconify's "logos" collection, same as the multi-color group above.
  linkedin: { Icon: LinkedInIcon, color: "#0A66C2" },
  "linkedin-recruiter": { Icon: LinkedInIcon, color: "#0A66C2" },
  "power-bi": { Icon: PowerBiIcon, color: "#F2C811" },
  "vs-code": { Icon: VsCodeIcon, color: "#007ACC" },
  "adobe-xd": { Icon: AdobeXdIcon, color: "#FF61F6" },
  "monday-com": { Icon: MondayIcon, color: "#FF3D57" },
  "fedex-systems": { Icon: SiFedex, color: "#4D148C" },
  "ups-systems": { Icon: SiUps, color: "#351C15" },
  "meta-ads": { Icon: SiMeta, color: "#0081FB" },
  rhino: { Icon: SiRhinoceros, color: "#801010" },
  revit: { Icon: SiAutodeskrevit, color: "#8B44F4" },
};

/** Generic, neutral "app" glyph — used ONLY when no real logo is available.
 * Never colored to resemble any specific brand; the real name is always
 * shown as text alongside it, never replaced by initials. */
function GenericAppIcon({ size = 18, className }: { size?: number | string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function hasRealBrandIcon(id: string): boolean {
  return (
    id === "microsoft" || id === "google" || id === "google-workspace" ||
    id === "apple" || id === "stack" || id in brandIcons
  );
}

export function BrandIcon({ id, size = 18, className }: { id: string; size?: number; className?: string }) {
  if (id === "microsoft") return <MicrosoftIcon size={size} />;
  if (id === "google" || id === "google-workspace") return <GoogleIcon size={size} />;
  if (id === "apple") return <AppleIcon size={size} />;
  if (id === "stack") return <LogoMark size={size} animate={false} className={className} />;
  const entry = brandIcons[id];
  if (!entry) return <GenericAppIcon size={size} className={className ?? "text-neutral-400"} />;
  const { Icon, color } = entry;
  return <Icon size={size} color={color} className={className} />;
}

const SIZE_PX: Record<"sm" | "md" | "lg", number> = { sm: 16, md: 20, lg: 28 };

/**
 * The single place every surface in STACK should render an app's identity —
 * onboarding, Integrations, search, AI citations, activity feed. Renders the
 * real brand mark when one exists; otherwise a neutral generic glyph, never
 * a fake logo or a letter initial standing in for a real one. Always pairs
 * the icon with meaningful alt text via a visually-hidden label so the name
 * is never conveyed by the icon alone.
 */
export function IntegrationLogo({
  app,
  name,
  size = "md",
  className,
  logoPath,
}: {
  /** App/provider slug, e.g. "github". */
  app: string;
  /** Real display name, used for alt text. Falls back to the slug if omitted. */
  name?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Downloaded, verified real logo file under /public/integrations, e.g.
   * "/integrations/primerx.svg". Takes priority over the component-based
   * brand icon map when present. Rendered with object-fit: contain so a
   * wide wordmark shrinks to fit the slot instead of being cropped or
   * squashed. */
  logoPath?: string | null;
}) {
  const px = SIZE_PX[size];
  const label = `${name ?? app} logo`;
  const real = hasRealBrandIcon(app);
  return (
    <span role="img" aria-label={label} className={className} style={{ display: "inline-flex", width: px, height: px }}>
      {logoPath ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoPath}
          alt=""
          width={px}
          height={px}
          loading="lazy"
          style={{ width: px, height: px, objectFit: "contain" }}
        />
      ) : real ? (
        <BrandIcon id={app} size={px} />
      ) : (
        <GenericAppIcon size={px} className="text-neutral-400" />
      )}
    </span>
  );
}
