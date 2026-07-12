# Domain Entities — U-cli

> Construction / functional-design（unit: U-cli）。上流参照: `../../../inception/application-design/component-methods.md`（component-methods）, `../../../inception/requirements-analysis/requirements.md`（requirements, FR-D）, `../../../inception/units-generation/unit-of-work.md`（unit-of-work）, `../../../inception/application-design/components.md`, `../../../inception/application-design/services.md`。
> ドメインエンティティは持たない（アダプタ）。CLI 構造の定義と表示オプション値オブジェクト。

## コマンド定義（構造）

| command | 引数/オプション | TaskService 呼び出し |
|---|---|---|
| add | `<title>` --due --priority --tags --project --repeat --parent | addTask |
| list | --status --due --priority --tag --project --format --relative --archived --sort --limit --json | list |
| show | `<ref>` --json | getByRef |
| update | `<ref>` --due --priority --tags --project --repeat | updateTask |
| start/done/wait/cancel | `<ref>` [--force(done)] | changeState / complete |
| state | `<ref> <value>` | changeState |
| search | `<query>` --json | search |
| delete | `<ref>` | softDelete |
| archive | `<ref>` | archive |
| config | --set/--get/--list | getConfig/setConfig |

## RenderOpts（表示オプション値オブジェクト）

```ts
interface RenderOpts {
  color: boolean;        // isTTY() && !--no-color
  relative: boolean;     // --relative
  format: 'table' | 'compact' | 'json';
  width: number;         // 端末幅（切り詰め用）
  limit?: number;        // --limit
}
```

## 記号・色・exit code（design-system-mapping 参照）

- 記号: `●`todo `◐`in-progress `✓`done `◷`waiting `⊘`cancelled。exit: 0/1/2。

## 依存・境界

- **TaskService**（唯一の呼び先, コア共有）。OutputFormatter は本 unit 内（CLI 表示専用）。ビジネスロジック・ファイル I/O は持たない。

<!-- Text fallback: U-cliはドメインエンティティを持たないアダプタ。commanderのコマンド定義(add/list/show/update/start|done|wait|cancel/state/search/delete/archive/config)を各TaskServiceメソッドへ配線。RenderOpts(color/relative/format/width/limit)で表示制御。記号・色・exit codeはdesign-system-mapping準拠。TaskServiceのみに依存しI/Oは持たない。 -->

## Coverage

- 人間向け全ワークフローの入口（US-1〜5, 7, T.2）。MCP と同一 TaskService を共有し挙動一致（結合テストで担保）。
