# Screeps agent workflows

Keep this file with the bot source it describes. It assumes an agent has access
to a configured `screeps-mcp` server; it does not depend on any other file in
the MCP server repository.

## Before starting

- Configure the MCP server with Screeps credentials, the intended default
  branch and shard, and `SCREEPS_SOURCE_ROOT` set to this bot's source root.
- Keep the bot entry point at `main.js`, or pass `entryModule` explicitly.
  JavaScript files under the selected source directory become Screeps modules
  relative to that directory (`roles/harvester.js` becomes `roles/harvester`).
- Use an explicit branch in every deployment request. Activation is separate
  and may require approval under the server policy.

## Deploying a modular bot

1. Inspect deliberately: call `get_policy`, `list_branches`,
   `get_empire_snapshot`, and `get_telemetry`. Name the branch explicitly;
   do not infer an active branch.
2. Change the bot locally, then run `validate_files` with `sourcePath: "."`
   (or the bot's source subdirectory). This builds the complete module
   manifest without placing a network write.
3. Run `deploy_files_and_verify` with the same `sourcePath`, intended branch,
   and a bounded `verificationTicks` window. It reads the files locally, then
   validates, uploads, reads the remote branch back, records the deployment,
   and observes distinct Screeps ticks. Source text stays local instead of
   being copied into a large MCP request.
4. Check `remoteVerification` and `observation` in the result before trusting
   the health verdict. A matching remote source hash proves the branch
   contains the manifest that was validated; an `inconclusive` result means
   the evidence window was not sufficient.
5. Use `get_deployment`, `get_metrics`, `compare_deployments`,
   `get_empire_snapshot`, and bot telemetry to diagnose outcomes. Roll back
   only when the recorded evidence supports it and policy permits activation.

`deploy_and_verify` remains available when a caller already has a complete
manifest. Use the file-native tool for normal local bot work.

## Lessons from the example session

- Do not use the legacy single-file `upload_code` wrapper for a bot that uses
  `require` across modules. It uploads only `main`, so an acknowledgement is
  not proof that the complete bot is runnable.
- Do not infer deployment success from an HTTP acknowledgement or a console
  message. Confirm the remote manifest hash, then use tick-correlated snapshots
  and telemetry.
- Keep strategic readiness in the bot's own state and telemetry. For example,
  a claimer cannot spawn before the room has enough energy capacity; a target
  selection is not evidence that an assault can launch.
- Treat missing telemetry as reduced visibility, not a bot failure. Treat an
  `inconclusive` health verdict the same way: collect more evidence instead of
  calling it healthy.
- Prefer a bounded observation window over repeated, unstructured console
  polling. WebSocket console cursors can attribute errors to the period after
  a deployment; HTTP-only console history cannot, so that limitation is
  reported explicitly.

## Tool assumptions

This workflow uses these MCP tools: `get_policy`, `list_branches`,
`get_empire_snapshot`, `get_telemetry`, `validate_files`,
`deploy_files_and_verify`, `get_deployment`, `get_metrics`,
`compare_deployments`, and `rollback_deployment`. If a configured server does
not provide telemetry or WebSocket console logs, continue with the available
snapshot evidence and regard health results as lower-confidence when indicated.
