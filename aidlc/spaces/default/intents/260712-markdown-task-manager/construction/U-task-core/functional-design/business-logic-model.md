# Business Logic Model — U-task-core

> Construction / functional-design（unit: U-task-core）。上流参照: `../../../inception/units-generation/unit-of-work.md`（unit-of-work）, `../../../inception/units-generation/unit-of-work-story-map.md`, `../../../inception/requirements-analysis/requirements.md`（requirements）, `../../../inception/application-design/components.md`（components）, `../../../inception/application-design/component-methods.md`（component-methods）, `../../../inception/application-design/services.md`（services）。
> 対象: ConfigManager / TaskRepository / FrontmatterCodec / TaskModel。全 I/O の単一境界。

## 1. ファイル名生成アルゴリズム（create）

```
generateFilename(title, createdDate, existing):
  slug = slugify(title)            # 空白→'-', OS禁止文字除去, 前後trim, 連続'-'圧縮
  base = `${YYYYMMDD(createdDate)}-${slug}`
  name = base
  n = 2
  while exists(tasksDir/`${name}.md`) in existing:   # 衝突回避(FR-A4)
    name = `${base}-${n}`; n++
  return name                       # ref = name（拡張子なし）
```
- slug が空（記号のみ等）→ `untitled` を用いる。ref はファイル名 stem＝タイトル兼参照キー（FR-A1, id 不使用）。

## 2. 参照解決アルゴリズム（resolveRef, FR-D5）

```
resolveRef(input, allRefs):
  if input in allRefs: return Ok(input)               # 完全一致優先
  matches = allRefs.filter(r => r.includes(input) or titleOf(r).includes(input))  # 部分一致
  if matches.length == 1: return Ok(matches[0])
  if matches.length == 0: return Err(not-found)
  return Err(ambiguous(candidates=matches))           # 候補提示（エラーにせず選ばせる）
```

## 3. 原子的書込シーケンス（write / create, NFR-1）

```
atomicWrite(path, content):
  tmp = `${path}.tmp-${pid}-${rand}`
  writeFile(tmp, content, utf8)
  fsync(tmp)               # 可能なら
  rename(tmp, path)        # 原子的置換
  on error: unlink(tmp); return Err(io)
```
- 部分書込による破損を防ぐ。ディレクトリ未存在時は先に mkdir -p（tasksDir/trashDir/archiveDir）。

## 4. frontmatter デコード/エンコード（FrontmatterCodec）

```
decode(raw, ref):
  { data, content } = grayMatter(raw)     # frontmatter 無し→ data={}, content=raw（正常, NFR-2）
  task = mapKnownFields(data)             # 既知フィールドのみ解釈
  task.raw = data                          # 未知フィールド保持
  task.ref = ref; task.title = titleFromRef(ref); task.body = content
  return validate(task)

encode(task):
  known = pickKnownFields(task)            # tags/created/updated/type/status/priority/project/due/repeat/parent/last_done
  merged = { ...task.raw, ...known }       # 未知フィールドを温存しつつ既知を上書き
  return grayMatter.stringify(task.body, merged)
```

## 5. ロード/列挙フロー

```
list():
  files = readdir(tasksDir).filter(*.md)          # .trash/・archive は別ディレクトリなので自然に除外
  return files.map(f => decode(read(f), stem(f)))  # 壊れた1件は skip せず io エラーを集約（呼び出し側で扱う）
```

## 6. 移動プリミティブ（trash/archive の下請け）

```
moveToTrash(ref): move(tasksDir/`${ref}.md`, trashDir/`${ref}.md`)   # ソフト削除の実体（U-delete-archive が利用）
moveToArchive(ref): move(tasksDir/`${ref}.md`, archiveDir/`${ref}.md`)
```
- move は copy→fsync→unlink かつ衝突時サフィックス（trash 内で同名既存なら `-n`）。

## 7. 設定ロード（ConfigManager）

