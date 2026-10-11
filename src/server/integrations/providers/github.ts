/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { IntegrationProvider, MailMessage, ProviderTask, TaskList } from "../provider";
import { envPair, getJson, tokenRequest } from "../oauth-util";

const SCOPES = ["read:user", "notifications", "repo"];
const env = envPair("GITHUB");

/** API URLs (api.github.com/repos/o/r/pulls/1) -> the page a person would open. */
function toWebUrl(apiUrl: string | undefined, repo: string): string {
  if (!apiUrl) return `https://github.com/${repo}`;
  return apiUrl.replace("https://api.github.com/repos/", "https://github.com/").replace("/pulls/", "/pull/").replace(/\/commits\//, "/commit/");
}

/** GitHub notifications (review requests, mentions, assigned issues, CI) become messages, so they flow into priorities. */
export const githubProvider: IntegrationProvider = {
  id: "github",
  label: "GitHub",
  capabilities: ["issues", "messages", "search"],
  isConfigured: env.isConfigured,
  missingSetup: env.missing,
  tokenConnect: {
    label: "GitHub personal access token",
    placeholder: "ghp_... or github_pat_...",
    helpUrl: "https://github.com/settings/tokens/new?scopes=notifications,read:user,repo&description=STACK",
    steps: [
      "Open the link below. GitHub pre-selects the read permissions STACK needs (notifications, read:user, repo).",
      "Set an expiration you're comfortable with and click Generate token.",
      "Copy the token (it's only shown once) and paste it here.",
    ],
    async validate(token) {
      const me = await getJson("GitHub token check", "https://api.github.com/user", { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } });
      return { account: me.login };
    },
  },

  getAuthUrl(state, redirectUri) {
    env.require("GitHub");
    const url = new URL("https://github.com/login/oauth/authorize");
    url.searchParams.set("client_id", env.id());
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", SCOPES.join(" "));
    url.searchParams.set("state", state);
    return url.toString();
  },

  async exchangeCode(code, redirectUri) {
    env.require("GitHub");
    return tokenRequest(
      "GitHub",
      "https://github.com/login/oauth/access_token",
      { body: new URLSearchParams({ client_id: env.id(), client_secret: env.secret(), code, redirect_uri: redirectUri }).toString() },
      { scopes: SCOPES },
    );
  },

  async getTasks(tokens): Promise<TaskList> {
    const headers = { Authorization: `Bearer ${tokens.accessToken}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
    const [assigned, reviews] = await Promise.all([
      // Open issues and pull requests assigned to you, across every repository you can see.
      getJson("GitHub assigned issues", "https://api.github.com/issues?filter=assigned&state=open&per_page=100&sort=updated", { headers }) as Promise<Record<string, any>[]>,
      // Pull requests where you were asked directly for a review.
      getJson("GitHub review requests", `https://api.github.com/search/issues?q=${encodeURIComponent("is:open is:pr user-review-requested:@me")}&per_page=50&sort=updated`, { headers }),
    ]);
    const toTask = (i: Record<string, any>, status: string): ProviderTask => {
      const repo = i.repository?.full_name ?? String(i.repository_url ?? "").split("/repos/")[1] ?? "GitHub";
      return {
        id: `${status === "Review requested" ? "review" : "assigned"}:${i.id}`,
        title: `${repo}#${i.number}: ${i.title}`,
        status,
        isDone: false,
        container: repo,
        permalink: i.html_url,
        updatedAt: i.updated_at,
      };
    };
    const reviewItems = (reviews.items ?? []) as Record<string, any>[];
    return {
      tasks: [...assigned.map((i) => toTask(i, i.pull_request ? "Pull request assigned" : "Issue assigned")), ...reviewItems.map((i) => toTask(i, "Review requested"))],
      complete: assigned.length < 100 && !reviews.incomplete_results && (reviews.total_count ?? 0) <= reviewItems.length,
    };
  },

  async getMessages(tokens): Promise<MailMessage[]> {
    const data = await getJson("GitHub notifications", "https://api.github.com/notifications?all=true&per_page=40", {
      headers: { Authorization: `Bearer ${tokens.accessToken}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    });
    return (data as Record<string, any>[]).map((n) => {
      const repo = n.repository?.full_name ?? "GitHub";
      return {
        id: String(n.id),
        subject: n.subject?.title ?? "(notification)",
        from: repo,
        snippet: `${String(n.reason ?? "").replace(/_/g, " ")} - ${n.subject?.type ?? "activity"} in ${repo}`,
        receivedAt: n.updated_at,
        isUnread: !!n.unread,
        permalink: toWebUrl(n.subject?.url, repo),
      } satisfies MailMessage;
    });
  },
};
