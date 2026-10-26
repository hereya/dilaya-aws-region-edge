# dilaya/aws-region-edge

Hereya CDK package (`dilaya/aws-region-edge`) holding the **region router's Lambda@Edge**
(origin-request) — Région Canada, task `t_rca_p1_router`.

Lambda@Edge must live in **us-east-1**, while the connector deploy package
(`dilaya/aws-mcp-connector-lambda`) deploys a single stack in its pod's region. So the edge
function lives here, in a stack of its own, **always deployed to us-east-1** (`env.region` is
pinned, whatever the executor's region; the account comes from `CDK_DEFAULT_ACCOUNT`). us-east-1
must be CDK-bootstrapped.

## What it does

The handler acts only on requests the region router's viewer function marked
`x-dilaya-route: body` (a bearer whose orgs sit in different regions). It reads
`params.arguments.org` from the JSON-RPC body (bounded read) and, when that org is one of the
bearer's non-home orgs listed in `x-dilaya-org-regions`, points the request at that region's
origin. Anything else goes to the home region. The origins are baked into the inline code at synth
(Lambda@Edge has no environment variables).

## Parameter

| name | mandatory | example |
| --- | --- | --- |
| `regionRouterOrigins` | yes | `eu-west-1:app-eu.dilaya.eu,ca-central-1:app-ca.dilaya.eu` |

Comma-separated `<region>:<origin host>` pairs (`:` because hereya cuts a `-p` at every `=`).
The **first** pair is the home region. Each host is a pod's own origin host, never a public name.

## Output

| name | meaning |
| --- | --- |
| `EdgeVersionArn` | the published (numbered) Lambda version ARN — feed it to the deploy package as `regionRouterEdgeVersionArn` |

## Develop

```sh
npm ci
npm run typecheck && npm test
regionRouterOrigins=eu-west-1:app-eu.dilaya.eu,ca-central-1:app-ca.dilaya.eu STACK_NAME=test npx cdk synth
```

Publish = a GitHub release `v<version>` (tag must equal `hereyarc.yaml`'s version); publishing
deploys nothing.
