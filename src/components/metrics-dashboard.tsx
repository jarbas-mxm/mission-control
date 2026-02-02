"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { cn } from "@/lib/utils";

interface MetricsSummary {
  days: number;
  totalTokens: number;
  totalCost: number;
  avgDailyTokens: number;
  avgDailyCost: number;
  trend: number;
  dataPoints: number;
  latestDate: string | null;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000_000) {
    return `${(tokens / 1_000_000_000).toFixed(1)}B`;
  }
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toString();
}

function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`;
}

function TrendBadge({ trend }: { trend: number }) {
  const isUp = trend > 0;
  const isNeutral = trend === 0;
  
  return (
    <span
      className={cn(
        "inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full",
        isNeutral && "bg-stone-100 text-stone-600",
        isUp && "bg-red-100 text-red-700",
        !isUp && !isNeutral && "bg-green-100 text-green-700"
      )}
    >
      {isNeutral ? "→" : isUp ? "↑" : "↓"} {Math.abs(trend)}%
    </span>
  );
}

function MetricCard({
  label,
  value,
  subValue,
  icon,
  trend,
}: {
  label: string;
  value: string;
  subValue?: string;
  icon: string;
  trend?: number;
}) {
  return (
    <div className="bg-white border border-stone-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className="text-2xl">{icon}</div>
        {trend !== undefined && <TrendBadge trend={trend} />}
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-stone-800">{value}</div>
        <div className="text-sm text-stone-500 mt-1">{label}</div>
        {subValue && (
          <div className="text-xs text-stone-400 mt-0.5">{subValue}</div>
        )}
      </div>
    </div>
  );
}

function MetricsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-white border border-stone-200 rounded-lg p-4 animate-pulse"
        >
          <div className="w-8 h-8 bg-stone-200 rounded-lg" />
          <div className="mt-3">
            <div className="h-7 w-20 bg-stone-200 rounded" />
            <div className="h-4 w-16 bg-stone-100 rounded mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MetricsDashboard({ collapsed = false }: { collapsed?: boolean }) {
  const summary = useQuery(api.metrics.summary, { days: 7 });
  const recentMetrics = useQuery(api.metrics.list, { type: "daily", limit: 7 });
  
  if (collapsed) {
    // Versão compacta para header
    if (!summary) {
      return (
        <div className="flex items-center gap-4 text-sm text-stone-400">
          <span className="animate-pulse">Loading metrics...</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-4 text-sm">
        <span className="text-stone-600">
          <span className="font-medium">{formatTokens(summary.totalTokens)}</span>{" "}
          <span className="text-stone-400">tokens</span>
        </span>
        <span className="text-stone-300">•</span>
        <span className="text-stone-600">
          <span className="font-medium">{formatCost(summary.totalCost)}</span>{" "}
          <span className="text-stone-400">/ 7d</span>
        </span>
        <TrendBadge trend={summary.trend} />
      </div>
    );
  }
  
  if (!summary) {
    return <MetricsSkeleton />;
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-600 uppercase tracking-wide">
          Usage Metrics
        </h3>
        <span className="text-xs text-stone-400">
          Last 7 days • {summary.dataPoints} data points
        </span>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          icon="🎯"
          label="Total Tokens"
          value={formatTokens(summary.totalTokens)}
          subValue={`~${formatTokens(summary.avgDailyTokens)}/day`}
          trend={summary.trend}
        />
        <MetricCard
          icon="💰"
          label="Total Cost"
          value={formatCost(summary.totalCost)}
          subValue={`~${formatCost(summary.avgDailyCost)}/day`}
        />
        <MetricCard
          icon="📊"
          label="Daily Average"
          value={formatTokens(summary.avgDailyTokens)}
          subValue="tokens/day"
        />
        <MetricCard
          icon="📅"
          label="Latest Update"
          value={summary.latestDate ?? "—"}
          subValue="last sync"
        />
      </div>
      
      {/* Mini chart - últimos 7 dias */}
      {recentMetrics && recentMetrics.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-lg p-4">
          <div className="text-xs text-stone-500 mb-3">Token usage (7 days)</div>
          <div className="flex items-end gap-1 h-16">
            {recentMetrics
              .slice()
              .reverse()
              .map((m, i) => {
                const maxTokens = Math.max(...recentMetrics.map((x) => x.totalTokens));
                const height = maxTokens > 0 ? (m.totalTokens / maxTokens) * 100 : 0;
                return (
                  <div
                    key={m._id}
                    className="flex-1 bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
                    style={{ height: `${Math.max(height, 4)}%` }}
                    title={`${m.date}: ${formatTokens(m.totalTokens)}`}
                  />
                );
              })}
          </div>
          <div className="flex justify-between text-xs text-stone-400 mt-2">
            <span>{recentMetrics[recentMetrics.length - 1]?.date}</span>
            <span>{recentMetrics[0]?.date}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function MetricsCompact() {
  return <MetricsDashboard collapsed />;
}
