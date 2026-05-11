"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Props = {
  imageUrl?: string | null;
  emoji?: string;
  alt?: string;
  className?: string;
  emojiClassName?: string;
};

export function ProductAvatar({
  imageUrl,
  emoji = "📦",
  alt = "",
  className,
  emojiClassName,
}: Props) {
  if (imageUrl) {
    return (
      <div className={cn("overflow-hidden rounded-lg bg-muted", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={alt}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }
  return (
    <div
      className={cn(
        "grid place-items-center rounded-lg bg-muted",
        className,
        emojiClassName,
      )}
    >
      <span>{emoji}</span>
    </div>
  );
}
