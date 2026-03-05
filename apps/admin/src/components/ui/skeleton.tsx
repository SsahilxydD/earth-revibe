"use client";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-light-gray rounded-md ${className}`}
      aria-hidden="true"
    />
  );
}
