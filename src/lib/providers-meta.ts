/** Friendly names for provider ids shown in "STACK used" and elsewhere. */
export const PROVIDER_LABEL: Record<string, string> = {
  google: "Google (Gmail, Calendar, Drive)",
  microsoft: "Microsoft (Outlook, Calendar, OneDrive)",
  slack: "Slack",
  notion: "Notion",
  github: "GitHub",
  zoom: "Zoom",
  dropbox: "Dropbox",
  box: "Box",
  airtable: "Airtable",
  smartsheet: "Smartsheet",
  typeform: "Typeform",
  zotero: "Zotero",
  confluence: "Confluence",
  qualtrics: "Qualtrics",
  wordpress: "WordPress",
};

export function providerLabel(id: string) {
  return PROVIDER_LABEL[id] ?? id;
}
