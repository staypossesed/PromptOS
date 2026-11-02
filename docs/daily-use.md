# Daily-use experience

The signed-in home now offers Continue, My frequent tasks, four familiar starting points, and recent saved work. Aggregate score cards were removed from the home: unscored tasks are not zero-quality work. Detailed quality review remains available on instruction results.

## Reuse and privacy

Frequent tasks reuse the existing owner-scoped `workspace_items` playbook records. Their optional, validated `routine` payload stores selected answers, extra details, interface language, a user-written study checkpoint, and explicitly marked session completions. No database migration is required. Generated results, profile snapshots, previous versions and one-time clarification strings are not implicitly copied into a frequent task.

On reopening a frequent task, its settings are displayed for review and applied only when selected. A saved personal profile has a separate preview and explicit confirmation naming Anthropic/OpenRouter. Unconfirmed profiles are excluded from model input. Stored structured task preferences are excluded from AI metadata; the reviewed clarifications are sent instead. No new analytics fields or automatic outbound reminders were added.

## Study continuity

Study tasks, including NCLEX and EGE, let the user write what they covered and what needs practice before preparing a next session. Saving a checkpoint alone does not mark a session complete. An explicit completion is counted once per local calendar day. It is a user report, not evidence that an external lesson happened or that the student mastered a topic.

The next-session request uses the original goal, selected study time and explicitly applied progress notes. It asks the AI to clarify missing topics and use original practice questions. Umprompt does not read another AI assistant's conversations, automatically infer progress, or promise reminders or an exam result.

## Following a result

One relevant next action is offered for studying, messages, planning, explanations or other tasks. Follow-ups use the user's original goal and their own saved notes. A reply task explicitly asks for the received message if missing; a planning follow-up asks what changed. These actions open an editable review step and do not generate automatically. Starting over from an unsaved result requires a keep-or-leave confirmation.

## Navigation and recovery

Home, saved work and saved preferences form the primary navigation. Secondary tools remain under More options. Existing individual saved results open in the same beginner result screen. Pack/template flows and the previous checkout-resume flow remain available. Results are read-only until Edit; the original idea remains separately editable through Change my idea.

Explicit new-task and preset links are consumed into the regular builder URL so reloading does not reset the task. Bounded, owner-checked session drafts preserve the current result and the associated frequent-task ID through refresh. Private cloud records remain protected by the existing verified-account filters and RLS.

## Verification

All 159 automated tests passed, including the existing billing/auth/extension suite and five daily-use tests. The added checks cover routine bounds and profile exclusion, saved task preferences, explicit study completion, multilingual follow-ups, copy coverage, and preservation of legacy checkout-resume routes.

Manual browser checks confirmed a clearly labeled test frequent task could be saved, reopened, updated with synthetic notes, and recovered after reload with one marked session. A real provider request then produced a next-session teaching prompt preserving the selected starting level, one hour of study time, and the exact synthetic checkpoint. Explicit saving and the follow-up review step were verified. A separate synthetic style preference could not be applied before consent, could be confirmed, and could be removed; this preference was not sent to the AI during that test.

Two clearly labeled test workspace items and one generated study prompt remain in the testing account for review. No production deployment or database migration was performed as part of this implementation.

The final production build passed compilation, lint, type checks and page generation without warnings. The Russian dashboard, study task and Spanish study task had no horizontal overflow at a 390-pixel viewport; the English study controls were also reviewed. The dashboard's direct composer carried the typed idea into the guided details step without generating automatically. The viewport was restored after testing. Final screenshots are kept with the local review artifacts.