```
load(): read ~/.config/marktask/config.yaml (XDG)  # 無ければ既定(tasksDir=./tasks, trash=tasks/.trash, archive=archive)
resolvePaths(): { tasksDir, trashDir, archiveDir }  # 相対は vault ルート基準で絶対化
```

<!-- Text fallback: U-task-coreの中核アルゴリズム: ファイル名=日付+slug(衝突時サフィックス)、参照解決=完全一致→部分一致→候補、書込=temp→rename原子的、frontmatterはgray-matterでdecode/encodeし未知フィールド保持、listはtasksDir配下の.mdを読む(.trash/archiveは別ディレクトリで除外)、trash/archiveは移動プリミティブ、configはXDG YAML。 -->

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-07-12T12:36:32Z
**Iteration:** 1

### Strengths

1. **Complete business logic coverage with algorithmic precision**: All six algorithms (filename generation, reference resolution, atomic write, frontmatter codec, list/enumerate, move primitives) map 1:1 to the component-methods.md signatures and provide implementable pseudocode. The filename collision-avoidance loop (FR-A4), ref-resolution fallback chain (FR-D5), and temp→rename atomicity (NFR-1) are concrete enough for a developer to implement without guessing. The slug sanitization rule ("OS禁止文字除去, 前後trim, 連続'-'圧縮") specifies the transformation precisely.

2. **Atomic write sequence is production-grade**: The temp→fsync→rename sequence (§3) with `pid+rand` unique suffix and error-path cleanup (`on error: unlink(tmp)`) is the canonical pattern for avoiding partial writes. The "ディレクトリ未存在時は先に mkdir -p" guard ensures idempotent directory creation. This directly implements NFR-1. The note "fsync 可能なら" acknowledges platform variation without requiring fsync for correctness — a pragmatic choice for mvp Standard depth.

3. **Reference resolution disambiguation is user-centered**: The §2 algorithm (exact-match priority → partial-match fallback → candidate list on ambiguity) matches FR-D5 and the "エラーにせず選ばせる" policy from requirements Q5=C. The `Err(ambiguous(candidates=matches))` return type (per component-methods.md AppError) provides the UI surface for CLI/MCP to present choices. This avoids the overconfidence trap (throwing a generic "not found" error when partial matches exist) — the design respects user intent.

4. **Non-destructive codec with raw-field preservation**: The decode/encode pair (§4) explicitly preserves `task.raw` for unknown frontmatter fields and states "frontmatter 無し→ data={}, content=raw（正常, NFR-2）" — non-YAML files pass through without breakage. The `mapKnownFields` / `pickKnownFields` pattern ensures the codec interprets only the 11 known fields (tags through last_done) and leaves everything else untouched, implementing NFR-2's "既存MD非破壊" contract. The encode merge `{ ...task.raw, ...known }` writes back unknown fields verbatim, satisfying the preservation invariant INV2.

5. **Strict boundary adherence — no cross-unit logic leak**: The §6 move primitives are explicitly labeled "trash/archive の下請け（U-delete-archive が利用）" and provide only the move operation, not the delete/archive semantics. The design correctly defers the `delete=soft-delete to .trash/` vs `archive=preservation to archiveDir` distinction to U-delete-archive, as unit-of-work.md specifies. Similarly, business-rules.md R7 states "repeat は文字列（任意）。記法検証は U-recurrence の責務（task-core は素通し保持）" and R6 states "parent は wikilink 文字列。値の存在検証は U-subtasks の責務（ここでは形式のみ）" — task-core owns the I/O primitives, not the domain semantics of repeat/parent/guard. The boundary is clean and testable in isolation.

6. **List operation naturally excludes deleted/archived by design**: The §5 list flow "files = readdir(tasksDir).filter(*.md)" with the note ".trash/・archive は別ディレクトリなので自然に除外" implements FR-F4 without special filtering logic — the directory structure (trash at `tasks/.trash/`, archive at separate `archiveDir`) ensures deleted/archived files are physically isolated. This is architecturally sound: exclusion is a structural property, not a runtime filter that could be accidentally bypassed.

