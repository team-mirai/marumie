#!/usr/bin/env bash
#
# ループエンジニアリング: 1回だけループを実行する
#
# 毎回まっさらなエージェントセッションで手順書（.claude/commands/loop-once.md）を実行する。
#
# 使い方:
#   ./scripts/loop-once.sh [モデル]
#
# モデル:
#   opus   (デフォルト) Claude Code (claude -p /loop-once --model opus)
#   fable  Claude Code (claude -p /loop-once --model fable)
#   astra  Codex CLI (codex exec --model gpt-6-astra)
#
# 環境変数:
#   LOOP_LOG_FILE  ログの出力先（未指定なら .loop/logs/single-<時刻>.log）
#
# 終了コード:
#   0 = SUCCESS（PR作成まで完了）
#   1 = FAILED（環境起因などの失敗）
#   2 = NO_TASK（loop:ready のIssueがない）
#   3 = BLOCKED（Issue側にエスカレーション済み。次のタスクには進める）

set -uo pipefail

# 本体を main() に包み、bashに実行前へ全体をパースさせる。
# 実行中にこのファイル自体が書き換わっても、読み込み済みの定義で最後まで走る。
main() {
  cd "$(cd "$(dirname "$0")/.." && pwd)"

  # --- 引数: モデルの検証 ---
  model="${1:-opus}"
  case "$model" in
    opus|fable) ;;
    astra)
      if ! command -v codex >/dev/null 2>&1; then
        echo "[loop-once] astra には Codex CLI が必要です (npm install -g @openai/codex)。中断します。" >&2
        exit 1
      fi
      ;;
    *)
      echo "usage: $0 [opus|fable|astra]" >&2
      exit 1
      ;;
  esac

  # --- 前処理: 作業ツリーの状態確認 ---
  if [[ -n "$(git status --porcelain)" ]]; then
    branch="$(git branch --show-current)"
    if [[ "$branch" == loop/* ]]; then
      # 前のループが中断して残した作業。退避してmainに戻る
      echo "[loop-once] 前ループの残骸を退避します: $branch"
      git stash push -u -m "loop-abandoned:$branch:$(date +%Y%m%d-%H%M%S)"
      git checkout main
    else
      echo "[loop-once] 作業ツリーが汚れています (branch: $branch)。中断します。" >&2
      exit 1
    fi
  fi

  # --- タスク残数の確認 ---
  ready_count="$(gh issue list --label 'loop:ready' --state open --json number --jq 'length')"
  if [[ "$ready_count" -eq 0 ]]; then
    echo "[loop-once] LOOP_RESULT: NO_TASK (loop:ready のIssueがありません)"
    exit 2
  fi

  log_file="${LOOP_LOG_FILE:-.loop/logs/single-$(date +%Y%m%d-%H%M%S).log}"
  mkdir -p "$(dirname "$log_file")"

  echo "[loop-once] 開始 (モデル: $model, 残タスク: $ready_count 件) → $log_file"

  if [[ "$model" == "astra" ]]; then
    run_astra
  else
    run_claude "$model"
  fi

  result="$(grep -Eo 'LOOP_RESULT: [A-Z_]+[^\r]*' "$log_file" | tail -1 || true)"
  if [[ -z "$result" ]]; then
    result="LOOP_RESULT: FAILED reason=no-result-line"
  fi
  echo "[loop-once] $result"

  case "$result" in
    "LOOP_RESULT: SUCCESS"*) exit 0 ;;
    "LOOP_RESULT: NO_TASK"*) exit 2 ;;
    "LOOP_RESULT: BLOCKED"*) exit 3 ;;
    *) exit 1 ;;
  esac
}

run_claude() { # $1: claudeのモデルエイリアス (opus / fable)
  # stream-json をjqで進捗行に整形して流す（そのままだと完了まで無出力で不安になる）。
  # 整形後のテキストをログに残すので、LOOP_RESULT のgrepは従来どおり効く。
  local jq_progress='
    def ts: now | strflocaltime("%H:%M:%S");
    def summary:
      (.command // .file_path // .description // .prompt // .pattern // tojson)
      | tostring | gsub("\\s+"; " ") | .[0:150];
    (try fromjson catch null) as $e
    | if $e == null then .
      elif $e.type == "system" and $e.subtype == "init" then
        "[\(ts)] セッション開始 (model: \($e.model // "?"))"
      elif $e.type == "assistant" then
        ([$e.message.content[]?
          | if .type == "text" then (.text | select(length > 0))
            elif .type == "tool_use" then "[\(ts)] → \(.name): \(.input | summary)"
            else empty
            end
         ] | select(length > 0) | join("\n"))
      elif $e.type == "result" then
        "[\(ts)] セッション終了 (turns: \($e.num_turns // "?"), cost: $\($e.total_cost_usd // 0))\n\($e.result // "")"
      else empty
      end'

  if command -v jq >/dev/null 2>&1; then
    claude -p "/loop-once" --model "$1" --dangerously-skip-permissions \
      --verbose --output-format stream-json 2>&1 \
      | jq --unbuffered -Rr "$jq_progress" \
      | tee "$log_file"
  else
    echo "[loop-once] jq が見つからないため進捗表示なしで実行します" >&2
    claude -p "/loop-once" --model "$1" --dangerously-skip-permissions 2>&1 | tee "$log_file"
  fi
}

run_astra() {
  # /loop-once は Claude Code のスラッシュコマンドなので、Codex には手順書を読んで従うよう指示する。
  # 手順書中の frontmatter や !`コマンド` 展開は Claude Code 専用機能のため、扱い方を明示する。
  local prompt='あなたはループエンジニアリングの1イテレーションを実行するエージェントです。
.claude/commands/loop-once.md を読み、その手順に従って1イテレーションを実行してください。

- ファイル冒頭の frontmatter（allowed-tools 等）は Claude Code 用の設定なので無視してよい
- 「現在の状況」セクションの !`コマンド` は自動展開されないので、各コマンドを自分で実行して状況を把握すること
- 最後に必ず LOOP_RESULT 行を出力すること'

  # stdin を閉じて渡す: codex exec は stdin がTTYでないと追加入力として読み込もうとする
  codex exec --model gpt-6-astra --dangerously-bypass-approvals-and-sandbox \
    "$prompt" </dev/null 2>&1 | tee "$log_file"
}

main "$@"
