# Authoritative API source used by Member A

28 October 2026, Asia/Karachi. Frontend repository:
`D:\Netsol\Gainvera\github\gainvera-frontend`, base
`f957c4805848ebf9fbcc92cb57938eb428755cca`.

The implemented API v2 source is the **local working tree** at
`D:\Netsol\Gainvera\github\gainvera-backend`, base
`76a8758344365330bea8ebcad60b296840c2f7cc`. B's result implementation is
uncommitted/unpublished. Checking out that commit alone does not provide it.
A read B's current contracts, result types, setup and handoffs, and reused the
already running API on 8000; no backend source, schema or C-owned file was edited.

Authoritative backend SHA-256 values when adopted:

| Backend path | SHA-256 |
| --- | --- |
| docs/api-contract.md | 10976CB27AF93A4C026206EF0DBE0254C8EB2072EF13D93021E6DD6F195EDC62 |
| docs/RESULTS_API_V2.md | ED866C7AFB68E5D4B5695BE795139B4239294BED43ACD49CFFF28A2563190F33 |
| server/app/contracts/results.py | 8D286A73F3D007E2791EF334A0D02C3817B4B7FA3D51C86682B96FC28BB96AB2 |
| server/app/contracts/domain.py | 12865969FA050CCB9B074924E8A19BBECE68106B75531697ED24BD6AAD21668A |

[API reference](api-contract.md), [result reference](RESULTS_API_V2.md) and
[B's handoff snapshot](MEMBER_A_BACKEND_HANDOFF.md) were refreshed from those
local documents, with reference-status prefaces. The database-guide link is
rebased to the companion repository; wire semantics are unchanged. B's historical handoff describes the assignment
that A has now implemented; [A's current MVP handoff](MVP_HANDOFF.md) supersedes
its next-member instruction in this frontend copy. Source paths mentioning
`server/` or `data/` refer to the companion, not files in this repository.

Runtime verification used real bearer-authenticated requests against this source,
not health readiness flags. `/health` reports liveness and not-checked dependencies.
No new shared schema was invented. Selected guidance is reviewed-playbook fallback;
live OpenAI connectivity, actual business savings and general model performance
are not established by this frontend acceptance.
