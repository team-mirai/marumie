"use client";
import "client-only";

import { useEffect, useRef, useState } from "react";

interface AboutLoopVideoProps {
  src: string;
  poster: string;
  width: number;
  height: number;
  /** 動画の中身の説明（読み上げ用） */
  label: string;
  className?: string;
}

/**
 * 説明用の短い動画。ミュート・ループで自動再生する。
 * 「動きを減らす」設定の人には自動再生せず止めておき、コントロールを出して自分で再生できるようにする。
 */
export default function AboutLoopVideo({
  src,
  poster,
  width,
  height,
  label,
  className = "",
}: AboutLoopVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    setReduceMotion(reduce);
    if (reduce) {
      video.pause();
      return;
    }
    // 自動再生をブラウザに止められたときは、ポスター画像のままにする
    video.play()?.catch(() => {});
  }, []);

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster}
      width={width}
      height={height}
      muted
      loop
      playsInline
      preload="metadata"
      controls={reduceMotion}
      aria-label={label}
      className={className}
    />
  );
}
