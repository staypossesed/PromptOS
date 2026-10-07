# Answer Outcome Evaluation

Run `npm test` for suggestion ranking, session rotation, context validation, language matching and prompt assembly regressions.

Run `npm run eval:outcomes -- --dry-run` to inspect the six synthetic evaluation tasks without any provider calls.

Run `npm run eval:outcomes -- --limit 2` (or omit the limit for all six) to use the configured provider and model from `.env.local`. This incurs API usage. It sends synthetic tasks only, never account data or saved user prompts.

Each task generates a portable Umprompt request, then answers both the raw and rewritten requests with the same model and token budget. A judge compares actual answers against task-specific criteria in both presentation orders. Disagreement is inconclusive. Truncated answers are excluded from judging.

The JSON output includes the rewritten prompt, both answers, judge reasons and consistency. Review it for intent changes, invented facts, unmet constraints and unnecessary length. A prompt-quality score is not an answer-quality measurement.

The builder also records optional `answer_outcome_feedback` through the existing PostHog setup without sending idea or answer text. This is user-reported feedback, not independent validation, and is stored only when analytics is configured.

Automated judging by the same provider is not independent evidence. Repeat across models and get human review before making outcome claims. The initial two-task smoke test did not establish broad superiority.
