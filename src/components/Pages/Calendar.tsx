// components/Calendar/CompactCalendar.tsx
import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, CheckSquare, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { setSelectedTask } from '../../store/slices/taskSlice';
import { Task } from '../../store/types/types';
import { taskService } from '../../services/taskService';

interface CalendarTask extends Task {
  isSubtask?: boolean;
  parentTaskTitle?: string;
  boardTitle?: string;
}

interface CompactCalendarProps {
  boards: any[];
  onClose: () => void;
}

const CompactCalendar: React.FC<CompactCalendarProps> = ({ boards, onClose }) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const [calendarTasks, setCalendarTasks] = useState<CalendarTask[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // Fetch calendar tasks
  useEffect(() => {
    const fetchCalendarTasks = async () => {
      if (!user || boards.length === 0) {
        setCalendarTasks([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const calendarTasksData: CalendarTask[] = [];
        
        for (const board of boards) {
          const tasks = await taskService.fetchBoardTasks(user.uid, board.id);
          
          for (const task of tasks) {
            // Only add tasks assigned to the current user
            const isAssignedToUser = task.assignedTo && task.assignedTo.email === user.email;
            
            // Add main task if it has a due date and is assigned to current user
            if (task.dueDate && isAssignedToUser) {
              calendarTasksData.push({
                ...task,
                boardTitle: board.title,
                isSubtask: false
              });
            }

            // Fetch and add subtasks with due dates (only if parent task is assigned to user)
            if (isAssignedToUser) {
              try {
                const subtasks = await taskService.fetchChildTasks(user.uid, board.id, task.id);
                for (const subtask of subtasks) {
                  // Only add subtasks assigned to the current user
                  const isSubtaskAssignedToUser = subtask.assignedTo && subtask.assignedTo.email === user.email;
                  if (subtask.dueDate && isSubtaskAssignedToUser) {
                    calendarTasksData.push({
                      ...subtask,
                      boardTitle: board.title,
                      isSubtask: true,
                      parentTaskTitle: task.title
                    });
                  }
                }
              } catch (error) {
                // Error('Error fetching subtasks:', error);
              }
            }
          }
        }

        setCalendarTasks(calendarTasksData);
      } catch (error) {
        // Error('Error fetching calendar tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCalendarTasks();
  }, [user, boards]);

  // Calendar helper functions
  const isOverdue = (task: CalendarTask) => {
    if (!task.dueDate || task.status === 'done') return false;
    const taskDate = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return taskDate < today;
  };

  const getTasksForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return calendarTasks.filter(task => 
      task.dueDate && task.dueDate.startsWith(dateStr)
    );
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Render compact monthly calendar
  const renderCompactCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="h-16 border border-slate-200 bg-slate-50"></div>
      );
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const tasksForDay = getTasksForDate(date);
      const isCurrentDay = isToday(date);

      days.push(
        <div 
          key={day} 
          className={`h-16 border border-slate-200 p-1 overflow-hidden ${
            isCurrentDay 
              ? 'bg-blue-50 border-blue-300' 
              : 'bg-white hover:bg-slate-50'
          }`}
        >
          <div className={`text-xs font-medium mb-1 ${
            isCurrentDay ? 'text-blue-600' : 'text-slate-600'
          }`}>
            {day}
          </div>
          
          <div className="space-y-0.5">
            {tasksForDay.slice(0, 2).map((task) => {
              const taskIsOverdue = isOverdue(task);
              const taskColor = task.status === 'done' 
                ? 'bg-gray-200 text-gray-600' 
                : taskIsOverdue 
                ? 'bg-red-200 text-red-700' 
                : 'bg-green-200 text-green-700';
              
              return (
                <div
                  key={task.id}
                  onClick={() => dispatch(setSelectedTask(task))}
                  className={`text-xs px-1 py-0.5 rounded cursor-pointer ${taskColor} hover:opacity-80 transition-opacity`}
                  title={`${task.isSubtask ? `[${task.parentTaskTitle}] ` : ''}${task.title} - ${task.boardTitle}`}
                >
                  <div className="flex items-center gap-1">
                    {task.isSubtask && <CheckSquare size={6} />}
                    <span className="truncate text-xs">
                      {task.title.length > 8 ? task.title.substring(0, 8) + '...' : task.title}
                    </span>
                  </div>
                </div>
              );
            })}
            
            {tasksForDay.length > 2 && (
              <div className="text-xs text-slate-400 px-1">
                +{tasksForDay.length - 2}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-7 gap-0 border border-slate-200 rounded-lg overflow-hidden">
        {/* Day headers */}
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
          <div key={index} className="h-6 border-b border-slate-200 bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-600">
            {day}
          </div>
        ))}
        {days}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Compact Header */}
      <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-slate-600" />
            <span className="font-medium text-slate-800 text-sm">My Tasks Calendar</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-200 text-slate-500 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* Navigation */}
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-slate-700">
            {getMonthYear(currentDate)}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-1 rounded hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={goToToday}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => navigateMonth('next')}
              className="p-1 rounded hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Compact Legend */}
        <div className="flex gap-3 mb-3 text-xs text-slate-600">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-200 rounded"></div>
            <span>Todo</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-red-200 rounded"></div>
            <span>Overdue</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckSquare size={8} className="text-slate-500" />
            <span>Subtask</span>
          </div>
        </div>

        {/* Calendar Grid */}
        {calendarTasks.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Calendar size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm">No tasks assigned to you with due dates</p>
            <p className="text-xs text-slate-400 mt-1">Tasks assigned to you will appear here</p>
          </div>
        ) : (
          renderCompactCalendar()
        )}
      </div>
    </div>
  );
};

export default CompactCalendar;