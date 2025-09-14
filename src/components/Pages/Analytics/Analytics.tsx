// components/Analytics/EnhancedAnalytics.tsx
import React, { useState, useMemo } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
  ScatterChart,
  Scatter,
  ComposedChart,
} from "recharts";
import {
  TrendingUp,
  Target,
  Activity,
  Award,
  Clock,
  Users,
  Calendar,
  BarChart3,
  TrendingDown,
  Zap,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import {
  Task,
  Board,
  ContributorMetrics,
  VelocityData,
  EnhancedVelocityData,
  CompletionTrendsData,
} from "../../../store/types/types";
import BurndownManager from "./BurnDown";

interface AnalyticsTabProps {
  tasks: Task[];
  board: Board;
}

const EnhancedAnalyticsTab: React.FC<AnalyticsTabProps> = ({
  tasks,
  board,
}) => {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");
  const [activeChart, setActiveChart] = useState<
    | "velocity"
    | "burndown"
    | "contributors"
    | "cycle-time"
    | "completion-trends"
  >("velocity");
  const [refreshKey, setRefreshKey] = useState(0);

  // Get task points
  const getTaskPoints = (task: Task): number => {
    // Use explicit story points if available
    if (task.points !== null && task.points !== undefined) {
      return task.points;
    }
    // Fallback to priority-based points
    return task.priority === "High" ? 8 : task.priority === "Medium" ? 5 : 3;
  };

  // Calculate contributor metrics with enhanced data
  const contributorMetrics = useMemo((): ContributorMetrics[] => {
    // Use all board collaborators instead of just task assignees
    const contributors = board.collaborators?.map(collab => collab.name) || [];
    
    // Fallback: if no collaborators, use task assignees
    const taskAssignees = [...new Set(tasks.map(t => t.assignedTo?.name).filter(Boolean))] as string[];
    const finalContributors = contributors.length > 0 ? contributors : taskAssignees;
    
    // Debug logging
    console.log('Analytics Debug:', {
      boardCollaborators: board.collaborators,
      contributorNames: contributors,
      taskAssignees,
      finalContributors,
      totalTasks: tasks.length
    });

    return finalContributors
      .map((contributor) => {
        const contributorTasks = tasks.filter(
          (t) => t.assignedTo?.name === contributor
        );
        const completedTasks = contributorTasks.filter(
          (t) => t.status === "Done" || t.status === "done" || t.status === "completed"
        );
        const inProgressTasks = contributorTasks.filter(
          (t) => t.status === "In Progress" || t.status === "inprogress"
        );
        const todoTasks = contributorTasks.filter(
          (t) => t.status === "To Do" || t.status === "todo"
        );

        const pointsCompleted = completedTasks.reduce(
          (sum, task) => sum + getTaskPoints(task),
          0
        );
        const pointsInProgress = inProgressTasks.reduce(
          (sum, task) => sum + getTaskPoints(task),
          0
        );
        const pointsTotal = contributorTasks.reduce(
          (sum, task) => sum + getTaskPoints(task),
          0
        );

        // Calculate average cycle time
        const tasksWithCycleTime = completedTasks.filter((task) => {
          const startLog = task.progressLog?.find(
            (log) =>
              log.type === "status-change" &&
              (log.desc.includes("In Progress") ||
                log.desc.includes("inprogress"))
          );
          const completionLog = task.progressLog?.find(
            (log) =>
              log.type === "status-change" &&
              (log.desc.includes("done") || log.desc.includes("Done"))
          );
          return startLog && completionLog;
        });

        const avgCycleTime =
          tasksWithCycleTime.length > 0
            ? tasksWithCycleTime.reduce((sum, task) => {
                const startLog = task.progressLog?.find(
                  (log) =>
                    log.type === "status-change" &&
                    (log.desc.includes("In Progress") ||
                      log.desc.includes("inprogress"))
                );
                const completionLog = task.progressLog?.find(
                  (log) =>
                    log.type === "status-change" &&
                    (log.desc.includes("done") || log.desc.includes("Done"))
                );
                if (startLog && completionLog) {
                  const startDate = (startLog.timestamp as any)?.toDate?.() || 
                    (typeof startLog.timestamp === 'string' ? new Date(startLog.timestamp) : new Date());
                  const endDate = (completionLog.timestamp as any)?.toDate?.() || 
                    (typeof completionLog.timestamp === 'string' ? new Date(completionLog.timestamp) : new Date());
                  const cycleTime = Math.ceil(
                    (endDate.getTime() - startDate.getTime()) /
                      (1000 * 60 * 60 * 24)
                  );
                  // Ensure cycle time is not negative or NaN
                  return sum + (cycleTime > 0 ? cycleTime : 0);
                }
                return sum;
              }, 0) / tasksWithCycleTime.length
            : 0;

        const efficiency =
          contributorTasks.length > 0
            ? (completedTasks.length / contributorTasks.length) * 100
            : 0;
        const workload = pointsTotal;
        const velocity =
          pointsCompleted /
          Math.max(
            1,
            Math.ceil(timeRange === "7d" ? 1 : timeRange === "30d" ? 4 : 12)
          ); // per week

        return {
          name: contributor,
          taskCount: contributorTasks.length,
          pointsCompleted,
          pointsInProgress,
          pointsTotal,
          completedTasks: completedTasks.length,
          inProgressTasks: inProgressTasks.length,
          todoTasks: todoTasks.length,
          averageCycleTime: isNaN(avgCycleTime) ? 0 : Math.round(avgCycleTime * 10) / 10,
          efficiency: isNaN(efficiency) ? 0 : Math.round(efficiency),
          workload,
          velocity: isNaN(velocity) ? 0 : Math.round(velocity * 10) / 10,
        };
      })
      .filter(contributor => {
        const hasTasks = contributor.taskCount > 0;
        console.log(`Contributor ${contributor.name}: ${contributor.taskCount} tasks, hasTasks: ${hasTasks}`);
        console.log(`Contributor data:`, contributor);
        return true; // Show all contributors for debugging
      }) // Temporarily show all contributors for debugging
      .sort((a, b) => b.pointsCompleted - a.pointsCompleted);
  }, [tasks, timeRange, refreshKey]);

  // Enhanced velocity data with predictions
  const velocityData = useMemo((): EnhancedVelocityData[] => {
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
    const periodsCount = Math.min(8, Math.floor(days / 7)); // Weekly periods, max 8
    const data: EnhancedVelocityData[] = []; // Explicitly type the array

    for (let i = 0; i < periodsCount; i++) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (i + 1) * 7);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - i * 7);

      const periodTasks = tasks.filter((task) => {
        const completionLog = task.progressLog?.find(
          (log) =>
            log.type === "status-change" &&
            (log.desc.includes("done") || log.desc.includes("Done"))
        );
        const completedDate = (completionLog?.timestamp as any)?.toDate?.() || 
          (typeof completionLog?.timestamp === 'string' ? new Date(completionLog.timestamp) : null);
        return (
          completedDate &&
          completedDate >= startDate &&
          completedDate <= endDate
        );
      });

      const completed = periodTasks.reduce(
        (sum, task) => sum + getTaskPoints(task),
        0
      );
      const planned = completed + Math.floor(Math.random() * 10); // Mock planned data
      const teamSize = contributorMetrics.length || 1;
      const capacity = teamSize * 40; // 40 points per person per week

      data.unshift({
        period: `Week ${periodsCount - i}`,
        completed,
        planned,
        velocity: completed,
        capacity,
        utilization: capacity > 0 ? (completed / capacity) * 100 : 0,
        trend: i > 0 ? completed - (data[0]?.completed || 0) : 0,
      });
    }

    return data;
  }, [tasks, timeRange, contributorMetrics, refreshKey]);

  // Cycle time distribution data
  const cycleTimeData = useMemo(() => {
    const completedTasks = tasks.filter(
      (t) => t.status === "Done" || t.status === "done"
    );
    const cycleTimeMap = new Map();

    completedTasks.forEach((task) => {
      const startLog = task.progressLog?.find(
        (log) =>
          log.type === "status-change" &&
          (log.desc.includes("In Progress") || log.desc.includes("inprogress"))
      );
      const completionLog = task.progressLog?.find(
        (log) =>
          log.type === "status-change" &&
          (log.desc.includes("done") || log.desc.includes("Done"))
      );

      if (startLog && completionLog) {
        const startDate = (startLog.timestamp as any)?.toDate?.() || 
          (typeof startLog.timestamp === 'string' ? new Date(startLog.timestamp) : new Date());
        const endDate = (completionLog.timestamp as any)?.toDate?.() || 
          (typeof completionLog.timestamp === 'string' ? new Date(completionLog.timestamp) : new Date());
        const days = Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        const bucket =
          days <= 1
            ? "≤1 day"
            : days <= 3
            ? "2-3 days"
            : days <= 7
            ? "4-7 days"
            : days <= 14
            ? "1-2 weeks"
            : ">2 weeks";

        cycleTimeMap.set(bucket, (cycleTimeMap.get(bucket) || 0) + 1);
      }
    });

    return Array.from(cycleTimeMap.entries()).map(([bucket, count]) => ({
      bucket,
      count,
      percentage: Math.round((count / completedTasks.length) * 100),
    }));
  }, [tasks, refreshKey]);

  // Task completion trends
  const completionTrendsData = useMemo(() => {
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
    const data: CompletionTrendsData[] = []; // Explicitly type the array

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      const dayTasks = tasks.filter((task) => {
        const createdDate = (task.createdAt as any)?.toDate?.() || 
          (typeof task.createdAt === 'string' ? new Date(task.createdAt) : new Date());
        return createdDate.toISOString().split("T")[0] === dateStr;
      });

      const completedTasks = tasks.filter((task) => {
        const completionLog = task.progressLog?.find(
          (log) =>
            log.type === "status-change" &&
            (log.desc.includes("done") || log.desc.includes("Done"))
        );
        const completedDate = (completionLog?.timestamp as any)?.toDate?.() || 
          (typeof completionLog?.timestamp === 'string' ? new Date(completionLog.timestamp) : null);
        return (
          completedDate && completedDate.toISOString().split("T")[0] === dateStr
        );
      });

      data.push({
        date: dateStr,
        dateFormatted: date.toLocaleDateString(),
        created: dayTasks.length,
        completed: completedTasks.length,
        net: completedTasks.length - dayTasks.length,
        cumulative:
          data.length > 0
            ? data[data.length - 1].cumulative +
              (completedTasks.length - dayTasks.length)
            : completedTasks.length - dayTasks.length,
      });
    }

    return data;
  }, [tasks, timeRange, refreshKey]);

  // Current sprint tasks
  const currentSprintTasks = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return tasks.filter((task) => {
      const createdDate = (task.createdAt as any)?.toDate?.() || 
        (typeof task.createdAt === 'string' ? new Date(task.createdAt) : new Date());
      return createdDate >= thirtyDaysAgo;
    });
  }, [tasks]);

  // Calculate enhanced sprint metrics
  const sprintMetrics = useMemo(() => {
    const totalPoints = currentSprintTasks.reduce(
      (sum, task) => sum + getTaskPoints(task),
      0
    );
    const completedTasks = currentSprintTasks.filter(
      (t) => t.status === "Done" || t.status === "done"
    );
    const completedPoints = completedTasks.reduce(
      (sum, task) => sum + getTaskPoints(task),
      0
    );
    const inProgressTasks = currentSprintTasks.filter(
      (t) => t.status === "In Progress" || t.status === "inprogress"
    );
    const inProgressPoints = inProgressTasks.reduce(
      (sum, task) => sum + getTaskPoints(task),
      0
    );

    const avgVelocity =
      velocityData.length > 0
        ? velocityData.reduce((sum, d) => sum + d.velocity, 0) /
          velocityData.length
        : 0;

    const projectedCompletion =
      avgVelocity > 0
        ? Math.ceil((totalPoints - completedPoints) / avgVelocity)
        : totalPoints > completedPoints ? 999 : 0; // Use 999 as "unknown" instead of Infinity

    const avgCycleTime =
      contributorMetrics.length > 0
        ? contributorMetrics.reduce((sum, c) => sum + c.averageCycleTime, 0) /
          contributorMetrics.length
        : 0;

    const teamEfficiency =
      contributorMetrics.length > 0
        ? contributorMetrics.reduce((sum, c) => sum + c.efficiency, 0) /
          contributorMetrics.length
        : 0;

    return {
      totalTasks: currentSprintTasks.length,
      totalPoints,
      completedPoints,
      inProgressPoints,
      inProgressTasks: inProgressTasks.length,
      completionRate:
        totalPoints > 0
          ? ((completedPoints / totalPoints) * 100).toFixed(1)
          : "0",
      avgVelocity: isNaN(avgVelocity) ? 0 : Math.round(avgVelocity * 10) / 10,
      projectedCompletion: isNaN(projectedCompletion) || !isFinite(projectedCompletion) ? 0 : projectedCompletion,
      remainingPoints: totalPoints - completedPoints,
      avgCycleTime: isNaN(avgCycleTime) ? 0 : Math.round(avgCycleTime * 10) / 10,
      teamEfficiency: isNaN(teamEfficiency) ? 0 : Math.round(teamEfficiency),
      predictedVelocity:
        velocityData.length >= 3
          ? Math.round(
              (velocityData.slice(-3).reduce((sum, d) => sum + d.velocity, 0) /
                3) *
                10
            ) / 10
          : isNaN(avgVelocity) ? 0 : avgVelocity,
    };
  }, [currentSprintTasks, velocityData, contributorMetrics]);

  const COLORS = [
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#06B6D4",
    "#F97316",
    "#84CC16",
  ];

  const renderChart = () => {
    switch (activeChart) {
      case "velocity":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={velocityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="period" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="completed" fill="#10B981" name="Completed Points" />
              <Bar dataKey="planned" fill="#94a3b8" name="Planned Points" />
              <Line
                type="monotone"
                dataKey="capacity"
                stroke="#F59E0B"
                strokeWidth={2}
                name="Team Capacity"
              />
              <Area
                dataKey="utilization"
                fill="#3B82F6"
                fillOpacity={0.1}
                stroke="#3B82F6"
                strokeWidth={2}
                name="Utilization %"
              />
            </ComposedChart>
          </ResponsiveContainer>
        );

      case "contributors":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={contributorMetrics} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" stroke="#64748b" fontSize={12} />
              <YAxis
                dataKey="name"
                type="category"
                stroke="#64748b"
                fontSize={12}
                width={100}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                }}
                formatter={(value, name) => [
                  value,
                  name === "pointsCompleted"
                    ? "Completed Points"
                    : name === "pointsInProgress"
                    ? "In Progress Points"
                    : name === "pointsTotal"
                    ? "Total Points"
                    : name,
                ]}
              />
              <Bar
                dataKey="pointsTotal"
                fill="#E5E7EB"
                name="Total"
                opacity={0.3}
              />
              <Bar
                dataKey="pointsCompleted"
                fill="#10B981"
                name="Completed"
              />
              <Bar
                dataKey="pointsInProgress"
                fill="#F59E0B"
                name="In Progress"
              />
            </BarChart>
          </ResponsiveContainer>
        );

      case "cycle-time":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={cycleTimeData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={2}
                dataKey="count"
                nameKey="bucket"
              >
                {cycleTimeData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [
                  `${value} tasks (${
                    cycleTimeData.find((d) => d.bucket === name)?.percentage ||
                    0
                  }%)`,
                  "Count",
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      case "completion-trends":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={completionTrendsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="dateFormatted"
                stroke="#64748b"
                fontSize={10}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="created" fill="#3B82F6" name="Created Tasks" />
              <Bar dataKey="completed" fill="#10B981" name="Completed Tasks" />
              <Line
                type="monotone"
                dataKey="cumulative"
                stroke="#EF4444"
                strokeWidth={3}
                name="Net Change (Cumulative)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  const getChartDescription = () => {
    switch (activeChart) {
      case "velocity":
        return "Team velocity over time with capacity planning and utilization rates";
      case "contributors":
        return "Individual contributor performance metrics and workload distribution";
      case "cycle-time":
        return "Distribution of task completion times across different time buckets";
      case "completion-trends":
        return "Daily task creation vs completion trends with cumulative net change";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6 p-4 tablet:p-6">
      {/* Enhanced Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 tablet:p-6">
        <div className="flex flex-col tablet:flex-row tablet:items-center tablet:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl tablet:text-2xl font-bold text-slate-800">
              Sprint Analytics Dashboard
            </h2>
            <p className="text-sm tablet:text-base text-slate-600">
              Comprehensive insights into team velocity, performance, and
              delivery metrics
            </p>
          </div>
          <div className="flex flex-col tablet:flex-row gap-2">
            <button
              onClick={() => setRefreshKey(prev => prev + 1)}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              title="Refresh analytics data"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
            <div className="flex gap-2">
              {(["7d", "30d", "90d"] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    timeRange === range
                      ? "bg-blue-600 text-white"
                      : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                  }`}
                >
                  {range === "7d"
                    ? "7 Days"
                    : range === "30d"
                    ? "30 Days"
                    : "90 Days"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Enhanced Key Metrics */}
        <div className="grid grid-cols-1 tablet:grid-cols-2 laptop:grid-cols-3 desktop:grid-cols-6 gap-4">
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
            <div className="flex items-center gap-3">
              <Target size={20} className="text-blue-600" />
              <div>
                <p className="text-sm text-blue-600 font-medium">
                  Sprint Tasks
                </p>
                <p className="text-2xl font-bold text-blue-800">
                  {sprintMetrics.totalTasks}
                </p>
                <p className="text-xs text-blue-600">
                  {sprintMetrics.totalPoints} total points
                </p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg border border-green-200 p-4">
            <div className="flex items-center gap-3">
              <TrendingUp size={20} className="text-green-600" />
              <div>
                <p className="text-sm text-green-600 font-medium">Velocity</p>
                <p className="text-2xl font-bold text-green-800">
                  {sprintMetrics.avgVelocity}
                </p>
                <p className="text-xs text-green-600">points/week avg</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg border border-purple-200 p-4">
            <div className="flex items-center gap-3">
              <Activity size={20} className="text-purple-600" />
              <div>
                <p className="text-sm text-purple-600 font-medium">Progress</p>
                <p className="text-2xl font-bold text-purple-800">
                  {sprintMetrics.completionRate}%
                </p>
                <p className="text-xs text-purple-600">
                  {sprintMetrics.completedPoints} completed
                </p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg border border-orange-200 p-4">
            <div className="flex items-center gap-3">
              <Clock size={20} className="text-orange-600" />
              <div>
                <p className="text-sm text-orange-600 font-medium">
                  Avg Cycle Time
                </p>
                <p className="text-2xl font-bold text-orange-800">
                  {sprintMetrics.avgCycleTime}
                </p>
                <p className="text-xs text-orange-600">days per task</p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 rounded-lg border border-red-200 p-4">
            <div className="flex items-center gap-3">
              <Users size={20} className="text-red-600" />
              <div>
                <p className="text-sm text-red-600 font-medium">
                  Team Efficiency
                </p>
                <p className="text-2xl font-bold text-red-800">
                  {sprintMetrics.teamEfficiency}%
                </p>
                <p className="text-xs text-red-600">completion rate</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
            <div className="flex items-center gap-3">
              <Zap size={20} className="text-yellow-600" />
              <div>
                <p className="text-sm text-yellow-600 font-medium">
                  Predicted Velocity
                </p>
                <p className="text-2xl font-bold text-yellow-800">
                  {sprintMetrics.predictedVelocity}
                </p>
                <p className="text-xs text-yellow-600">next week est.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Burndown Chart */}
      <BurndownManager board={board} tasks={tasks} />

      {/* Enhanced Chart Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">
              Detailed Analytics
            </h3>
            <p className="text-sm text-slate-600">{getChartDescription()}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              {
                key: "velocity",
                label: "Velocity & Capacity",
                icon: TrendingUp,
              },
              { key: "contributors", label: "Contributors", icon: Users },
              { key: "cycle-time", label: "Cycle Time", icon: Clock },
              {
                key: "completion-trends",
                label: "Completion Trends",
                icon: Calendar,
              },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveChart(key as any)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeChart === key
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-96">{renderChart()}</div>

        {/* Chart Legend/Info */}
        <div className="mt-4 p-4 bg-slate-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            {activeChart === "velocity" && (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 bg-green-500"></div>
                  <span>Completed Points</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 bg-slate-400"></div>
                  <span>Planned Points</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-yellow-500"></div>
                  <span>Team Capacity</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-blue-500"></div>
                  <span>Utilization %</span>
                </div>
              </>
            )}
            {activeChart === "contributors" && (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 bg-green-500"></div>
                  <span>Completed Points</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 bg-yellow-500"></div>
                  <span>In Progress Points</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 bg-blue-500"></div>
                  <span>Weekly Velocity</span>
                </div>
                <div className="text-slate-600">Hover for detailed metrics</div>
              </>
            )}
            {activeChart === "cycle-time" && (
              <div className="col-span-full">
                <div className="flex flex-wrap gap-4">
                  {cycleTimeData.map((item, index) => (
                    <div key={item.bucket} className="flex items-center gap-2">
                      <div
                        className="w-4 h-3"
                        style={{
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      ></div>
                      <span>
                        {item.bucket} ({item.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeChart === "completion-trends" && (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 bg-blue-500"></div>
                  <span>Created Tasks</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 bg-green-500"></div>
                  <span>Completed Tasks</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-red-500"></div>
                  <span>Net Change (Cumulative)</span>
                </div>
                <div className="text-slate-600">
                  Positive trend = completing more than creating
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Team Members Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Users size={20} className="text-blue-600" />
          <h3 className="text-lg font-semibold text-slate-800">
            Team Members ({board.collaborators?.length || 0})
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(board.collaborators || []).map((collaborator, index) => {
            const contributorData = contributorMetrics.find(c => c.name === collaborator.name);
            const hasTasks = contributorData && contributorData.taskCount > 0;
            
            return (
              <div
                key={collaborator.email}
                className={`p-4 rounded-lg border-2 ${
                  hasTasks 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      hasTasks ? 'bg-green-600' : 'bg-slate-400'
                    }`}
                  >
                    {collaborator.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-slate-800">
                      {collaborator.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {collaborator.email}
                    </div>
                  </div>
                </div>
                {hasTasks ? (
                  <div className="text-sm text-slate-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Tasks:</span>
                      <span className="font-medium">{contributorData?.taskCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Assigned Points:</span>
                      <span className="font-medium text-blue-600">{contributorData?.pointsTotal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Completed Points:</span>
                      <span className="font-medium text-green-600">{contributorData?.pointsCompleted}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Completion Rate:</span>
                      <span className="font-medium">
                        {contributorData?.pointsTotal > 0 
                          ? Math.round((contributorData.pointsCompleted / contributorData.pointsTotal) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Velocity:</span>
                      <span className="font-medium">{contributorData?.velocity} pts/week</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500 italic">
                    No tasks assigned
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Enhanced Team Performance Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Individual Performance */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Award size={20} className="text-green-600" />
            <h3 className="text-lg font-semibold text-slate-800">
              Individual Performance
            </h3>
          </div>
          <div className="space-y-4">
            {contributorMetrics.slice(0, 5).map((contributor, index) => (
              <div
                key={contributor.name}
                className="p-4 bg-green-50 rounded-lg border border-green-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                        index === 0
                          ? "bg-yellow-500"
                          : index === 1
                          ? "bg-gray-400"
                          : index === 2
                          ? "bg-amber-600"
                          : "bg-green-600"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-slate-800">
                        {contributor.name}
                      </div>
                      <div className="text-sm text-slate-600">
                        {contributor.taskCount} tasks • {contributor.velocity}{" "}
                        pts/week
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-700">
                      {contributor.pointsCompleted} pts
                    </div>
                    <div className="text-sm text-slate-600">
                      of {contributor.pointsTotal} assigned
                    </div>
                    <div className="text-sm text-slate-600">
                      {contributor.efficiency}% efficiency
                    </div>
                  </div>
                </div>

                {/* Progress bars */}
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                      <span>Workload Distribution</span>
                      <span>
                        {contributor.pointsCompleted +
                          contributor.pointsInProgress}
                        /{contributor.pointsTotal}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="flex h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-green-500"
                          style={{
                            width: `${
                              (contributor.pointsCompleted /
                                contributor.pointsTotal) *
                              100
                            }%`,
                          }}
                        ></div>
                        <div
                          className="bg-yellow-500"
                          style={{
                            width: `${
                              (contributor.pointsInProgress /
                                contributor.pointsTotal) *
                              100
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <div className="font-semibold text-green-600">
                        {contributor.completedTasks}
                      </div>
                      <div className="text-slate-500">Done</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-yellow-600">
                        {contributor.inProgressTasks}
                      </div>
                      <div className="text-slate-500">In Progress</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-slate-600">
                        {contributor.todoTasks}
                      </div>
                      <div className="text-slate-500">To Do</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team Health Indicators */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 size={20} className="text-blue-600" />
            <h3 className="text-lg font-semibold text-slate-800">
              Team Health Indicators
            </h3>
          </div>

          <div className="space-y-6">
            {/* Velocity Trend */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-slate-700">
                  Velocity Trend
                </span>
                <div className="flex items-center gap-2">
                  {velocityData.length >= 2 &&
                  velocityData[velocityData.length - 1].velocity >
                    velocityData[velocityData.length - 2].velocity ? (
                    <TrendingUp size={16} className="text-green-500" />
                  ) : (
                    <TrendingDown size={16} className="text-red-500" />
                  )}
                  <span className="text-sm font-semibold">
                    {velocityData.length >= 2 && velocityData[velocityData.length - 2].velocity > 0
                      ? `${Math.round(
                          ((velocityData[velocityData.length - 1].velocity -
                            velocityData[velocityData.length - 2].velocity) /
                            velocityData[velocityData.length - 2].velocity) *
                            100
                        )}%`
                      : velocityData.length >= 2 && velocityData[velocityData.length - 1].velocity > 0
                      ? "100%" // If previous was 0 and current > 0, show 100% improvement
                      : "0%"} {/* Default to 0% if no meaningful data */}
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    velocityData.length >= 2 &&
                    velocityData[velocityData.length - 1].velocity >
                      velocityData[velocityData.length - 2].velocity
                      ? "bg-green-500"
                      : "bg-red-500"
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      Math.abs(
                        (velocityData.length >= 2 && velocityData[velocityData.length - 2].velocity > 0
                          ? ((velocityData[velocityData.length - 1].velocity -
                              velocityData[velocityData.length - 2].velocity) /
                              velocityData[velocityData.length - 2].velocity) *
                            100
                          : velocityData.length >= 2 && velocityData[velocityData.length - 1].velocity > 0
                          ? 100 // If previous was 0 and current > 0, show 100%
                          : 0) * 2
                      )
                    )}%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Team Efficiency */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-slate-700">
                  Team Efficiency
                </span>
                <span className="text-sm font-semibold">
                  {isNaN(sprintMetrics.teamEfficiency) ? 0 : sprintMetrics.teamEfficiency}%
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    (isNaN(sprintMetrics.teamEfficiency) ? 0 : sprintMetrics.teamEfficiency) >= 80
                      ? "bg-green-500"
                      : (isNaN(sprintMetrics.teamEfficiency) ? 0 : sprintMetrics.teamEfficiency) >= 60
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${isNaN(sprintMetrics.teamEfficiency) ? 0 : sprintMetrics.teamEfficiency}%` }}
                ></div>
              </div>
            </div>

            {/* Workload Balance */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-slate-700">
                  Workload Balance
                </span>
                <span className="text-sm font-semibold">
                  {contributorMetrics.length > 0
                    ? (() => {
                        const maxPoints = Math.max(...contributorMetrics.map((c) => c.pointsTotal));
                        const minPoints = Math.min(...contributorMetrics.map((c) => c.pointsTotal));
                        if (maxPoints === 0) return "100"; // Perfect balance when no work assigned
                        const balance = Math.round((1 - (maxPoints - minPoints) / maxPoints) * 100);
                        return isNaN(balance) ? "0" : balance.toString();
                      })()
                    : "0"}
                  %
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    contributorMetrics.length > 0
                      ? (() => {
                          const maxPoints = Math.max(...contributorMetrics.map((c) => c.pointsTotal));
                          const minPoints = Math.min(...contributorMetrics.map((c) => c.pointsTotal));
                          if (maxPoints === 0) return "bg-green-500"; // Perfect balance when no work assigned
                          const balance = 1 - (maxPoints - minPoints) / maxPoints;
                          return balance >= 0.8 ? "bg-green-500" : balance >= 0.6 ? "bg-yellow-500" : "bg-red-500";
                        })()
                      : "bg-red-500"
                  }`}
                  style={{
                    width: `${
                      contributorMetrics.length > 0
                        ? (() => {
                            const maxPoints = Math.max(...contributorMetrics.map((c) => c.pointsTotal));
                            const minPoints = Math.min(...contributorMetrics.map((c) => c.pointsTotal));
                            if (maxPoints === 0) return 100; // Perfect balance when no work assigned
                            const balance = (1 - (maxPoints - minPoints) / maxPoints) * 100;
                            return isNaN(balance) ? 0 : Math.max(0, Math.min(100, balance));
                          })()
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Health Status Cards */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div
                className={`p-3 rounded-lg border-2 ${
                  sprintMetrics.avgCycleTime <= 3
                    ? "bg-green-50 border-green-200"
                    : sprintMetrics.avgCycleTime <= 7
                    ? "bg-yellow-50 border-yellow-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {sprintMetrics.avgCycleTime <= 3 ? (
                    <CheckCircle size={16} className="text-green-600" />
                  ) : sprintMetrics.avgCycleTime <= 7 ? (
                    <Clock size={16} className="text-yellow-600" />
                  ) : (
                    <AlertTriangle size={16} className="text-red-600" />
                  )}
                  <span className="font-medium text-sm">Cycle Time</span>
                </div>
                <div className="text-lg font-bold">
                  {sprintMetrics.avgCycleTime} days
                </div>
                <div className="text-xs text-slate-600">
                  {sprintMetrics.avgCycleTime <= 3
                    ? "Excellent"
                    : sprintMetrics.avgCycleTime <= 7
                    ? "Good"
                    : "Needs Attention"}
                </div>
              </div>

              <div
                className={`p-3 rounded-lg border-2 ${
                  parseFloat(sprintMetrics.completionRate) >= 80
                    ? "bg-green-50 border-green-200"
                    : parseFloat(sprintMetrics.completionRate) >= 60
                    ? "bg-yellow-50 border-yellow-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {parseFloat(sprintMetrics.completionRate) >= 80 ? (
                    <CheckCircle size={16} className="text-green-600" />
                  ) : parseFloat(sprintMetrics.completionRate) >= 60 ? (
                    <Target size={16} className="text-yellow-600" />
                  ) : (
                    <AlertTriangle size={16} className="text-red-600" />
                  )}
                  <span className="font-medium text-sm">Sprint Progress</span>
                </div>
                <div className="text-lg font-bold">
                  {sprintMetrics.completionRate}%
                </div>
                <div className="text-xs text-slate-600">
                  {parseFloat(sprintMetrics.completionRate) >= 80
                    ? "On Track"
                    : parseFloat(sprintMetrics.completionRate) >= 60
                    ? "At Risk"
                    : "Behind Schedule"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedAnalyticsTab;
