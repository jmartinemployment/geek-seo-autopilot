"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, MousePointerClick, Eye, Percent } from "lucide-react";

interface AnalyticsData {
  summary: {
    clicks: number;
    impressions: number;
    avgPosition: number;
    ctr: number;
  };
  trend: Array<{
    date: string;
    clicks: number;
    impressions: number;
  }>;
  topPages: Array<{ page: string; clicks: number; impressions: number }>;
  topKeywords: Array<{ keyword: string; clicks: number; position: number }>;
}

export function AnalyticsClient({
  siteId,
  siteName,
}: {
  siteId: string;
  siteName: string;
}) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`/api/seo/analytics/${siteId}`)
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, [siteId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-slate-500">
        No analytics data available.
      </div>
    );
  }

  const stats = [
    {
      label: "Total Clicks",
      value: data.summary.clicks.toLocaleString(),
      icon: MousePointerClick,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Impressions",
      value: data.summary.impressions.toLocaleString(),
      icon: Eye,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Avg Position",
      value: data.summary.avgPosition.toFixed(1),
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "CTR",
      value: `${data.summary.ctr.toFixed(1)}%`,
      icon: Percent,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Analytics</h2>
        <p className="text-slate-500 mt-1">{siteName} · Last 30 days</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-xs text-slate-500">{stat.label}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Traffic Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) =>
                  new Date(v).toLocaleDateString("en", {
                    month: "short",
                    day: "numeric",
                  })
                }
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value, name) => [
                  value,
                  name === "clicks" ? "Clicks" : "Impressions",
                ]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="clicks"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="impressions"
                stroke="#a855f7"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top pages */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Pages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.topPages.map((page, i) => (
                <div key={i} className="flex justify-between text-sm py-1">
                  <span className="text-slate-700 truncate mr-4">
                    {page.page}
                  </span>
                  <span className="text-slate-500 shrink-0">
                    {page.clicks} clicks
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top keywords */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Keywords</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.topKeywords.map((kw, i) => (
                <div key={i} className="flex justify-between text-sm py-1">
                  <span className="text-slate-700 truncate mr-4">
                    {kw.keyword}
                  </span>
                  <div className="flex gap-3 shrink-0 text-slate-500">
                    <span>#{kw.position.toFixed(1)}</span>
                    <span>{kw.clicks} clicks</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