7. **Config resolution with safe defaults**: The §7 ConfigManager "無ければ既定(tasksDir=./tasks, trash=tasks/.trash, archive=archive)" and "相対は vault ルート基準で絶対化" rules implement FR-A3 and business-rules.md R13. The XDG `~/.config/marktask/config.yaml` path matches ADR-6 and the component-methods.md C1 signature. The default values provide a zero-config startup path for mvp, while allowing user override via the `config` command.

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Minor | §1 generateFilename | "slug が空（記号のみ等）→ `untitled` を用いる" is stated but the exact trigger condition (empty after slugify) is implicit | Clarify in code-generation: `untitled` fallback triggers when `slugify(title).length == 0`. The business logic is sound (avoid empty filenames) but the predicate should be explicit to prevent edge-case bugs (e.g., title=" " → slug="" after trim). Not blocking — a developer can infer the rule, but explicit is safer |
| 2 | Minor | §2 resolveRef, §5 list | list notes "壊れた1件は skip せず io エラーを集約（呼び出し側で扱う）" but resolveRef doesn't state how it handles decode errors when scanning for partial matches | Confirm in code-generation: if `decode(read(f))` fails during resolveRef's partial-match scan, should the file be skipped (log warning) or should resolveRef fail-fast with `Err(io)`? The §5 note says "呼び出し側で扱う" (caller handles), suggesting errors bubble up. Recommendation: resolveRef should collect decode failures and either (a) skip them with a warning if at least one valid match exists, or (b) fail if no valid files can be scanned. This is an error-handling edge case, not a core logic flaw |
| 3 | Minor | §6 move primitives | "move は copy→fsync→unlink かつ衝突時サフィックス（trash 内で同名既存なら `-n`）" — the same-name collision rule for .trash/ is stated but the suffix pattern (e.g., `20260712-report.md` → `20260712-report-2.md` in trash) differs from the create-time collision pattern (base name increments) | Clarify in code-generation: should trash collision suffix be `-2`, `-3`... (matching create's pattern) or a timestamp/unique suffix? The "trash 内で同名既存なら `-n`" note implies incrementing, but the distinction between "base name increments during create" vs "trash name increments during move" should be explicit. Risk: moving the same task to trash twice (delete, restore, delete again) needs deterministic naming. Acceptable for Standard depth to defer exact rule to code-generation, but flag as a cross-operation consistency point |

### Summary

The business logic is **implementable without architectural guidance beyond this document**. A developer can:
- Generate unique filenames with slug sanitization and collision-avoidance (§1)
- Resolve task references with exact→partial→disambiguation fallback (§2)
- Write files atomically via temp→rename (§3)
- Decode/encode frontmatter while preserving unknown fields (§4)
- List tasks with natural exclusion of deleted/archived (§5)
- Provide move primitives for delete/archive adapters (§6)
- Load config with XDG paths and safe defaults (§7)

All algorithms trace cleanly to component-methods.md signatures (C1.resolvePaths, C2.create/list/moveToTrash, C3.decode/encode, config load). The boundary discipline is exemplary: U-task-core owns the I/O primitives (files, directories, atomic writes) but defers domain semantics (repeat parsing to U-recurrence, parent guard to U-subtasks, delete/archive distinction to U-delete-archive) to their owning units. The design respects NFR-1 (atomic writes), NFR-2 (non-destructive codec), and FR-A1/A4/D5 (filename/ref rules).

The three findings are code-generation clarifications (untitled predicate, decode error handling during resolveRef, trash collision suffix) that do not expose architectural unsoundness. A developer can proceed with high confidence and resolve these edge cases during implementation without revisiting the functional design.

**READY to advance to NFR requirements stage.**
