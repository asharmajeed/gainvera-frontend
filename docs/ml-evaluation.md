# Member C classifier evaluation

21 October 2026 (Asia/Karachi). Release **ecommerce-family-v1.0.0**, supplied as
a local classifier package, not integrated into the API. No human playbook review,
live AI guidance or business outcome is established by these results.

The predictor recognized **32/36 ordinary held-out descriptions**, all correctly,
and abstained on four. Its six-family macro F1 with abstentions counted as missed
classifications is **0.9364**. The underlying forced-choice classifier scored
36/36, but that number omits the acceptance gate. Ambiguity handling is weak:
**four of six held-out ambiguous tasks were incorrectly accepted**. The release
was kept unchanged after observing this failure.

## Data and selection protocol

The frozen release is `synthetic-workflows-v1.0.0`: 180 descriptions, sixty
situation groups, three paraphrases per group. Whole-group splits remain
108/36/36 rows and 36/12/12 groups, with eighteen/six/six rows per family.
There are separate thirty-row validation and held-out challenge files. All labels
and cases were AI-authored by the same project author, without human review or
real-store sampling. See the dataset protocol (gainvera-backend: `data/README.md`).

Only `description` enters X; only `task_family` enters y. IDs, group summaries,
split names, challenge annotations, provenance and risk metadata are excluded.
Vocabulary, IDF, classifier coefficients and the novelty reference vectors were
fitted on the **108 training descriptions only**. Validation and test data never
entered fitting; the shipped pipeline was not refitted on all 180 rows.

The selection plan (gainvera-backend: `data/ml-selection-plan.json`) was written before fitting.
It searched six pipelines: word unigrams or unigrams/bigrams crossed with logistic
regression C = 1, 4 or 10. Each was combined with the plan's fixed confidence,
margin, support-similarity and known-token thresholds, for **1,152** combinations.
Only the 36 ordinary validation rows and thirty validation challenges determined
selection. The fixed objective was:

```text
0.5 * correct recognized supported cases / 48
+ 0.5 * correctly abstained negative cases / 18
```

The 48 supported cases are 36 ordinary and twelve high-risk/adversarial cases;
the eighteen negatives are unsupported, ambiguous and zero-vocabulary cases.
Abstaining on a supported case earns no correct-recognition credit. Ties prefer
more correct supported recognitions, then more negative abstentions, then earlier
grid order. This is an author-chosen validation objective, not a calibrated
business utility or proof that its weights generalize.

The selected model is NFKC/casefold/whitespace normalization, training-fitted word
TF-IDF with English stop words, sublinear TF and L2 normalization, then
`LogisticRegression(C=10, solver="lbfgs", max_iter=1000, random_state=20261021)`.
Its vocabulary has **685 features**. The saved preprocessing is part of the same
pipeline used in inference. A training-only sparse matrix of 108 normalized
TF-IDF vectors supports maximum cosine similarity checks.

The candidate and policy were recorded in `freeze.json` at
`2026-10-21T06:14:08.426649+00:00`; the final held-out evaluation was recorded at
`2026-10-21T06:14:24.119982+00:00`. Artifact, code, plan and requirement hashes were
checked before held-out scoring. The freeze record's `held_out_scored=false`
describes that earlier checkpoint; final results are in the separate evaluation.
No settings, text normalization, dataset labels or thresholds were changed in
response to held-out results. Test replay and a fixed-parameter training-only
rebuild were verification, not a new selection cycle.

## Frozen acceptance policy

| Check | Selected value / behavior |
| --- | --- |
| No fitted TF-IDF features | Abstain `out_of_vocabulary`; null confidence |
| Maximum cosine to a training reference | At least 0.10, otherwise `unsupported_task` |
| Known unique eligible word-token ratio | At least 0.35, otherwise `unsupported_task` |
| Actual highest class probability | At least 0.35, otherwise `low_confidence` |
| Highest minus second-highest probability | At least 0.20, otherwise `ambiguous_task` |
| All checks pass | `recognized`, actual family and probability |

