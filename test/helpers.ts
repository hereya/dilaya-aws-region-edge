import * as cdk from "aws-cdk-lib/core";
import { Template } from "aws-cdk-lib/assertions";
import { RegionRouterEdgeStack } from "../lib/edge-stack";

// The Lambda@Edge is RUN here, not grepped: it is lifted out of a synthesized template (the bytes
// CloudFormation would ship) and handed real-shaped events. A routing typo is a customer's call
// answered by the wrong pod. Ported from dilaya/aws-mcp-connector-lambda test/region-router/helpers.ts.

export const EU = "eu-west-1";
export const CA = "ca-central-1";
export const ORIGINS = { [EU]: "app-eu.dilaya.eu", [CA]: "app-ca.dilaya.eu" };
export const SECRET = "s3cr3t-region-router-0123456789abcdef";

export const ORG_EU = "88120129-295f-476c-b1e1-382ecbc7381a";
export const ORG_CA = "4b0e7f0c-1d2e-4f3a-9b8c-7d6e5f4a3b2c";
export const ORG_CA2 = "0c9b8a7f-6e5d-4c3b-2a19-08f7e6d5c4b3";

export function edgeCode(): string {
  const app = new cdk.App();
  const stack = new RegionRouterEdgeStack(app, "RegionRouterEdge", {
    env: { account: "123456789012", region: "us-east-1" },
    origins: ORIGINS,
    home: EU,
  });
  const fns = Object.values(Template.fromStack(stack).findResources("AWS::Lambda::Function")) as any[];
  expect(fns).toHaveLength(1);
  return fns[0].Properties.Code.ZipFile;
}

/** The shipped Lambda@Edge module, evaluated as Node would (CommonJS). */
export function makeEdge(code: string): (e: any) => Promise<any> {
  const mod = { exports: {} as any };
  new Function("module", "exports", "require", "Buffer", code)(mod, mod.exports, require, Buffer);
  return mod.exports.handler;
}

/** An origin-request event as CloudFront builds it, after the viewer function ran. */
export function edgeEvent(opts: {
  route: string;
  regions?: string;
  body?: string | null;
  truncated?: boolean;
  encoding?: "base64" | "text";
}) {
  const headers: Record<string, { key: string; value: string }[]> = {
    host: [{ key: "Host", value: ORIGINS[EU] }],
    "x-dilaya-route": [{ key: "x-dilaya-route", value: opts.route }],
  };
  if (opts.regions !== undefined) headers["x-dilaya-org-regions"] = [{ key: "x-dilaya-org-regions", value: opts.regions }];
  const encoding = opts.encoding ?? "base64";
  const data = opts.body == null ? "" : encoding === "base64" ? Buffer.from(opts.body).toString("base64") : opts.body;
  const request = {
    method: "POST",
    uri: "/mcp",
    querystring: "",
    headers,
    origin: {
      custom: {
        domainName: ORIGINS[EU],
        port: 443,
        protocol: "https",
        path: "",
        customHeaders: { "x-dilaya-region-verify": [{ key: "x-dilaya-region-verify", value: SECRET }] },
      },
    },
    body: { action: "read-only", inputTruncated: Boolean(opts.truncated), encoding, data },
  };
  return { Records: [{ cf: { config: { eventType: "origin-request" }, request } }] };
}

export const toolCall = (org?: string, id = 1) => ({
  jsonrpc: "2.0",
  id,
  method: "tools/call",
  params: { name: "query", arguments: { ...(org ? { org } : {}), app: "crm", sql: "select 1" } },
});
