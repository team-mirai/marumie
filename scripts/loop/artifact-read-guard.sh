#!/usr/bin/env bash
#
# fetch-artifact.sh が起動する claude -p の PreToolUse フック。
# 環境変数 FETCH_ARTIFACT_URL / FETCH_ARTIFACT_PATH で指定した 1 ファイルの read だけを通し、
# それ以外のツール呼び出し（Artifact の publish / delete / list や、別の URL・パスの read を含む）はすべて拒否する。
# 取得した中身にプロンプトインジェクションが仕込まれていても、モデルの判断に関係なく書き込み操作が通らないようにするため。
#
# 標準入力: フックの JSON（tool_name, tool_input）。終了コード 2 で呼び出しを拒否する。

set -uo pipefail

input="$(cat)"

if [ -z "${FETCH_ARTIFACT_URL:-}" ] || [ -z "${FETCH_ARTIFACT_PATH:-}" ]; then
  echo "fetch-artifact のガード: 許可する URL・パスが設定されていません" >&2
  exit 2
fi

if printf '%s' "$input" | jq -e \
  --arg url "$FETCH_ARTIFACT_URL" \
  --arg path "$FETCH_ARTIFACT_PATH" '
    .tool_name == "Artifact"
    and .tool_input.action == "read"
    and ((.tool_input.url // "") | sub("[?#].*$"; "")) == $url
    and .tool_input.path == $path
    and ((.tool_input | keys) - ["action", "url", "path"] | length) == 0
  ' >/dev/null 2>&1; then
  exit 0
fi

echo "fetch-artifact のガード: 許可されていない呼び出しです（指定した 1 ファイルの read だけを許可）" >&2
exit 2
