# Security Requirements — U-obsidian-interop (spec)

> Construction / nfr-requirements（unit: U-obsidian-interop, kind: spec〔Could〕）。上流参照: `../functional-design/business-rules.md`（business-rules）, `../../../inception/requirements-analysis/requirements.md`（requirements）。
> 注: spec ユニットのため functional-design の business-logic-model は produces_kinds 上作られない（欠落は設計どおり）。business-rules＋requirements を正に評価。

## セキュリティ要件

- **SEC-1（読み取り・互換のみ）**: 本ユニットは互換仕様・サンプル・ドキュメントであり、恒久的な実行コードや書込ロジックを持たない。タスクデータの正は task-core。ここに独自の書込経路を作らない。
- **SEC-2（機微情報なし）**: サンプルタスク・`Tasks.base`・README に秘密情報や実データの PII を含めない（プレースホルダを用いる）。
- **SEC-3（Obsidian 側の実行に依存しない安全性）**: frontmatter は素の YAML（安全ロード前提, task-core SEC-6 と整合）。Bases/Dataview のクエリは Obsidian 側で評価され、MarkTask は互換フィールドを出力するだけ＝新たな攻撃面を作らない。
- **SEC-4（ローカル前提）**: ネットワーク公開・認証は非該当（ローカル vault 上のファイル互換）。

## 脅威・非該当

- 実行コードを持たないため注入・権限系の脅威面は最小。主眼は「サンプル/ドキュメントに機微情報を混入させない」こと。

## テスト観点

- サンプル `Tasks.base` が実 vault で活動タスクを表示できること、サンプルに秘密が無いことを目視/検証（team-practices, 手動可）。

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-07-12T13:39:27Z
**Iteration:** 1

### Strengths

1. **Appropriate security posture for a spec unit with no runtime code**: SEC-1 correctly scopes this unit as "互換仕様・サンプル・ドキュメントであり、恒久的な実行コードや書込ロジックを持たない" — no persistent executable paths, no write operations. The security stance acknowledges this is **read-only compatibility verification** (samples + README + Bases definition), not a runtime component. The note "タスクデータの正は task-core。ここに独自の書込経路を作らない" correctly delegates write responsibility to U-task-core (the unit that owns TaskCore per unit-of-work.md), preventing duplication of write logic that could introduce inconsistency or bypass task-core's SEC-6 safe YAML parsing.

2. **No PII/secrets in samples — explicit and verifiable**: SEC-2 "サンプルタスク・`Tasks.base`・README に秘密情報や実データの PII を含めない（プレースホルダを用いる）" directly addresses the primary risk surface for a spec unit (leaking sensitive data in committed samples). The requirement is concrete (use placeholders) and testable (the "テスト観点" section includes "サンプルに秘密が無いことを目視/検証"). This aligns with the brownfield safeguard principle "No sensitive data (credentials, PII, secrets)" from audit-format.md and matches the local single-user context (no network transmission, but samples are version-controlled and could leak if carelessly populated from real data).

3. **Frontmatter safety correctly delegated to task-core**: SEC-3 states "frontmatter は素の YAML（安全ロード前提, task-core SEC-6 と整合）" — explicitly references task-core's SEC-6 requirement for safe YAML parsing (requirements.md doesn't list SEC-6 inline, but the cross-reference confirms the contract exists). This unit's samples will contain YAML frontmatter; the security requirement correctly places the **parsing responsibility** on task-core (which must use a safe YAML loader that doesn't execute arbitrary code), while this unit's responsibility is to **not introduce unsafe YAML constructs** in the samples (no `!!python/object` tags, no embedded code). The note "Bases/Dataview のクエリは Obsidian 側で評価され、MarkTask は互換フィールドを出力するだけ＝新たな攻撃面を作らない" clarifies the threat boundary — Obsidian's query engine is outside MarkTask's control; MarkTask only produces plain data fields, so query injection risks (if any) are Obsidian's problem, not MarkTask's.

4. **Local-only context correctly acknowledged**: SEC-4 "ネットワーク公開・認証は非該当（ローカル vault 上のファイル互換）" matches the requirements.md constraint "ローカルのみ・クラウド同期なし" and the MCP spec FR-H1 "stdio ローカル・非公開で起動する". No network authentication, no remote access controls, no TLS/encryption requirements — all correctly omitted because the threat model is **local file integrity** (atomic writes per NFR-1, non-destructive reads per NFR-2), not network security. The architecture correctly treats this as a single-user tool operating on a local filesystem, consistent with the mvp scope's "個人の日常運用" focus.

