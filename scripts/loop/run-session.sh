#!/usr/bin/env bash
#
# 1 つの LLM セッションを起動して、指定したループコマンドを 1 回だけ実行する。
#
# 使い方:
#   run-session.sh <opus|fable|astra> <コマンド名> <引数> <ログファイル>
#
#   コマンド名は .claude/commands/<コマンド名>.md（loop-implement / loop-fix-ci / loop-fix-main / loop-resolve-coderabbit）。
#   opus / fable は Claude Code、astra は Codex CLI で実行する。
#   セッションの出力は整形してログファイルに追記する。結果の解釈（LOOP_RESULT 行の解析）は呼び出し側が行う。

set -uo pipefail

model="$1"
command_name="$2"
argument="$3"
log_file="$4"

run_claude() {
  # stream-json を jq で進捗行に整形して流す（そのままだと完了まで無出力で不安になる）
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
        "[\(ts)] セッション終了 (subtype: \($e.subtype // "?"), turns: \($e.num_turns // "?"), cost: $\($e.total_cost_usd // 0))"
        + (if ($e.errors // []) | length > 0 then "\nerrors: \($e.errors | tojson)" else "" end)
        + "\n\($e.result // "")"
      else empty
      end'

  claude -p "/$command_name $argument" --model "$model" --dangerously-skip-permissions \
    --verbose --output-format stream-json 2>&1 \
    | jq --unbuffered -Rr "$jq_progress" \
    | tee -a "$log_file"
}

run_codex() {
  # スラッシュコマンドは Claude Code の機能なので、Codex には手順書を読んで従うよう指示する
  local prompt
  prompt="あなたはループエンジニアリングの 1 セッションを実行するエージェントです。
まず docs/loop-session-rules.md を読み、次に .claude/commands/$command_name.md を読んで、その手順を実行してください。

- 手順書中の \$ARGUMENTS は「$argument」に読み替えること
- ファイル冒頭の frontmatter（allowed-tools 等）は Claude Code 用の設定なので無視してよい
- 「現在の状況」セクションの !\`コマンド\` は自動展開されないので、各コマンドを自分で実行して状況を把握すること
- 最後に必ず LOOP_RESULT 行を出力すること"

  # stdin を閉じて渡す: codex exec は stdin が TTY でないと追加入力として読み込もうとする
  codex exec --model gpt-6-astra --dangerously-bypass-approvals-and-sandbox \
    "$prompt" </dev/null 2>&1 | tee -a "$log_file"
}

case "$model" in
  opus|fable) run_claude ;;
  astra) run_codex ;;
  *) echo "usage: $0 <opus|fable|astra> <command> <argument> <log_file>" >&2; exit 1 ;;
esac
