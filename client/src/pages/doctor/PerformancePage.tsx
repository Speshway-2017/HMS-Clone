import { BarChart3, Star, Clock, Award, ThumbsUp, Calendar, Users, MessageSquareOff } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { KpiCard } from "../../components/ui/KpiCard";
import { Badge } from "../../components/ui/Badge";
import { useDoctorProfileMe, useDoctorPerformance } from "../../features/doctors";
import { useSocketSync } from "../../hooks/useSocketSync";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} stars`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-4 w-4 ${
            s <= Math.round(rating) && rating > 0
              ? "text-amber-400 fill-amber-400"
              : "text-slate-300 fill-none"
          }`}
        />
      ))}
    </div>
  );
}

export function PerformancePage() {
  useSocketSync();
  const { data: doctorProfile, isLoading: isDoctorLoading } = useDoctorProfileMe();
  const { data: performanceData, isLoading: isPerfLoading } = useDoctorPerformance(doctorProfile?._id);

  const isLoading = isDoctorLoading || isPerfLoading;

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-700 border-t-transparent"></div>
      </div>
    );
  }

  const metrics = performanceData?.metrics;
  const feedbackList = performanceData?.feedback || [];

  const completedTotal = metrics?.completedTotal ?? 0;
  const upcomingTotal = metrics?.upcomingTotal ?? 0;
  const totalBookings = metrics?.totalBookings ?? 0;
  const avgRating = metrics?.avgRating ?? 0;
  const totalReviews = metrics?.totalReviews ?? 0;
  const ratingDist = metrics?.ratingDistribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  const monthlyData = metrics?.monthlyTrends || [];

  const maxBar = Math.max(...monthlyData.map((d) => d.consultations), 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Performance Dashboard</h1>
        <p className="text-sm text-slate-500">
          Your clinical performance analytics, verified patient feedback, and consultation metrics.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Completed Consults" value={completedTotal} icon={<Users className="h-5 w-5" />} emphasis />
        <KpiCard label="Avg. Rating" value={totalReviews > 0 ? `${avgRating} ★` : "N/A"} icon={<Star className="h-5 w-5" />} />
        <KpiCard label="Upcoming Consults" value={upcomingTotal} icon={<Clock className="h-5 w-5" />} />
        <KpiCard label="Total Patient Reviews" value={totalReviews} icon={<ThumbsUp className="h-5 w-5" />} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Monthly Chart */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-700" /> Monthly Consultations
            </h3>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-700 inline-block" /> Completed Consultations
              </span>
            </div>
          </div>
          {monthlyData.length > 0 ? (
            <div className="flex items-end gap-3 h-40">
              {monthlyData.map((d) => (
                <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-slate-500">{d.consultations}</span>
                  <div
                    className="w-full rounded-t-md bg-emerald-700 transition-all hover:bg-navy-600"
                    style={{
                      height: `${(d.consultations / maxBar) * 100}%`,
                      minHeight: d.consultations > 0 ? "10px" : "4px",
                    }}
                    title={`${d.consultations} consultations`}
                  />
                  <span className="text-xs font-medium text-slate-500">{d.month}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center text-xs text-slate-400">
              No completed consultations recorded in recent months.
            </div>
          )}
        </Card>

        {/* Rating Summary */}
        <Card>
          <h3 className="mb-4 text-base font-semibold text-slate-800 flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" /> Rating Breakdown
          </h3>
          <div className="text-center mb-4">
            <p className="text-5xl font-bold text-slate-800">
              {totalReviews > 0 ? (typeof avgRating === "number" ? avgRating.toFixed(1) : avgRating) : "0.0"}
            </p>
            <div className="flex justify-center my-1.5">
              <StarRating rating={totalReviews > 0 ? avgRating : 0} />
            </div>
            <p className="text-xs text-slate-500">
              {totalReviews > 0
                ? `Based on ${totalReviews} patient review${totalReviews === 1 ? "" : "s"}`
                : "No patient reviews yet"}
            </p>
          </div>
          {[5, 4, 3, 2, 1].map((star) => {
            const count = (ratingDist as any)[star] || 0;
            const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
            return (
              <div key={star} className="flex items-center gap-2 mb-1.5">
                <span className="text-xs text-slate-500 w-3">{star}</span>
                <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-slate-400 w-6">{pct}%</span>
              </div>
            );
          })}
        </Card>
      </div>

      {/* Consultation Metrics Summary Table */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-700" /> Consultation Metrics Summary
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="pb-2 text-left text-xs font-semibold uppercase text-slate-400">Parameter</th>
                <th className="pb-2 text-center text-xs font-semibold uppercase text-slate-400">Total Count</th>
                <th className="pb-2 text-left text-xs font-semibold uppercase text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: "Total Registered Bookings", count: totalBookings, status: "Active" },
                { name: "Completed Consultations", count: completedTotal, status: "Finalized" },
                { name: "Upcoming Consultations", count: upcomingTotal, status: "Scheduled" },
              ].map((row, i) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-3 font-semibold text-slate-800">{row.name}</td>
                  <td className="py-3 text-center font-bold text-emerald-700">{row.count}</td>
                  <td className="py-3">
                    <Badge tone={row.status === "Finalized" ? "success" : "warning"}>{row.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Patient Feedback */}
      <Card>
        <h3 className="mb-4 text-base font-semibold text-slate-800 flex items-center gap-2">
          <ThumbsUp className="h-4 w-4 text-emerald-700" /> Recent Patient Feedback
        </h3>

        {feedbackList.length > 0 ? (
          <div className="space-y-3">
            {feedbackList.map((fb) => (
              <div key={fb._id} className="flex items-start gap-4 rounded-lg border border-slate-100 p-3 hover:bg-slate-50">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                  {fb.patientName
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-slate-800">{fb.patientName}</p>
                    <StarRating rating={fb.rating} />
                  </div>
                  {fb.comment && <p className="text-sm text-slate-600">{fb.comment}</p>}
                </div>
                <p className="text-xs text-slate-400 shrink-0">
                  {new Date(fb.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50">
            <MessageSquareOff className="h-8 w-8 text-slate-400 mb-2" />
            <p className="text-sm font-medium text-slate-700">No patient feedback available yet.</p>
            <p className="text-xs text-slate-500 mt-1">
              Patient reviews will appear here after patients submit verified feedback.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
