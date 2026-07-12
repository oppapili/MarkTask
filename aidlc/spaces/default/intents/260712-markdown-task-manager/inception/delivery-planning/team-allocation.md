# Team Allocation — MarkTask

> Inception / delivery-planning 成果物。Bolt-to-mob 割当。
> 上流参照: `../units-generation/unit-of-work.md`, `../practices-discovery/team-practices.md`。

## 割当

team-formation（1.5）は mvp スコープで **SKIP**。よって全 Bolt は **aidlc-developer-agent（AI）** が実行する。人間のモブ編成・Program Board は該当なし（個人プロジェクト＝開発者本人がレビュー/承認）。

| Bolt | 実行主体 | 承認 |
|---|---|---|
| Bolt 1（歩く骨格） | aidlc-developer-agent | 単独・承認ゲート必須（walking skeleton） |
| Bolt 2〜6 | aidlc-developer-agent | ラダープロンプトの選択に従う（自律 or 都度ゲート） |

## ノート

- Construction は Kiro ハーネスでは subagent fan-out で実行。逐次実行（Q3=A）なので1バッチ=1 Bolt を想定。
- レビュー/承認は開発者本人（human-in-the-loop）。失敗時は常に halt-and-ask。
