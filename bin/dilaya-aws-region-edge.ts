#!/usr/bin/env node
// The region router's Lambda@Edge as a us-east-1 app (lib/edge-stack.ts). Exactly ONE stack:
// hereya's executor runs `cdk deploy` with no selector. The region is PINNED to us-east-1
// (Lambda@Edge lives nowhere else), whatever region the executor runs in.
import * as cdk from "aws-cdk-lib/core";
import { parseOrigins } from "../lib/config";
import { RegionRouterEdgeStack } from "../lib/edge-stack";

const stackName = process.env.STACK_NAME;
if (!stackName) throw new Error("STACK_NAME is required (set by hereya)");
const origins = parseOrigins(process.env.regionRouterOrigins ?? "", []);
const app = new cdk.App();
new RegionRouterEdgeStack(app, stackName, {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: "us-east-1" },
  origins,
  home: Object.keys(origins)[0],
});
