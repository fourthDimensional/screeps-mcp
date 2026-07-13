# Agent harness playbook

1. Call `get_policy`, `list_branches`, `get_empire_snapshot`, and `get_telemetry`. Fetch the intended branch explicitly (`default` for the main world); do not infer a globally active branch. Treat absent telemetry as reduced insight, not failure.
2. Retrieve every module with `get_code_modules`, make a complete manifest, then call `validate_modules`.
3. Use `deploy_and_verify` on the intended branch. It records the manifest hash and baseline but never activates a branch implicitly.
4. Call `record_snapshot` over several ticks, then `compare_deployments` and `evaluate_health`. An `inconclusive` verdict asks for more observations; it is not a healthy result.
5. If a regression is supported by evidence, call `rollback_deployment`. Production policy still requires explicit approval for activation.

Example request: “Inspect the active branch and empire snapshot. Change all modules needed to reduce spawn-idle time, validate the complete manifest, deploy it to `staging`, observe five ticks, compare it with its recorded baseline, and recommend retain or rollback with evidence.”
