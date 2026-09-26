# Reborn AI: model setup and checks

## OpenRouter setup

Set `OPENROUTER_API_KEY` on the server. For the answer model, set either:

```text
OPENROUTER_MODELS=google/gemma-4-31b-it:free,google/gemma-4-26b-a4b-it:free
```

or remove both `OPENROUTER_MODELS` and `OPENROUTER_MODEL` to use the same code defaults. `OPENROUTER_MODELS` takes precedence over `OPENROUTER_MODEL`; an old value such as `inclusionai/ling-3.0-flash-vl:free` will keep causing failures until it is updated. Redeploy after changing Vercel environment variables. Both configured slugs are free endpoints, and the second is an availability fallback.

[OpenRouter's free-tier guide](https://openrouter.ai/blog/tutorials/how-to-get-the-lowest-cost-llm-inference-on-openrouter/) says adding $10 in credits raises the free-model allowance to 1,000 requests/day while retaining 20 requests/minute. Provider-side limits and availability can still vary. The app also limits each client to 8 requests/minute and 60/hour.

## Automated checks

```text
node --test src/lib/reborn-ai/answer-facts.test.mjs
npm run typecheck
```

## Browser checks after deployment

Ask these in Reborn AI, starting a fresh chat for each case:

| Question | Expected behavior |
| --- | --- |
| `when was 1.3?` | Gives Alpha **August 30, 2024** and Pre-Alpha **November 16, 2023**. |
| `when was pre-alpha 1.3?` | Gives only **November 16, 2023**. |
| `what is trimp?` | Explains high-speed surface contact and grounded/coyote re-entry. Does not define it as crouching on a slope. |
| `how do I trimp?` | Gives the verified mechanic and says the guide has no universal input sequence. |
| `when was 1.3 and what is trimp?` | Answers both parts; the model must not invent patch contents or trimp inputs. |
| `what is crystal wr?` | Uses the live world-record source and its record card, if available. |

The first four checks are deterministic. The mixed question and live record question test the configured model. Watch Vercel function logs for `reborn-ai answer model failed` and `answerModel`. An HTTP 200 for this streaming route means the stream opened; read its `text` or `error` events to determine the result.
