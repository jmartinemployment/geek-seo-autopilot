"use client";

import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CalendarItem {
  id: string;
  keyword: string;
  scheduledAt: Date;
  status: string;
  articleId: string | null;
}

interface CalendarClientProps {
  siteId: string;
  siteName: string;
  initialItems: CalendarItem[];
}

export function CalendarClient({
  siteId: _siteId,
  siteName,
  initialItems,
}: CalendarClientProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [items] = useState<CalendarItem[]>(initialItems);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad to start on Monday
  const startDay = monthStart.getDay();
  const paddingDays = startDay === 0 ? 6 : startDay - 1;

  function getItemsForDay(date: Date) {
    return items.filter((item) => isSameDay(new Date(item.scheduledAt), date));
  }

  function prevMonth() {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  }

  function nextMonth() {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  }

  const STATUS_COLOR: Record<string, string> = {
    pending: "bg-yellow-400",
    generating: "bg-blue-400",
    done: "bg-green-400",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Content Calendar</h2>
          <p className="text-slate-500 mt-1">{siteName}</p>
        </div>
        <Button disabled>
          <Plus className="w-4 h-4 mr-2" />
          Schedule Article
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
            <Calendar className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Calendar empty
          </h3>
          <p className="text-slate-500 max-w-sm">
            Articles scheduled for publishing will appear here.
          </p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="p-1 hover:bg-slate-100 rounded">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className="text-base font-semibold">
                {format(currentDate, "MMMM yyyy")}
              </h3>
              <button onClick={nextMonth} className="p-1 hover:bg-slate-100 rounded">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Day names */}
            <div className="grid grid-cols-7 mb-2">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div
                  key={d}
                  className="text-center text-xs font-medium text-slate-400 py-1"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: paddingDays }).map((_, i) => (
                <div key={`pad-${i}`} />
              ))}
              {days.map((day) => {
                const dayItems = getItemsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, new Date());

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "min-h-14 p-1 rounded-lg border",
                      isCurrentMonth ? "bg-white" : "bg-slate-50 opacity-40",
                      isToday ? "border-blue-400 bg-blue-50" : "border-slate-100"
                    )}
                  >
                    <div
                      className={cn(
                        "text-xs font-medium mb-1",
                        isToday ? "text-blue-600" : "text-slate-600"
                      )}
                    >
                      {format(day, "d")}
                    </div>
                    <div className="space-y-0.5">
                      {dayItems.slice(0, 2).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-1"
                        >
                          <div
                            className={cn(
                              "w-1.5 h-1.5 rounded-full shrink-0",
                              STATUS_COLOR[item.status] ?? "bg-slate-400"
                            )}
                          />
                          <span className="text-xs text-slate-600 truncate">
                            {item.keyword}
                          </span>
                        </div>
                      ))}
                      {dayItems.length > 2 && (
                        <Badge variant="secondary" className="text-xs py-0">
                          +{dayItems.length - 2}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
