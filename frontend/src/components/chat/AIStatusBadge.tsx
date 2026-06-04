"use client";

import { CheckCircle2, AlertTriangle, WifiOff, Loader2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export type AIStatus = {
  status: "generating" | "done" | "rate_limited" | "no_credits" | "search_only" | "error";
  provider?: string;
  model?: string;
  reason?: string;
};

const statusConfig = {
  generating: {
    icon: Loader2,
    label: "Generating…",
    className: "ai-badge-generating",
    iconClass: "animate-spin",
  },
  done: {
    icon: CheckCircle2,
    label: "AI Response Generated",
    className: "ai-badge-done",
    iconClass: "",
  },
  rate_limited: {
    icon: AlertTriangle,
    label: "Rate Limited",
    className: "ai-badge-warn",
    iconClass: "",
  },
  no_credits: {
    icon: AlertTriangle,
    label: "No Credits",
    className: "ai-badge-error",
    iconClass: "",
  },
  search_only: {
    icon: WifiOff,
    label: "Search Only Mode",
    className: "ai-badge-muted",
    iconClass: "",
  },
  error: {
    icon: AlertTriangle,
    label: "Error",
    className: "ai-badge-error",
    iconClass: "",
  },
};

const AIStatusBadge = ({ aiStatus }: { aiStatus: AIStatus }) => {
  const cfg = statusConfig[aiStatus.status];
  const Icon = cfg.icon;

  const providerLabel =
    aiStatus.status === "rate_limited" && aiStatus.provider
      ? `${aiStatus.provider} · Rate Limited`
      : aiStatus.status === "no_credits" && aiStatus.provider
      ? `${aiStatus.provider} · No Credits`
      : aiStatus.status === "generating" && aiStatus.provider
      ? `Via ${aiStatus.provider}`
      : aiStatus.status === "done" && aiStatus.provider
      ? `Via ${aiStatus.provider}`
      : cfg.label;

  return (
    <div className={cn("ai-status-badge", cfg.className)} title={aiStatus.reason}>
      <Icon size={11} className={cn("flex-shrink-0", cfg.iconClass)} />
      <span>{providerLabel}</span>
      {aiStatus.status === "generating" && (
        <Zap size={9} className="text-blue-400 animate-pulse" />
      )}
    </div>
  );
};

export default AIStatusBadge;
