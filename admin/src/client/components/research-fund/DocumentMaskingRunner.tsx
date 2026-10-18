"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { processDocumentMasking } from "@/server/contexts/research-fund/presentation/actions/manage-document-masking";

/** 未作成の版が残っている間、次の作成を呼ぶまでの間隔（ミリ秒） */
const POLL_INTERVAL_MS = 3000;
/** 失敗が続いたときに止めるまでの回数（通信の失敗などで呼び続けないため） */
const MAX_CONSECUTIVE_ERRORS = 3;

/**
 * 帳簿の画面を開いている間、書類の公開用の版を裏で作り進める（#1802）。画面には何も出さない。
 *
 * キュー基盤は使わず、未作成の版が残っている間（unfinished > 0）作成の処理を繰り返し呼ぶ。読み取りとは別に進む。
 * 書類が登録されると画面が取り直されて unfinished が増えるので、そこで再び動き出す。
 */
export function DocumentMaskingRunner({
  politicianId,
  bookId,
  unfinished,
}: {
  politicianId: string;
  bookId: string;
  /** 読み込んだ時点の、公開用の版が未作成・作成中の書類の数。書き込めない利用者では 0 */
  unfinished: number;
}) {
  const [running, setRunning] = useState(unfinished > 0);
  const [processing, setProcessing] = useState(false);
  const errors = useRef(0);

  // 書類が登録されて未作成の版が増えたら、止まっていても再び動き出す
  useEffect(() => {
    if (unfinished > 0) {
      errors.current = 0;
      setRunning(true);
    }
  }, [unfinished]);

  const process = useCallback(async () => {
    setProcessing(true);
    try {
      const result = await processDocumentMasking(politicianId, bookId);
      if (!result.success) throw new Error(result.error);
      // 版を作ったときは、処理の側の再検証で画面が取り直され、書類の状態が更新される
      errors.current = 0;
      if (!result.hasMore) setRunning(false);
    } catch {
      // 裏で動く処理なので通知はしない。続けて失敗したら止め、次に書類が登録されたときに再開する
      errors.current += 1;
      if (errors.current >= MAX_CONSECUTIVE_ERRORS) setRunning(false);
    } finally {
      setProcessing(false);
    }
  }, [politicianId, bookId]);

  useEffect(() => {
    if (!running || processing) return;
    const timer = setTimeout(() => {
      void process();
    }, POLL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [running, processing, process]);

  return null;
}
