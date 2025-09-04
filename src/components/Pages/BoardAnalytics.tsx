// components/Analytics/EnhancedBoardAnalytics.tsx
import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Calendar, TrendingUp, Clock, Users, Target, Activity } from 'lucide-react';
import { Task, Board } from '../../store/types/types';

interface EnhancedBoardAnalyticsProps {
  tasks: Task[];
  board: Board;
  timeRange?: '7d' | '30d' | '90d';
}

const EnhancedBoardAnalytics: React.FC<EnhancedBoardAnalyticsProps> = ({ 
  tasks, 
  board, 
  timeRange = '30d' 
}) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d'>(timeRange);

  // Helper function to get task points
  const getTaskPoints = (task: Task): number => {
    if (task.points) return task.points;
    // Estimate points based on priority if no points assigned
    return task.priority === 'High' ? 8 : task.priority === 'Medium' ? 5 : 3;
  };

  // Calculate burndown data using actual task data
  const burndownData = useMemo(() => {
    const days = selectedTimeRange === '7d' ? 7 : selectedTimeRange === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const data = [];
    const totalPoints = tasks.reduce((sum, task) => sum + getTaskPoints(task), 0);
    
    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      // Count points completed by this date
      const completedByDate = tasks.filter(task => {
        if (task.status !== 'Done' && task.status !== 'done') return false;
        
        // Look for completion date in progress log
        const completionLog = task.progressLog?.find(log => 
          log.type === 'status-change' && 
          (log.desc.includes('done') || log.desc.includes('Done'))
        );
        
        const completedDate = completionLog?.timestamp?.toDate?.() || task.createdAt?.toDate?.();
        return completedDate && completedDate <= date;
      }).reduce((sum, task) => sum + getTaskPoints(task), 0);

      const remaining = Math.max(0, totalPoints - completedByDate);
      const ideal = Math.max(0, totalPoints - (totalPoints * i / days));

      data.push({
        day: i + 1,
        date: date.toLocaleDateString(),
        remaining,
        ideal,
        completed: completedByDate
      });
    }
    
    return data;
  }, [tasks, selectedTimeRange]);

  // Calculate velocity data
  const velocityData = useMemo(() => {
    const weeks = [];
    const weeksCount = Math.ceil(parseInt(selectedTimeRange.replace('d', '')) / 7);
    
    for (let i = 0; i < weeksCount; i++) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (weeksCount - i) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      
      const completedThisWeek = tasks.filter(task => {
        if (task.status !== 'Done' && task.status !== 'done') return false;
        
        const completionLog = task.progressLog?.find(log => 
          log.type === 'status-change' && 
          (log.desc.includes('done') || log.desc.includes('Done'))
        );
        
        const completedDate = completionLog?.timestamp?.toDate?.() || task.createdAt?.toDate?.();
        return completedDate && completedDate >= weekStart && completedDate < weekEnd;
      }).reduce((sum, task) => sum + getTaskPoints(task), 0);

      weeks.push({
        week: `Week ${i + 1}`,
        completed: completedThisWeek,
        date: weekStart.toLocaleDateString()
      });
    }
    
    return weeks;
  }, [tasks, selectedTimeRange]);

  // Calculate team performance metrics
  const teamMetrics = useMemo(() => {
    const assigneeStats = tasks.reduce((acc, task) => {
      const assignee = task.assignedTo || 'Unassigned';
      if (!acc[assignee]) {
        acc[assignee] = { total: 0, completed: 0, inProgress: 0, points: 0, completedPoints: 0 };
      }
      
      const taskPoints = getTaskPoints(task);
      acc[assignee].total++;
      acc[assignee].points += taskPoints;
      
      if (task.status === 'Done' || task.status === 'done') {
        acc[assignee].completed++;
        acc[assignee].completedPoints += taskPoints;
      } else if (task.status === 'In Progress' || task.status === 'inprogress') {
        acc[assignee].inProgress++;
      }
      return acc;
    }, {} as Record<string, { total: number; completed: number; inProgress: number; points: number; completedPoints: number }>);

    return Object.entries(assigneeStats).map(([assignee, stats]) => ({
      assignee,
      ...stats,
      completionRate: stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : '0',
      pointsCompletionRate: stats.points > 0 ? ((stats.completedPoints / stats.points) * 100).toFixed(1) : '0'
    }));
  }, [tasks]);

  // Calculate status distribution
  const statusDistribution = useMemo(() => {
    const statusCounts = tasks.reduce((acc, task) => {
      const status = task.status || 'To Do';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      percentage: ((count / tasks.length) * 100).toFixed(1)
    }));
  }, [tasks]);

  const totalPoints = tasks.reduce((sum, task) => sum + getTaskPoints(task), 0);
  const completedPoints = tasks.filter(t => t.status === 'Done' || t.status === 'done').reduce((sum, task) => sum + getTaskPoints(task), 0);
  const completionRate = totalPoints > 0 ? ((completedPoints / totalPoints) * 100).toFixed(1) : '0';
  const averageVelocity = velocityData.length > 0 ? (velocityData.reduce((sum, week) => sum + week.completed, 0) / velocityData.length).toFixed(1) : '0';

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Board Analytics</h2>
          <p className="text-slate-600">{board.title} - Performance insights and metrics</p>
        </div>
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setSelectedTimeRange(range)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedTimeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
              }`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Target size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Points</p>
              <p className="text-2xl font-bold text-slate-800">{totalPoints}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <TrendingUp size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Completion Rate</p>
              <p className="text-2xl font-bold text-slate-800">{completionRate}%</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <Activity size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Avg Velocity</p>
              <p className="text-2xl font-bold text-slate-800">{averageVelocity}/week</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100">
              <Users size={20} className="text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Team Members</p>
              <p className="text-2xl font-bold text-slate-800">{board.collaborators.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Burndown Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Burndown Chart</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={burndownData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="remaining" 
                  stroke="#3b82f6" 
                  strokeWidth={2} 
                  name="Actual Remaining"
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="ideal" 
                  stroke="#94a3b8" 
                  strokeWidth={2} 
                  strokeDasharray="5 5" 
                  name="Ideal Burndown"
                  dot={{ fill: '#94a3b8', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Velocity Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Weekly Velocity</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={velocityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }} 
                />
                <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Status Distribution and Team Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Task Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  dataKey="count"
                  label={({ status, percentage }) => `${status}: ${percentage}%`}
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Team Performance */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Team Performance</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {teamMetrics.map((member, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-800">{member.assignee}</p>
                  <p className="text-sm text-slate-600">
                    {member.completed}/{member.total} tasks • {member.completedPoints}/{member.points} points
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-slate-800">{member.pointsCompletionRate}%</p>
                  <div className="w-16 bg-slate-200 rounded-full h-2 mt-1">
                    <div 
                      className="h-2 bg-green-500 rounded-full transition-all duration-500"
                      style={{ width: `${member.pointsCompletionRate}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedBoardAnalytics;