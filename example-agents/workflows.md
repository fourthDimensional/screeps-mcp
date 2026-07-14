# Screeps agent workflows

This guide accompanies the captured long-running agent session in this directory.
It turns its deployment and diagnosis lessons into a bounded, evidence-driven
workflow.

## Deploying a modular bot

1. Inspect deliberately: call `get_policy`, `list_branches`,
   `get_empire_snapshot`, and `get_telemetry`. Name the branch explicitly;
   do not infer an active branch.
2. Change the bot in its local source directory, then run `validate_files` on
   that directory. This builds the complete module manifest without placing a
   network write.
3. Run `deploy_files_and_verify` with the same directory, intended branch,
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

For the full closed-loop safety model, see the [agent playbook](../docs/agent-playbook.md),
[API reference](../docs/reference/api.md), and
[telemetry contract](../docs/reference/telemetry-contract.md).
