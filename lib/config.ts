/**
 * The region router's shared constants and the `regionRouterOrigins` parser — ported verbatim from
 * dilaya/aws-mcp-connector-lambda (lib/stack/region-router/config.ts), which keeps the pod-side
 * half (CloudFront distribution, viewer function, KVS, pod trust). The two copies MUST agree: the
 * viewer function there sets the headers this package's Lambda@Edge reads.
 *
 *   regionRouterOrigins   "eu-west-1:app-eu.dilaya.eu,ca-central-1:app-ca.dilaya.eu" —
 *                         region:host pairs (":" because hereya cuts a -p at every "="),
 *                         the FIRST one is the home region
 */
export const VIEWER_HOST_HEADER = "x-dilaya-viewer-host";
export const REGION_VERIFY_HEADER = "x-dilaya-region-verify";
export const ROUTE_HEADER = "x-dilaya-route";
export const ORG_REGIONS_HEADER = "x-dilaya-org-regions";

const REGION_RE = /^[a-z]{2}(-[a-z]+)+-\d$/;
const HOST_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

/** "eu-west-1:app-eu.dilaya.eu,…" → { "eu-west-1": "app-eu.dilaya.eu", … }, validated. */
export function parseOrigins(raw: string, publicNames: string[]): Record<string, string> {
  const origins: Record<string, string> = {};
  for (const entry of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
    const i = entry.indexOf(":");
    const region = entry.slice(0, i);
    const host = entry.slice(i + 1).toLowerCase();
    if (i < 1 || !REGION_RE.test(region) || !HOST_RE.test(host)) {
      throw new Error(`regionRouterOrigins: "${entry}" is not <region>:<host>`);
    }
    if (origins[region]) throw new Error(`regionRouterOrigins: region ${region} listed twice`);
    if (publicNames.includes(host)) {
      throw new Error(`regionRouterOrigins: ${host} is a PUBLIC name; an origin must be a pod's own host`);
    }
    origins[region] = host;
  }
  if (Object.keys(origins).length === 0) throw new Error("regionRouterOrigins: no origin given");
  return origins;
}
