import type { IntegrationProvider } from "./provider";
import { googleProvider } from "./providers/google";
import { microsoftProvider } from "./providers/microsoft";
import { slackProvider } from "./providers/slack";
import { notionProvider } from "./providers/notion";
import { githubProvider } from "./providers/github";
import { zoomProvider } from "./providers/zoom";
import { dropboxProvider } from "./providers/dropbox";
import { boxProvider } from "./providers/box";
import { gitlabProvider } from "./providers/gitlab";
import { jiraProvider } from "./providers/jira";
import { linearProvider } from "./providers/linear";
import { asanaProvider } from "./providers/asana";
import { hubspotProvider } from "./providers/hubspot";
import { salesforceProvider } from "./providers/salesforce";
import { figmaProvider } from "./providers/figma";
import { trelloProvider } from "./providers/trello";
import { quickbooksProvider } from "./providers/quickbooks";
import { shopifyProvider } from "./providers/shopify";
import { stripeProvider } from "./providers/stripe";
import { clickupProvider } from "./providers/clickup";
import { mondayProvider } from "./providers/monday";
import { calendlyProvider } from "./providers/calendly";
import { zendeskProvider } from "./providers/zendesk";
import { canvasProvider } from "./providers/canvas";
import { intercomProvider } from "./providers/intercom";
import { vercelProvider } from "./providers/vercel";
import { netlifyProvider } from "./providers/netlify";
import { mailchimpProvider } from "./providers/mailchimp";
import { greenhouseProvider } from "./providers/greenhouse";
import { leverProvider } from "./providers/lever";
import { gorgiasProvider } from "./providers/gorgias";
import { shipstationProvider } from "./providers/shipstation";
import { bamboohrProvider } from "./providers/bamboohr";
import { shippoProvider } from "./providers/shippo";
import { cin7Provider } from "./providers/cin7";
import { benchlingProvider } from "./providers/benchling";
import { servicenowProvider } from "./providers/servicenow";

export const integrationRegistry: Record<string, IntegrationProvider> = {
  google: googleProvider,
  microsoft: microsoftProvider,
  slack: slackProvider,
  notion: notionProvider,
  github: githubProvider,
  zoom: zoomProvider,
  dropbox: dropboxProvider,
  box: boxProvider,
  gitlab: gitlabProvider,
  jira: jiraProvider,
  linear: linearProvider,
  asana: asanaProvider,
  hubspot: hubspotProvider,
  salesforce: salesforceProvider,
  figma: figmaProvider,
  trello: trelloProvider,
  quickbooks: quickbooksProvider,
  shopify: shopifyProvider,
  stripe: stripeProvider,
  clickup: clickupProvider,
  monday: mondayProvider,
  calendly: calendlyProvider,
  zendesk: zendeskProvider,
  canvas: canvasProvider,
  intercom: intercomProvider,
  vercel: vercelProvider,
  netlify: netlifyProvider,
  mailchimp: mailchimpProvider,
  greenhouse: greenhouseProvider,
  lever: leverProvider,
  gorgias: gorgiasProvider,
  shipstation: shipstationProvider,
  bamboohr: bamboohrProvider,
  shippo: shippoProvider,
  cin7: cin7Provider,
  benchling: benchlingProvider,
  servicenow: servicenowProvider,
};

export function getProvider(id: string): IntegrationProvider | undefined {
  return integrationRegistry[id];
}

export function listProviders(): IntegrationProvider[] {
  return Object.values(integrationRegistry);
}