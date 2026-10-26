/**
 * Drops every line that is only a `//` comment — ported from dilaya/aws-mcp-connector-lambda
 * (lib/stack/app-content/router-stop-pages.ts). The inline handler keeps its comments in source
 * and ships without them, to stay under CloudFormation's 4 096-character inline limit.
 */
export function stripCommentLines(code: string): string {
  return code
    .split("\n")
    .filter((line) => !/^\s*\/\//.test(line))
    .join("\n");
}
