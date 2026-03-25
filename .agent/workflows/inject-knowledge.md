---
description: Inject knowledge (metrics/facts) into the Boardroom and Pulse systems in a single pass.
---

1.  **Extract Knowledge**: Convert raw input data (TikTok/IG metrics, strategy changes, hard facts) into JSON payloads.
2.  **Locate Target Key**: 
    -   Quantitative analytics → `pulse_state_factory` or `pulse_state_kirbai`
    -   Strategic/Narrative facts → `heart_scale_db`
3.  **Direct Injection**: 
    -   Use `curl` with credentials from `.env.local` to `POST` to the Supabase REST endpoint.
    -   Use `Prefer: resolution=merge-duplicates` for upsert.
4.  **No-Approval Policy**: Execute this as an automated operation without pausing for formal implementation plans or manual approval, provided the data matches the user's intent.