Checks execute in the table's order; equality passes. Eligible tokens exclude
English stop words, use the saved tokenizer and count unique unigrams. A reason
is a heuristic explanation of the failed check, not a reliable semantic diagnosis.
For example an unsupported task may fail the margin check and return
`ambiguous_task`. These checks cannot guarantee detection of unknown or compound
tasks. The highest class probability is uncalibrated family confidence, never
business confidence, safety, priority or an estimate of savings.

## Ordinary validation and test results

| Metric | Validation (selection data) | Held-out test |
| --- | --- | --- |
| Rows / situation groups | 36 / 12 | 36 / 12 |
| Forced-choice accuracy | 35/36 = 0.9722 | 36/36 = 1.0000 |
| Forced-choice macro F1 | 0.9720 | 1.0000 |
| Recognized / abstained | 31 / 5 | 32 / 4 |
| Recognition coverage | 0.8611 | 0.8889 |
| Correct recognized / recognized | 31/31 = 1.0000 | 32/32 = 1.0000 |
| Correct recognized / all rows | 31/36 = 0.8611 | 32/36 = 0.8889 |

Validation results are selection evidence, not independent test performance.
For the held-out predictor, treating abstentions as missed classifications yields
accuracy 0.8889 and macro F1 **0.9363636364 over the six true families**. The latter
was computed from the immutable per-row predictions with abstention as a non-family
sentinel; it is not an extra trained class. Accepted-only accuracy conditions on
recognition and must always be read alongside coverage.

### Per-family held-out precision and recall

| Family | True rows | Forced precision / recall / F1 | Recognized | Gated precision | Gated recall | Gated F1 |
| --- | --- | --- | --- | --- | --- | --- |
| `catalog_cleanup` | 6 | 1.000 / 1.000 / 1.000 | 6 | 1.000 | 1.000 | 1.000 |
| `catalog_copy` | 6 | 1.000 / 1.000 / 1.000 | 4 | 1.000 | 0.667 | 0.800 |
| `order_report` | 6 | 1.000 / 1.000 / 1.000 | 6 | 1.000 | 1.000 | 1.000 |
| `refund_approval` | 6 | 1.000 / 1.000 / 1.000 | 6 | 1.000 | 1.000 | 1.000 |
| `stock_alert` | 6 | 1.000 / 1.000 / 1.000 | 5 | 1.000 | 0.833 | 0.909 |
| `support_reply` | 6 | 1.000 / 1.000 / 1.000 | 5 | 1.000 | 0.833 | 0.909 |

Gated recall includes rejected true cases as misses. It therefore differs from
the perfect forced-choice recall; no ordinary test case received a wrong
recognized family in this small sample.

### Forced-choice confusion matrix

Rows are true labels; columns are forced predicted labels before abstention.
Column abbreviations follow the actual pipeline/manifest class order:
cleanup, copy, report, refund, stock, support.

| True family | cleanup | copy | report | refund | stock | support |
| --- | --- | --- | --- | --- | --- | --- |
| `catalog_cleanup` | 6 | 0 | 0 | 0 | 0 | 0 |
| `catalog_copy` | 0 | 6 | 0 | 0 | 0 | 0 |
| `order_report` | 0 | 0 | 6 | 0 | 0 | 0 |
| `refund_approval` | 0 | 0 | 0 | 6 | 0 | 0 |
| `stock_alert` | 0 | 0 | 0 | 0 | 6 | 0 |
| `support_reply` | 0 | 0 | 0 | 0 | 0 | 6 |

The four ordinary abstentions were `wf-0004` and `wf-0006` (`catalog_copy`, low
confidence), `wf-0044` (`support_reply`, margin check) and `wf-0080` (`stock_alert`,
margin check). Their underlying forced families were correct. The margin reason
does not establish that those descriptions were actually multi-task inputs.

## Challenge outcomes

Every type has six validation and six held-out rows. Challenge rows were never
fitted; their validation annotations were used only for selection.

