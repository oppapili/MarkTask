# Security Requirements — U-cli

> Construction / nfr-requirements（unit: U-cli, service）。上流参照: `../functional-design/business-logic-model.md`（business-logic-model）, `../functional-design/business-rules.md`（business-rules）, `../../../inception/requirements-analysis/requirements.md`（requirements, FR-D）。
> 前提: ローカル・単一ユーザー・ネットワーク非公開。

## セキュリティ要件

- **SEC-1（シェル注入なし）**: ユーザー入力を用いて外部シェル/コマンドを組み立てない（`marktask` は子プロセスを起動しない設計）。復旧ヒント（mv/git）は**表示のみ**で自動実行しない。
- **SEC-2（引数検証）**: commander で受けた引数は TaskService/TaskModel の検証を通す。不正値は exit 1/2 で拒否（人間可読エラー）。
- **SEC-3（パス安全）**: `<ref>` からのパス組み立ては task-core のサニタイズ（SEC-1）に委譲。CLI 側で生パス結合しない。
- **SEC-4（出力の安全）**: `--json` は安定した構造化出力。端末エスケープ等の制御文字をそのまま垂れ流さない（必要なら無害化）。
- **SEC-5（秘密なし）**: 認証情報を扱わない。設定は vault/tasks パス等のみ。

## 脅威・非該当

- ネットワーク/認証は非該当。主眼は「シェル注入を作らない」「入力検証を core に通す」。

## テスト観点

- 特殊文字を含む title/ref での安全なファイル名生成（core 経由）、不正引数の exit code、`--json` の安定性。

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-07-12T13:52:24Z
**Iteration:** 1

### Strengths

1. **Deployment-appropriate scope**: All five NFR categories correctly contextualized for a local, single-user, per-command process CLI tool
2. **Performance reality**: PERF-1 recognizes bun startup overhead with reasonable ~1s guideline; PERF-2 acknowledges O(n) scan with thousands-viable threshold matching NFR-3; no unrealistic sub-millisecond promises
3. **Security attack surface accuracy**: SEC-1 shell injection prevention (no child process spawn); SEC-2 input validation via core; SEC-3 path safety delegation to task-core; SEC-4 output sanitization for --json; correctly omits inapplicable network/auth requirements
4. **Scalability honest scoping**: SCALE-1 thousands of tasks; SCALE-2 single-user sequential (no multi-writer concurrency); SCALE-3 no daemon; SCALE-4 future index/cache escape hatch documented; correctly marks horizontal scale as N/A
5. **Reliability without availability SLA theater**: REL-1 atomic writes (NFR-1); REL-2 non-destructive (NFR-2); REL-3 clear exit codes; REL-4 graceful degradation; REL-5 soft delete recovery; correctly marks SLA/SLO/DR as N/A for non-daemon process
6. **Minimal dependency discipline**: Tech stack = commander + lightweight color utility only; core delegation enforced (project.md Mandated); aligns with "不要な依存を増やさない" principle

### Cross-Reference Validation

All upstream references resolve and align:
- business-logic-model.md, business-rules.md, requirements.md (NFR-1/2/3, FR-D) present and consistent
- Performance targets trace to NFR-3 (O(n) acceptable for thousands)
- Security SEC-3 delegates to task-core SEC-1 from requirements
- Reliability REL-1/REL-2 reference NFR-1/NFR-2 atomic writes and non-destructive operations
- Tech stack commander traces to ADR-2 (Q2=A), bun to ADR-1
- Business rule R1 (thin adapter) matches project.md Mandated requirement

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| - | - | - | No findings | All requirements appropriately scoped and implementable |

### Summary

The NFR Requirements correctly recognize that a local CLI tool executing as 1 command = 1 process has fundamentally different quality attributes than a networked service. Performance focuses on startup and O(n) operations without over-promising SLAs; security addresses real CLI risks (injection, validation, path safety) without inventing authentication; scalability correctly scopes to single-user thousands without horizontal scale theater; reliability emphasizes atomic writes and clear failure modes without availability SLO promises; tech stack minimizes dependencies. All cross-references resolve. A developer can implement from this specification without architectural guidance beyond these documents.
