import * as cdk from "aws-cdk-lib/core";
import { Template } from "aws-cdk-lib/assertions";
import { RegionRouterEdgeStack } from "../lib/edge-stack";
import { parseOrigins } from "../lib/config";
import { CA, EU, ORIGINS } from "./helpers";

describe("region router: the us-east-1 edge stack", () => {
  it("refuses any region but us-east-1", () => {
    const app = new cdk.App();
    expect(
      () => new RegionRouterEdgeStack(app, "X", { env: { account: "123456789012", region: EU }, origins: ORIGINS, home: EU })
    ).toThrow(/us-east-1/);
  });

  it("synthesizes one function, a version, an edgelambda-trusted role and the version output", () => {
    const app = new cdk.App();
    const s = new RegionRouterEdgeStack(app, "Y", { env: { account: "123456789012", region: "us-east-1" }, origins: ORIGINS, home: CA });
    const t = Template.fromStack(s);
    t.resourceCountIs("AWS::Lambda::Function", 1);
    t.resourceCountIs("AWS::Lambda::Version", 1);
    expect(JSON.stringify(t.findResources("AWS::IAM::Role"))).toContain("edgelambda.amazonaws.com");
    expect(Object.keys(t.findOutputs("*"))).toContain("EdgeVersionArn");
  });
});

describe("region router: parseOrigins (regionRouterOrigins)", () => {
  it("keeps the order given: the first pair is home", () => {
    const o = parseOrigins(" eu-west-1:APP-EU.dilaya.eu , ca-central-1:app-ca.dilaya.eu ", []);
    expect(o).toEqual(ORIGINS);
    expect(Object.keys(o)[0]).toBe(EU);
  });

  it.each([
    ["", /no origin given/],
    ["eu-west-1=app-eu.dilaya.eu", /is not <region>:<host>/],
    [":app-eu.dilaya.eu", /is not <region>:<host>/],
    ["EU:app-eu.dilaya.eu", /is not <region>:<host>/],
    ["eu-west-1:localhost", /is not <region>:<host>/],
    ["eu-west-1:a.dilaya.eu,eu-west-1:b.dilaya.eu", /listed twice/],
  ])("refuses %j", (raw, err) => {
    expect(() => parseOrigins(raw, [])).toThrow(err);
  });

  it("refuses a public name as an origin", () => {
    expect(() => parseOrigins("eu-west-1:app.dilaya.eu", ["app.dilaya.eu"])).toThrow(/PUBLIC name/);
  });
});
