// components/Analytics/AnalyticsTab.tsx
import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, Target, Activity, Award, AlertTriangle, Clock, Zap } from 'lucide-react';
import { Task, Board, ContributorMetrics, VelocityData } from '../../../store/types/types';
import BurndownManager from './BurnDown';

interface AnalyticsTabProps {
  tasks: Task[];
  board: Board;
}

const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ tasks, board }) => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  // Get task points
  const getTaskPoints = (task: Task): number => {
    if ((task as any).points) return (task as any).points;
    return task.priority === 'High' ? 8 : task.priority === 'Medium' ? 5 : 3;
  };

  // Calculate contributor metrics
  const contributorMetrics = useMemo((): ContributorMetrics[] => {
    const contributors = [...new Set(tasks.map(t => t.assignedTo).filter(Boolean))];
    
    return contributors.map(contributor => {
      const contributorTasks = tasks.filter(t => t.assignedTo === contributor);
      const completedTasks = contributorTasks.filter(t => t.status === 'Done' || t.status === 'done');
      
      const pointsCompleted = completedTasks.reduce((sum, task) => sum + getTaskPoints(task), 0);
      
      // Calculate average cycle time
      const tasksWithCycleTime = completedTasks.filter(task => {
        const startLog = task.progressLog?.find(log => 
          log.type === 'status-change' && 
          (log.desc.includes('In Progress') || log.desc.includes('inprogress'))
        );
        const completionLog = task.progressLog?.find(log => 
          log.type === 'status-change' && 
          (log.desc.includes('done') || log.desc.includes('Done'))
        );
        return startLog && completionLog;
      });
      
      const avgCycleTime = tasksWithCycleTime.length > 0 
        ? tasksWithCycleTime.reduce((sum, task) => {
            const startLog = task.progressLog?.find(log => 
              log.type === 'status-change' && 
              (log.desc.includes('In Progress') || log.desc.includes('inprogress'))
            );
            const completionLog = task.progressLog?.find(log => 
              log.type === 'status-change' && 
              (log.desc.includes('done') || log.desc.includes('Done'))
            );
            if (startLog && completionLog) {
              const startDate = startLog.timestamp?.toDate?.() || new Date();
              const endDate = completionLog.timestamp?.toDate?.() || new Date();
              return sum + Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            }
            return sum;
          }, 0) / tasksWithCycleTime.length
        : 0;
      
      const efficiency = contributorTasks.length > 0 ? (completedTasks.length / contributorTasks.length) * 100 : 0;
      
      return {
        name: contributor,
        taskCount: contributorTasks.length,
        pointsCompleted,
        averageCycleTime: Math.round(avgCycleTime * 10) / 10,
        efficiency: Math.round(efficiency)
      };
    }).sort((a, b) => b.pointsCompleted - a.pointsCompleted);
  }, [tasks]);

  // Calculate velocity data
  const velocityData = useMemo((): VelocityData[] => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const periodsCount = Math.min(5, Math.floor(days / 7)); // Weekly periods
    const data = [];
    
    for (let i = 0; i < periodsCount; i++) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (i + 1) * 7);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - i * 7);
      
      const periodTasks = tasks.filter(task => {
        const completionLog = task.progressLog?.find(log => 
          log.type === 'status-change' && 
          (log.desc.includes('done') || log.desc.includes('Done'))
        );
        const completedDate = completionLog?.timestamp?.toDate?.();
        return completedDate && completedDate >= startDate && completedDate <= endDate;
      });
      
      const completed = periodTasks.reduce((sum, task) => sum + getTaskPoints(task), 0);
      const planned = completed + Math.floor(Math.random() * 10); // Mock planned data
      
      data.unshift({
        period: `Week ${periodsCount - i}`,
        completed,
        planned,
        velocity: completed
      });
    }
    
    return data;
  }, [tasks, timeRange]);

  // Current sprint tasks
  const currentSprintTasks = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    return tasks.filter(task => {
      const createdDate = task.createdAt?.toDate?.() || new Date(task.createdAt);
      return createdDate >= thirtyDaysAgo;
    });
  }, [tasks]);

  // Calculate sprint metrics
  const sprintMetrics = useMemo(() => {
    const totalPoints = currentSprintTasks.reduce((sum, task) => sum + getTaskPoints(task), 0);
    const completedTasks = currentSprintTasks.filter(t => t.status === 'Done' || t.status === 'done');
    const completedPoints = completedTasks.reduce((sum, task) => sum + getTaskPoints(task), 0);
    const inProgressTasks = currentSprintTasks.filter(t => t.status === 'In Progress' || t.status === 'inprogress');
    
    const avgVelocity = velocityData.length > 0 
      ? velocityData.reduce((sum, d) => sum + d.velocity, 0) / velocityData.length 
      : 0;
    
    const projectedCompletion = avgVelocity > 0 
      ? Math.ceil((totalPoints - completedPoints) / avgVelocity)
      : 0;
    
    return {
      totalTasks: currentSprintTasks.length,
      totalPoints,
      completedPoints,
      inProgressTasks: inProgressTasks.length,
      completionRate: totalPoints > 0 ? ((completedPoints / totalPoints) * 100).toFixed(1) : '0',
      avgVelocity: Math.round(avgVelocity * 10) / 10,
      projectedCompletion,
      remainingPoints: totalPoints - completedPoints
    };
  }, [currentSprintTasks, velocityData]);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Sprint Analytics</h2>
            <p className="text-slate-600">Track velocity, performance, and team contributions</p>
          </div>
          <div className="flex gap-2">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                }`}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
            <div className="flex items-center gap-3">
              <Target size={20} className="text-blue-600" />
              <div>
                <p className="text-sm text-blue-600 font-medium">Current Sprint</p>
                <p className="text-2xl font-bold text-blue-800">{sprintMetrics.totalTasks}</p>
                <p className="text-xs text-blue-600">{sprintMetrics.totalPoints} total points</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg border border-green-200 p-4">
            <div className="flex items-center gap-3">
              <TrendingUp size={20} className="text-green-600" />
              <div>
                <p className="text-sm text-green-600 font-medium">Velocity</p>
                <p className="text-2xl font-bold text-green-800">{sprintMetrics.avgVelocity}</p>
                <p className="text-xs text-green-600">points/week avg</p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 rounded-lg border border-purple-200 p-4">
            <div className="flex items-center gap-3">
              <Activity size={20} className="text-purple-600" />
              <div>
                <p className="text-sm text-purple-600 font-medium">Progress</p>
                <p className="text-2xl font-bold text-purple-800">{sprintMetrics.completionRate}%</p>
                <p className="text-xs text-purple-600">{sprintMetrics.completedPoints} completed</p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg border border-orange-200 p-4">
            <div className="flex items-center gap-3">
              <Clock size={20} className="text-orange-600" />
              <div>
                <p className="text-sm text-orange-600 font-medium">Projection</p>
                <p className="text-2xl font-bold text-orange-800">{sprintMetrics.projectedCompletion}</p>
                <p className="text-xs text-orange-600">weeks to complete</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Burndown Chart */}
      <BurndownManager board={board} tasks={tasks} />

      {/* Velocity and Contributors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Velocity Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Velocity Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={velocityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="period" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="completed" fill="#10B981" name="Completed Points" />
                <Bar dataKey="planned" fill="#94a3b8" name="Planned Points" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Team Contributions */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Team Contributions</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={contributorMetrics.slice(0, 6)}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="pointsCompleted"
                  nameKey="name"
                >
                  {contributorMetrics.slice(0, 6).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name) => [`${value} points`, 'Completed']}
                  labelFormatter={(label) => `${label}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Contributor Performance */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-6">Team Performance</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Highest Contributors */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Award size={20} className="text-green-600" />
              <h4 className="font-semibold text-green-800">Top Performers</h4>
            </div>
            <div className="space-y-3">
              {contributorMetrics.slice(0, 5).map((contributor, index) => (
                <div key={contributor.name} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 
                      index === 2 ? 'bg-amber-600' : 'bg-green-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-slate-800">{contributor.name}</div>
                      <div className="text-sm text-slate-600">{contributor.taskCount} tasks</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-700">{contributor.pointsCompleted} pts</div>
                    <div className="text-sm text-slate-600">{contributor.efficiency}% efficiency</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Areas for Improvement */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={20} className="text-orange-600" />
              <h4 className="font-semibold text-orange-800">Growth Opportunities</h4>
            </div>
            <div className="space-y-3">
              {contributorMetrics
                .filter(c => c.efficiency < 80 || c.averageCycleTime > 5)
                .slice(0, 5)
                .map((contributor, index) => (
                <div key={contributor.name} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm">
                      {contributor.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-slate-800">{contributor.name}</div>
                      <div className="text-sm text-slate-600">
                        {contributor.averageCycleTime > 5 ? 'Long cycle time' : 'Low completion rate'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-orange-700">{contributor.averageCycleTime}d</div>
                    <div className="text-sm text-slate-600">{contributor.efficiency}% efficiency</div>
                  </div>
                </div>
              ))}
              {contributorMetrics.filter(c => c.efficiency < 80 || c.averageCycleTime > 5).length === 0 && (
                <div className="text-center py-4 text-slate-500">
                  <Zap size={32} className="mx-auto mb-2 text-green-400" />
                  <p className="text-sm">Great job! Team is performing well</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Current Sprint Tasks */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Current Sprint Tasks</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Todo */}
          <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
            <h4 className="font-medium text-slate-700 mb-3">To Do</h4>
            <div className="space-y-2">
              {currentSprintTasks
                .filter(t => t.status === 'Todo' || t.status === 'todo')
                .slice(0, 5)
                .map(task => (
                <div key={task.id} className="p-2 bg-white rounded border text-sm">
                  <div className="font-medium text-slate-800 truncate">{task.title}</div>
                  <div className="text-slate-600 text-xs">
                    {getTaskPoints(task)} pts • {task.assignedTo || 'Unassigned'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* In Progress */}
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
            <h4 className="font-medium text-blue-700 mb-3">In Progress</h4>
            <div className="space-y-2">
              {currentSprintTasks
                .filter(t => t.status === 'In Progress' || t.status === 'inprogress')
                .slice(0, 5)
                .map(task => (
                <div key={task.id} className="p-2 bg-white rounded border text-sm">
                  <div className="font-medium text-slate-800 truncate">{task.title}</div>
                  <div className="text-slate-600 text-xs">
                    {getTaskPoints(task)} pts • {task.assignedTo || 'Unassigned'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Done */}
          <div className="bg-green-50 rounded-lg border border-green-200 p-4">
            <h4 className="font-medium text-green-700 mb-3">Done</h4>
            <div className="space-y-2">
              {currentSprintTasks
                .filter(t => t.status === 'Done' || t.status === 'done')
                .slice(0, 5)
                .map(task => (
                <div key={task.id} className="p-2 bg-white rounded border text-sm">
                  <div className="font-medium text-slate-800 truncate">{task.title}</div>
                  <div className="text-slate-600 text-xs">
                    {getTaskPoints(task)} pts • {task.assignedTo || 'Unassigned'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsTab;