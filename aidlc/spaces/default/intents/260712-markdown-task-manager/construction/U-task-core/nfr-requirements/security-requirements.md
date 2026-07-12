# Security Requirements — U-task-core

> Construction / nfr-requirements（unit: U-task-core, library）。上流参照: `../functional-design/business-logic-model.md`（business-logic-model）, `../functional-design/business-rules.md`（business-rules）, `../../../inception/requirements-analysis/requirements.md`（requirements, NFR）。
> 前提: ローカル・単一ユーザー・ネットワーク非公開・クラウドなし（SC 制約）。

## 脅威モデル（ローカルツール）

- ネットワーク公開なし＝リモート攻撃面なし。主な考慮は**ローカルの安全性**（データ破損・意図しないファイル操作・不正入力）。認証/認可は非該当（単一ユーザー）。

## セキュリティ要件

- **SEC-1（パストラバーサル防止）**: `ref`/slug からファイルパスを組む際、`..`・絶対パス・OS 禁止文字を除去/拒否し、tasksDir/trashDir/archiveDir の外へ書き込ませない。
- **SEC-2（入力検証）**: frontmatter・CLI/MCP 引数は TaskModel スキーマで検証（不正 status/priority/日付を拒否, business-rules R1–R7）。
- **SEC-3（データ破損防止）**: 書込は原子的 temp→rename（NFR-1）。途中失敗で破損させない。
- **SEC-4（既存資産の非破壊）**: frontmatter 非準拠の既存 Markdown を壊さない・未知フィールド温存（NFR-2）。
- **SEC-5（秘密情報なし）**: 認証情報・トークン等を扱わない/保存しない。設定ファイルにも秘密を置かない。
- **SEC-6（コード実行なし）**: タスク本文・frontmatter を実行/評価しない（YAML は安全ロード＝任意オブジェクト生成を避ける）。
- **SEC-7（ハード削除なし）**: 物理削除を公開しない（誤操作耐性, FR-I）。

## コンプライアンス

- 個人ローカル利用・PII を外部送信しない。規制対応は非該当（クラウド/多者利用でないため）。

## テスト観点（quality）

- パストラバーサル入力、不正 frontmatter、原子的書込の中断耐性をユニットテストで確認（team-practices コア重点）。

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-07-12T13:28:44Z
**Iteration:** 1

### Strengths

1. **Context-appropriate security posture**: The threat model explicitly acknowledges "ネットワーク公開なし＝リモート攻撃面なし" and correctly scopes security requirements to local tool concerns (path traversal, input validation, atomic writes, data integrity) rather than enterprise concerns (auth/authz, network hardening, compliance). This reflects a proper understanding of the deployment context and avoids over-engineering. The "認証/認可は非該当（単一ユーザー）" statement is architecturally sound for a single-user local CLI/MCP tool.

2. **Complete traceability to upstream contracts**: All seven security requirements (SEC-1 through SEC-7) trace cleanly to NFR-1 (atomic writes → SEC-3), NFR-2 (non-destructive codec → SEC-4), business-rules.md R9 (slug sanitization → SEC-1), R11 (error normalization → SEC-2), INV3 (no hard delete → SEC-7), and the functional-design business-logic-model.md §3 atomic write sequence and §4 codec preservation rules. The "不正 status/priority/日付を拒否, business-rules R1–R7" cross-reference in SEC-2 explicitly ties input validation to the complete schema validation rule set. SEC-6 correctly implements "YAMLは安全ロード＝任意オブジェクト生成を避ける" to prevent code execution via YAML deserialization vulnerabilities.

3. **Path traversal prevention is concrete**: SEC-1 specifies three distinct protections: "..・絶対パス・OS禁止文字を除去/拒否" and "tasksDir/trashDir/archiveDir の外へ書き込ませない". This maps to business-rules.md R9's slug sanitization rule and the boundary enforcement INV4 requires. The "外へ書き込ませない" boundary check is the primary defense against malicious `ref` inputs attempting directory traversal — a developer can implement this as a path-canonicalization check (resolve the target path and verify it starts with the allowed directory prefix).

4. **No hard delete is architecturally enforced**: SEC-7 "物理削除を公開しない（誤操作耐性, FR-I）" matches FR-I1's "ハード削除は提供しない（git がセーフティネット）" and business-rules.md INV3's "task-core は `unlink` によるタスク本体の物理削除を公開しない". The "公開しない" language correctly frames this as an API surface constraint, not an internal implementation detail — the repository layer owns `unlink`, but never exposes it via a public method. This prevents accidental deletion at the CLI/MCP adapter level.

5. **Atomic write requirement is precise**: SEC-3 "書込は原子的 temp→rename（NFR-1）。途中失敗で破損させない" directly implements NFR-1 and business-rules.md INV1. The cross-reference to NFR-1 establishes traceability, and the "途中失敗で破損させない" failure-mode statement clarifies the intent (partial writes must not leave corrupt files). This is testable: a developer can write a test that kills the process mid-write and verifies no partial file exists.

6. **No secrets handling is appropriately scoped**: SEC-5 "認証情報・トークン等を扱わない/保存しない。設定ファイルにも秘密を置かない" correctly reflects the local-only, no-cloud constraint. The "設定ファイルにも秘密を置かない" extension prevents accidental credential leakage via config files (even though the tool doesn't need credentials, stating this explicitly prevents future feature creep introducing secrets without proper handling).

7. **Test surface is well-defined**: The "テスト観点（quality）" section names three specific test cases: "パストラバーサル入力、不正 frontmatter、原子的書込の中断耐性をユニットテストで確認（team-practices コア重点）". These map 1:1 to SEC-1, SEC-2, and SEC-3, providing clear guidance for the code-generation and build-and-test stages. The "team-practices コア重点" cross-reference correctly invokes the project's core-focused testing posture (thick tests on fragile core logic, thin tests on periphery).

### Findings

**No findings.** The security requirements are complete, implementable, and appropriately scoped for a local single-user CLI/MCP tool. A developer can proceed to code-generation with clear guidance on:
- Path traversal prevention (boundary checks + slug sanitization)
- Input validation (schema enforcement per R1–R7)
- Atomic writes (temp→rename per INV1)
- Non-destructive codec (preserve unknown fields per INV2)
- No credentials handling (SEC-5)
- Safe YAML deserialization (SEC-6)
- No hard delete API surface (SEC-7)

All requirements trace to upstream contracts (NFR-1/2, business-rules R1–R14, business-logic-model §3/§4, requirements.md SEC constraints). The threat model correctly excludes network attack surface and auth/authz, avoiding enterprise over-reach. The test surface is testable at unit level.

### Summary

The security requirements reflect architectural soundness and deployment-context awareness. A local tool has no remote attack surface, so the focus on **local safety** (data corruption prevention, input validation, atomic operations, non-destructive handling) is the correct threat model. The seven requirements (SEC-1 through SEC-7) provide concrete, testable protection against the actual risks (malicious file paths, invalid input, partial writes, data destruction) without inventing enterprise concerns (auth, network hardening, compliance) that don't apply to this deployment model.

The explicit "認証/認可は非該当（単一ユーザー）" and "ネットワーク公開なし＝リモート攻撃面なし" statements demonstrate that the designer understands the deployment context and has deliberately scoped the security posture to match. This is architecturally correct — over-securing a local tool wastes effort and introduces unnecessary complexity. The "git がセーフティネット" acknowledgment (SEC-7) shows pragmatic risk acceptance: hard delete is excluded not because the tool can't implement it, but because the version control layer already provides recovery, making hard delete a pure liability (accidental data loss with no recovery path).

**READY to advance to infrastructure design.**