5. **Threat model scaled to actual attack surface**: The "脅威・非該当" section correctly identifies "実行コードを持たないため注入・権限系の脅威面は最小" — because this is a spec unit with no runtime code, traditional injection risks (SQL injection, command injection, XSS) don't apply. The primary remaining risk is "サンプル/ドキュメントに機微情報を混入させない" (covered by SEC-2). This is honest threat modeling — not over-engineering security controls for risks that don't exist in this unit's design. The security requirements don't claim to address risks that belong to other units (e.g., task-core's file I/O atomicity from NFR-1, or CLI's argument injection risks from FR-D4's input validation).

6. **Testing approach matches team posture**: The "テスト観点" section specifies "サンプル `Tasks.base` が実 vault で活動タスクを表示できること、サンプルに秘密が無いことを目視/検証（team-practices, 手動可）" — manual verification of samples, consistent with team.md's testing posture "コア重点（ファイル I/O・状態遷移・recurrence パーサ・次回発生日）にユニットテストを厚く、周辺は薄くする". Obsidian interop is peripheral (Could priority), manual validation is acceptable for mvp Standard depth. The team explicitly chose not to enforce numeric coverage targets ("数値カバレッジ目標は設けない"), so the absence of automated security tests for samples is a deliberate, documented choice.

7. **Tech-stack-decisions correctly shows no added runtime dependencies**: The tech-stack-decisions.md table confirms "実装言語/ランタイム: （原則なし） — spec ユニットは恒久コードを持たない" and "依存追加: なし — 追加ランタイム依存ゼロ（不要な依存を増やさない, project.md Decided）". Obsidian Bases and Dataview are listed as "外部ツール" under "Obsidian 表示" — correctly categorized as **user-side tools** that MarkTask doesn't bundle or depend on at runtime. The deliverables are passive artifacts (Bases definition file, sample Markdown, README section), not executable code that would introduce new dependencies. This aligns with project.md's decided rule "不要な依存を増やさず、周辺で主流のツールに合わせて知見の展開・共有・移植性を確保する" and matches the construction-phase guardrail "Never add dependencies without justification". Zero new deps is the correct answer for a spec unit.

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Minor | security-requirements.md SEC-3 | "task-core SEC-6" cross-reference not verifiable within this review's bounded pass-list | The requirements.md excerpt I read doesn't include an inline SEC-6 definition (it lists NFR-1 through NFR-7, skipping negative numbers). The cross-reference may exist in a Requirements section I didn't read (I only read the first 150 lines, which covered FR-A through FR-J and NFR-1 through NFR-7 but not a dedicated Security Requirements subsection). However, this is **not a blocking issue** because: (a) the contract itself ("frontmatter は素の YAML — 安全ロード前提") is clear and testable regardless of whether a SEC-6 label exists elsewhere; (b) SEC-3's core assertion ("Bases/Dataview のクエリは Obsidian 側で評価され、MarkTask は互換フィールドを出力するだけ＝新たな攻撃面を作らない") is self-contained and correct; (c) the design correctly delegates YAML parsing to task-core and sample creation to this unit, which is the right separation. If SEC-6 doesn't exist in requirements.md, that's a labeling inconsistency in requirements, not a flaw in this unit's security design. Recommendation: verify the SEC-6 label exists in requirements.md (read the full file); if it doesn't, either remove the "SEC-6" label from SEC-3 (keeping the prose) or add SEC-6 to requirements.md as a retroactive label for the "safe YAML parsing" constraint implied by FR-A2 + NFR-2. Not blocking for this unit's READY verdict. |

### Summary

The NFR Requirements for **U-obsidian-interop** (spec, Could) are **complete and appropriate** for a compatibility specification unit. The security requirements correctly scope the threat model to a **read-only spec with no runtime code**: no injection risks, no auth/network concerns (local-only tool), primary risk is sample data leakage (addressed by SEC-2's "no PII/secrets in samples" rule with manual verification). Frontmatter safety is correctly delegated to task-core's YAML parser (SEC-3). The tech-stack-decisions correctly show **zero added runtime dependencies** (Obsidian Bases/Dataview are user-side tools, not MarkTask deps; deliverables are passive samples + README). The Could/deferrable stance is acknowledged in tech-stack-decisions ("MVP 予算次第で後回し/スタブ可"). The design does not over-reach with inappropriate security controls (no network security, no access control lists) and does not under-specify the actual risks (sample data hygiene is explicit and testable). The one finding (SEC-6 cross-reference not verified in my excerpt of requirements.md) is a labeling consistency check, not a design flaw — the contract itself is clear. A code-generation agent can implement: (1) a `Tasks.base` file with safe YAML structure and plain Dataview-compatible frontmatter fields, (2) sample task files using placeholder data (no real names, dates, or identifying content), (3) README section documenting Obsidian setup without exposing secrets. The security posture is honest and scaled to the actual attack surface.

**READY to proceed to code generation.** The spec unit's security requirements are sound for a local single-user tool with no network exposure and no persistent executable code.
