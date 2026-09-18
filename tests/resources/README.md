# Captured payloads

Real TVmaze payloads captured once and reused by schema, service and store specs, so every layer
is tested against the same wire shape. Never hand-write a fixture; capture it with `curl` and note
the endpoint and date in the file name, e.g. `shows-page-0.2026-09-16.json`.
