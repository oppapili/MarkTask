# Business Rules — U-subtasks

> Construction / functional-design（unit: U-subtasks）。上流参照: `../../../inception/requirements-analysis/requirements.md`（requirements, FR-G）, `../../../inception/application-design/component-methods.md`（component-methods）, `../../../inception/units-generation/unit-of-work.md`（unit-of-work）, `../../../inception/application-design/components.md`, `../../../inception/application-design/services.md`。

## 親子・ガードのルール

- **R1（親子表現）**: 子は frontmatter `parent: "[[<親ref>]]"`（wikilink）で親を指す。子も1ファイル（FR-G1）。
- **R2（完了ガード）**: 親を `done` にできるのは、全ての子が「完了扱い」の状態のときのみ（FR-G2）。未完子があれば拒否し、未完子一覧を提示（`guard-blocked`）。
- **R3（完了扱いの定義, OQ-4 確定）**: 「完了扱い」= `done` または `cancelled`（意図的に中止した子は親を妨げない）。ブロッキング = `todo` / `in-progress` / `waiting`。
- **R4（再帰・多階層, FR-G4）**: ネストは多階層を許可。ガードは子孫に再帰適用（孫が未完なら親も不可）。
- **R5（循環保護）**: `parent` の循環リンク（不正データ）でも `visited` により無限再帰しない。循環検出時はその枝を打ち切り、可能なら警告。
- **R6（`--force` 上書き）**: `done --force` はガードを明示的に上書き可能（人間の判断を尊重）。既定はガード有効。
- **R7（表示中心の副作用なし）**: 本 unit は読み取りのみ。子の状態を親が自動変更したりしない（親完了で子を自動 done にはしない）。
- **R8（存在しない親）**: 子の `parent` が実在しない ref を指す場合、children 逆引きには現れない（壊れた前提でも例外を投げない, NFR-2 精神）。

## 対象 stories

US-4.1（サブタスク作成・親子リンク）, US-4.2（親完了ガード）。
