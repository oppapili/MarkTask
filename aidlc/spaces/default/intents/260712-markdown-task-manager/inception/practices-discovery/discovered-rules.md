# Discovered Rules — MarkTask

> Inception / practices-discovery 成果物（是正的・エージェント向け）。承認ゲートで `aidlc-project.md` の `## Mandated` / `## Forbidden` に追記昇格する（`(affirmed YYYY-MM-DD)` 付き）。
> 由来: practices-discovery-questions.md（主に Q5, Q6）。ユーザーが明示したハード制約のみを記載し、推測ルールは足さない。

## Mandated

ALWAYS CLI と MCP サーバはコアロジックを共有する（両者は単一コアの薄いアダプタとして実装する）。
ALWAYS フォーマッタとリンタを CI で実行し、フォーマット/リント失敗はマージをブロックする。

## Forbidden

<!-- 今回の practices-discovery では NEVER 形式のハード制約は明示されなかった（Q6 でユーザーが挙げた明示ルールは Mandated の1件のみ）。将来の再実行や学習ループで追記される。 -->