| Type | Validation outcome | Held-out outcome |
| --- | --- | --- |
| Unsupported | 5 abstained; 1 false acceptance | **6 abstained; 0 false acceptances** |
| Ambiguous | 4 abstained; 2 false acceptances | **2 abstained; 4 false acceptances** |
| Zero vocabulary | All 6 had zero fitted features and abstained | **All 6 had zero fitted features and abstained** |
| High risk | 6 correctly recognized; 0 abstained | **6 correctly recognized; 0 abstained** |
| Adversarial | 6 correctly recognized; 0 abstained | **6 correctly recognized; 0 abstained** |

On the eighteen held-out negative challenges, fourteen abstained and four were
falsely accepted. Those four were all ambiguous; accepting either candidate
family is an error under this dataset's clarification expectation. Ordinary test
metrics exclude challenge negatives because they have no single true family.

Held-out negative abstention reasons: unsupported cases returned four
`unsupported_task`, one `ambiguous_task` and one `low_confidence`; ambiguous cases
returned one `ambiguous_task` and one `low_confidence`; zero-feature cases returned
six `out_of_vocabulary` with null confidence. This is outcome counting, not a
claim that reason strings identify the true semantic cause.

The incorrectly accepted ambiguous cases were:

| Row | Recognized family | Actual highest score | Margin |
| --- | --- | --- | --- |
| `ch-test-008` | `support_reply` | 0.4790 | 0.2010 |
| `ch-test-009` | `stock_alert` | 0.6302 | 0.4138 |
| `ch-test-010` | `catalog_copy` | 0.4399 | 0.2226 |
| `ch-test-012` | `support_reply` | 0.4150 | 0.2164 |

These compound tasks can have a dominant lexical family even when clarification
is needed. A high margin did not prevent the `ch-test-009` error. B must preserve
clarification and human authority safeguards rather than equating recognition
with suitability for automation. C has not implemented B's business rules.

High-risk labels deliberately remain task families. Correctly recognizing a
refund case authorizes no payment. The six adversarial successes concern the
underlying family only; they are not an adversarial-security audit or proof that
all prompt-like text is harmless in a later generative system.

## Reproducibility, artifact and limitations

The complete bundle is under
the versioned artifact directory (gainvera-backend: `server/app/ml/artifacts/ecommerce-family-v1.0.0/manifest.json`).
It contains the fitted pipeline, `selection.json` (all 1,152 trials and validation
records), `freeze.json`, `evaluation.json` (all 66 held-out per-row outcomes) and
`manifest.json`. No records are fabricated by the predictor when an artifact
cannot be loaded. [B's handoff](MEMBER_C_ML_HANDOFF.md) gives exact commands,
pins, trust behavior and failure states.

Pipeline SHA-256:
`f68e068f764be803c4ddfa74d4f79f3f0ecf2594da193a391e9d426802aafb26`.
Manifest SHA-256:
`044a0cfda2db52522924fb2c79272ce3e1bb9a615ae0b27031177adfd49e1180`.
These are bound by the shipped repository allowlist. Package versions are Python
3.12.14, scikit-learn 1.7.2, NumPy 2.2.6, SciPy 1.15.3, joblib 1.5.2 and
threadpoolctl 3.6.0. The C environment also pins contract/testing dependencies in
ml-requirements.txt (gainvera-backend: `data/ml-requirements.txt`); B's active environment was not
modified.

The sample has only twelve held-out situation groups and six rows per family.
Three paraphrases per situation are correlated. The same AI author created all
partitions; this is a protocol-held-out set, not an independently collected blind
benchmark. Domain diversity, real customer language, policy variation and
unseen compound tasks are poorly covered. English stop words and word features
are not a multilingual validation. A finite validation search can overfit this
small authored corpus. No probability calibration was performed.

No real-world accuracy, correct action selection, verified savings, capacity
value, cash benefit or industry readiness follows from the reported results.
Improving ambiguity detection is future work requiring a new selection cycle
and fresh held-out situations; do not tune this released candidate against these
now-seen tests. Playbooks remain unreviewed drafts, and no API/AI/database or
frontend integration has been enabled by this task.

Reference behavior was checked against official [logistic regression documentation](https://scikit-learn.org/1.7/modules/generated/sklearn.linear_model.LogisticRegression.html)
and [model persistence guidance](https://scikit-learn.org/1.7/model_persistence.html).
