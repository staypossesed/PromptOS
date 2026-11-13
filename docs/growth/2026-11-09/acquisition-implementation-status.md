# Controlled acquisition identifier — November 12

The analytics wrapper recognizes exactly the reviewed Reddit source/medium/campaign/content tuple and emits `acquisition_id=reddit_first_task_alpha`. All other campaign strings remain uncollected. The fixed value and capture timestamp stay in tab-local session storage for up to 24 hours. It is not cross-device attribution; blocked storage can lose attribution after navigation. An explicit reset clears it. No arbitrary campaign string, full URL, prompt content, token or email is added.

## Validation

All 283 local regression tests and project-wide TypeScript validation passed before commit preparation. The isolated release also passed the 23 targeted analytics/auth/funnel checks and TypeScript validation. Synthetic visit → task → generation → copy → usefulness checks preserve the fixed identifier and generated-result IDs. `task_started` still has no task_id in StartExperience; the earliest funnel stages remain person-level.

## Production release

Reconstructed the prior production deployment `dpl_DYPCTqaXJxANPRVuTyL19CUi64PB` and verified all 328 source-file hashes. Added only the analytics patch, its test and `public/first-task-demo.html`. This avoids deploying unrelated local extension edits or rolling back production autocomplete.

Vercel built and promoted `dpl_3fPf2YNzcZYuAJWERpLrFzd2po23` successfully; `https://www.umprompt.com` resolves to this release. The previous release remains available for rollback.

PostHog project 421262 received tagged `site_visited` and `task_started` events at 20:26 UTC, plus a fresh-tab tagged visit at 20:28 UTC. This was internal founder QA and must not count as recruitment, customers or useful results. The diagnostic deliberately included test accounts. Complete production generation/copy/usefulness delivery was not exercised by this release check; its propagation is covered locally, not claimed as end-to-end live proof.

## Demonstration

`https://www.umprompt.com/first-task-demo.html` is published. Desktop and 390px mobile layouts, both embedded images and the task CTA were visually checked through the browser. The page discloses the internal founder test and the edit that removed an invented explanation; it is neither a customer testimonial nor an unedited-output claim.

The earlier temporary local-server preview timed out and was stopped. The successful verification used Vercel; no local-server availability claim is made.
