# Requirements Analysis — Clarifying Questions

Project: **MarkTask**（mvp / Standard depth）。Ideation で確定済みの事項（frontmatterスキーマ・5状態・CLIサブコマンド＋`mt`・list既定テーブル・MCPフル操作面の方針・walking-skeleton-first・保存先既定`tasks/`）は再質問しません。ここでは**まだ未解決のギャップ**を詰めます。
> 記号（A〜E, X）で回答。複数選択可の設問は `A, C` のように。既定案でよければその旨だけでOK。

---

## Q1. recurrence の簡易記法、MVPでサポートする範囲は？（複数選択可）

繰り返しは frontmatter `repeat` に独自簡易記法（例 `every 1 month`）。MVPで解釈できるべきパターン:

- A. 基本間隔: `every N days/weeks/months/years`（例 `every 2 weeks`）
- B. 曜日指定: `every monday` / `every mon,thu`（毎週の特定曜日）
- C. 月内日指定: `every month on 1`（毎月1日）/ 月末 `every month on last`
- D. 単純キーワード: `daily` / `weekly` / `monthly` / `yearly`
- E. 終了条件: `... until 2026-12-31` や `... x10`（回数上限）
- X. その他（自由記述。最小で始めたい等）

[Answer]:A,B,C,D,E

---

## Q2. recurrence 完了時の「次回発生日」の起点は？

`done` にすると同一ファイルの `due` を次回へ更新し `todo` に戻す（単一ファイル方式）。次回 `due` の計算起点:

- A. 直前の `due` を起点に加算（予定ベース。例 due=8/1 を月次→9/1。遅れても予定どおり進む）
- B. 完了した実日(today)を起点に加算（実績ベース。8/5に完了なら 9/5）
- C. `repeat` 記法内で選べるように（既定は A、`from completion` 等で B に切替）
- D. おまかせ（推奨: A=予定ベース、定期タスクの意図に合う）
- X. その他（自由記述）

[Answer]:A.

---

## Q3. recurrence の完了履歴は残す？

単一ファイル方式なので、完了の履歴が上書きで消えないようにするか:

- A. 残さない（`due`/`status` を更新するだけ。シンプル最優先）
- B. 本文に完了ログを追記（例 `## 完了履歴` に `- done 2026-08-01` を追記）
- C. frontmatter に最終完了日 `last_done: 2026-08-01` を1つだけ保持
- D. おまかせ（推奨: C=最終完了日のみ、軽量で十分）
- X. その他（自由記述）

[Answer]:C.

---

## Q4. サブタスク（親子）の意味論は？（複数選択可）

サブタスクは1ファイル＋ `parent: "[[親]]"`（wikilink）。親子の扱い:

- A. 親の完了は子の状態に影響しない（独立。表示だけ親子を辿れる）
- B. 全ての子が `done` になるまで親を `done` にできない（ガード）
- C. 親を `done` にしたら未完了の子に警告を出す（ブロックはしない）
- D. `list --parent <親>` で子だけ絞り込み表示できればよい（機能は表示中心）
- E. ネストは1階層のみ（孫は作らない）とする
- X. その他（自由記述）

[Answer]:B.

---

## Q5. タスクの参照方法（CLI / MCP で `<ref>` をどう指定する）？

ファイル名が参照キー（例 `20260712-書類を提出する.md`）。CLI/MCP での指定方法:

- A. ファイル名の stem 完全一致（例 `20260712-書類を提出する`）
- B. タイトル slug 部分一致（例 `書類` で前方/部分一致、複数該当ならエラーで候補提示）
- C. A も B も許可（完全一致優先、なければ部分一致 → 曖昧なら候補提示）
- D. おまかせ（推奨: C）
- X. その他（自由記述）

[Answer]:C.

---

## Q6. 一覧・検索の対象フィールドと既定ソートは？

- フィルタ対象（複数選択可）: A. status  B. due  C. priority  D. tags  E. project ／ 本文テキスト検索（`search`）
- 既定ソート: F. due 昇順（期限が近い順、未設定は末尾）  G. priority 降順  H. created 降順  I. おまかせ（推奨: F）
- X. その他（自由記述）

回答例: `A,B,C,D,E, F`（フィルタ全対象＋due昇順）

[Answer]:A,B,C,D,E F

---

## Q7. MCP で公開する操作面の確定は？（複数選択可）

Ideation 方針は「フル操作面」。MVPで公開するツール:

- A. create / list / get(show) / update / complete(done) / state変更 / search（読み書きの主要操作）
- B. A ＋ delete（削除）も公開
- C. A ＋ recurrence 設定専用ツール（repeat の設定/解除）
- D. 破壊的操作（delete・一括更新）は MCP から除外し CLI 限定にする
- E. おまかせ（推奨: A＋C を公開、delete は当面 CLI 限定 = D 寄り）
- X. その他（自由記述）

[Answer]:BとC

---

## Q8. 非機能: データ安全性・規模・設定保存

- データ安全性（複数選択可）: A. 書き込みは原子的（temp→rename）でファイル破損を防ぐ  B. 破壊的操作（delete/上書き）前に確認 or `--force` 必須  C. 既存の手書きMarkdown（frontmatter無し等）を壊さない/無視する
- 想定規模: D. 数百件  E. 数千件（数千でも list/search が実用速度）
- 設定保存場所: F. vault 内の設定ファイル（例 `tasks/.marktask.toml`）  G. XDG 準拠（`~/.config/marktask/config.toml`）  H. おまかせ（推奨: G、vaultパスやtasksディレクトリを保持）
- X. その他（自由記述）

回答例: `A,B,C, E, G`

[Answer]:A,C,E, G

---

## Q9.（フォローアップ）削除(delete)の安全策 — Q7(MCPでdelete公開) と Q8(確認必須Bは非選択) の整合

AI が MCP 経由で delete を呼べる一方、破壊操作前の確認/`--force` は必須にしていない。整合を取る:

- A. ハード削除・ガードなし（git がセーフティネット。回答どおり）
- B. ソフト削除: `delete` はファイルを trash/archive（例 `tasks/.trash/`）へ移動（復旧可能）
- C. CLI はハード削除のまま、MCP の `delete` だけ明示 `confirm: true` を必須にする
- D. B ＋ C（ソフト削除 かつ MCP は confirm 必須）
- X. その他（自由記述）

[Answer]:B（ソフト削除）。ただし delete と archive は**別 operation** にする（意図が違うため）。delete=ソフト削除で `tasks/.trash/` へ移動（誤り/不要の除去・復旧可）。archive=別コマンドで archive 場所へ退避（完了/非アクティブの保全・活動一覧から除外）。どちらも非破壊。ソフト削除ゆえ MCP delete の confirm 必須(選択肢C)は不要とする。