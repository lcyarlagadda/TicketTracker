// components/TaskStats.tsx - Updated to exclude child tasks
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

  // Filter out child tasks (subtasks) - only count main/parent tasks
  const mainTasks = tasks.filter(task => !task.parentTaskId);

  // Calculate different task categories (for main tasks only)
  const priorityTasks = mainTasks.filter(t =>
    t.priority === 'High' && t.status !== 'done' && t.status !== 'completed' && t.assignedTo === user?.uid
  ).length;

  const overdueTasks = mainTasks.filter(t =>
    t.dueDate &&
    new Date(t.dueDate) < today &&
    t.status !== 'done' &&
    t.status !== 'completed' &&
   t.assignedTo === user?.uid
  ).length;

  const upcomingTasks = mainTasks.filter(t => {
    if (!t.dueDate || t.status === 'done' || t.status === 'completed' || t.assignedTo !== user?.uid) return false;
    const taskDate = new Date(t.dueDate);
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return taskDate >= new Date() && taskDate <= nextWeek;
  }).length;

  const pendingTasks = mainTasks.filter(t =>
    t.status !== 'done' && t.status !== 'completed' && t.assignedTo === user?.uid
  ).length;

  const completedTasks = mainTasks.filter(t =>
    t.status === 'done' || t.status === 'completed' && t.assignedTo === user?.uid
  ).length;

  return (
    <div className="w-56">
      <div className="space-y-3">

        {/* Priority Tasks */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-2 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">{priorityTasks}</h3>
              <p className="text-red-100 text-xs font-medium">High Priority Tasks</p>
            </div>
            <div className="text-base opacity-60">🔥</div>
          </div>
        </div>

        {/* Overdue Tasks */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-2 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">{overdueTasks}</h3>
              <p className="text-orange-100 text-xs font-medium">Overdue Tasks</p>
            </div>
            <div className="text-base opacity-60">⚠️</div>
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-2 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">{upcomingTasks}</h3>
              <p className="text-blue-100 text-xs font-medium">Due This Week</p>
            </div>
            <div className="text-base opacity-60">📅</div>
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg p-2 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">{pendingTasks}</h3>
              <p className="text-yellow-100 text-xs font-medium">Pending Tasks</p>
            </div>
            <div className="text-base opacity-60">⏳</div>
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-2 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">{completedTasks}</h3>
              <p className="text-green-100 text-xs font-medium">Completed Tasks</p>
            </div>
            <div className="text-base opacity-60">✅</div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TaskStats;