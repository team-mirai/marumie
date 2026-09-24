#!/usr/bin/env bash
# Vercel への本番デプロイ（Deploy Production ワークフローから呼ばれる）
#
# 使い方: scripts/vercel-deploy-production.sh <アプリ名> <本番ドメイン>
# 必要な環境変数: VERCEL_TOKEN / VERCEL_ORG_ID / VERCEL_PROJECT_ID
#
# CLI からの `vercel deploy --prod` は *.vercel.app のプロジェクトエイリアスにしか
# 付け替わらず、カスタムドメインは Git 連携経由の本番デプロイを指したまま動かない。
# そのためデプロイ後に promote でドメインを明示的に付け替え、さらに本番ドメインが
# 今回のデプロイを指したことまで検証する（検証しないと、ドメインが何週間も古い
# デプロイのままでもワークフローは「成功」してしまう）。
set -euo pipefail

app="${1:?アプリ名を指定してください}"
domain="${2:?本番ドメインを指定してください}"
: "${VERCEL_TOKEN:?VERCEL_TOKEN が必要です}"
# deploy は VERCEL_ORG_ID / VERCEL_PROJECT_ID からリンク先を解決するが、
# promote / inspect はこれらを見ず CLI の既定スコープ（個人アカウント）を使うため、
# 明示的に指定しないと "Not authorized: Trying to access resource under scope ..." で失敗する
: "${VERCEL_SCOPE:?VERCEL_SCOPE（チームのスラッグ）が必要です}"

# --build-env MANUAL_DEPLOY=1 が ignoreCommand の条件を満たし、
# Git 連携によるビルドはスキップしたまま CLI からのデプロイのみ通す
#
# Root Directory (webapp / admin) は Vercel のプロジェクト設定側で
# 適用されるため --cwd は指定しない（指定するとパスが二重になる）
deployment_url="$(
  vercel deploy --prod --yes --no-color \
    --build-env MANUAL_DEPLOY=1 \
    --token "$VERCEL_TOKEN" | tail -n 1
)"

if [[ "$deployment_url" != https://* ]]; then
  echo "::error::${app}: デプロイ URL を取得できませんでした（取得値: '${deployment_url}'）"
  exit 1
fi
echo "${app}: deployed ${deployment_url}"

vercel promote "$deployment_url" --yes --no-color --scope "$VERCEL_SCOPE" --token "$VERCEL_TOKEN"

# promote の反映を待ちつつ、本番ドメインの現在のデプロイを確認する。
# `vercel inspect <ドメイン>` はそのドメインが指すデプロイの情報を返し、
# General セクションの `url` 行がデプロイ URL になる
current=""
for attempt in 1 2 3; do
  current="$(
    vercel inspect "https://${domain}" --no-color --scope "$VERCEL_SCOPE" --token "$VERCEL_TOKEN" 2>&1 |
      awk '$1 == "url" { print $2; exit }'
  )"
  if [ "$current" = "$deployment_url" ]; then
    echo "${app}: https://${domain} -> ${deployment_url}"
    if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
      echo "- ${app}: https://${domain} -> ${deployment_url}" >>"$GITHUB_STEP_SUMMARY"
    fi
    exit 0
  fi
  echo "${app}: ドメインの反映待ち (${attempt}/3) 現在: '${current:-unknown}'"
  sleep 5
done

echo "::error::${app}: promote 後も https://${domain} が ${deployment_url} を指していません（現在: '${current:-unknown}'）"
exit 1
