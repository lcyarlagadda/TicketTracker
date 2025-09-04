// components/TaskStats.tsx - Updated Compact Version
import React from 'react';
import { useAppSelector } from '../hooks/redux';
import { Task } from '../store/types/types';

interface TaskStatsProps {
  tasks: Task[];
}

const TaskStats: React.FC<TaskStatsProps> = ({ tasks }) => {
  const { user } = useAppSelector(state => state.auth);
  
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  // Calculate different task categories (for all tasks, not just user's)
  const priorityTasks = tasks.filter(t => 
    t.priority === 'High' && t.status !== 'done' && t.status !== 'completed'
  ).length;
  
  const overdueTasks = tasks.filter(t => 
    t.dueDate && 
    new Date(t.dueDate) < today && 
    t.status !== 'done' && 
    t.status !== 'completed'
  ).length;
  
  const upcomingTasks = tasks.filter(t => {
    if (!t.dueDate || t.status === 'done' || t.status === 'completed') return false;
    const taskDate = new Date(t.dueDate);
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return taskDate >= new Date() && taskDate <= nextWeek;
  }).length;
  
  const pendingTasks = tasks.filter(t => 
    t.status !== 'done' && t.status !== 'completed'
  ).length;

  const totalTasks = tasks.length;

  if (totalTasks === 0) {
    return (
      <div className="w-72">
        <div className="text-center py-8">
          <div className="text-slate-300 text-4xl mb-3">📋</div>
          <p className="text-sm text-slate-500">No tasks yet</p>
          <p className="text-xs text-slate-400">Create some tasks to see stats</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-72">
      <div className="space-y-3">
        {/* Priority Tasks */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-3 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold">{priorityTasks}</h3>
              <p className="text-red-100 text-xs font-medium">Priority Tasks</p>
            </div>
            <div className="text-lg opacity-60">🔥</div>
          </div>
        </div>

        {/* Overdue Tasks */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-3 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold">{overdueTasks}</h3>
              <p className="text-orange-100 text-xs font-medium">Overdue Tasks</p>
            </div>
            <div className="text-lg opacity-60">⚠️</div>
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-3 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold">{upcomingTasks}</h3>
              <p className="text-blue-100 text-xs font-medium">Upcoming Tasks</p>
            </div>
            <div className="text-lg opacity-60">📅</div>
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg p-3 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold">{pendingTasks}</h3>
              <p className="text-yellow-100 text-xs font-medium">Pending Tasks</p>
            </div>
            <div className="text-lg opacity-60">⏳</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskStats;