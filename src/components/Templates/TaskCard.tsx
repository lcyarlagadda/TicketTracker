// components/Templates/TaskCard.tsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Pencil, Trash2, UserCircle, Calendar, CheckSquare, Square, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { deleteTask } from '../../store/slices/taskSlice';
import { taskService } from '../../services/taskService';
import { Task } from '../../store/types/types';
import ConfirmModal from '../Atoms/ConfirmModal';

interface TaskCardProps {
  task: Task;
  index: number;
  onClick: (task: Task) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, index, onClick }) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const { currentBoard } = useAppSelector(state => state.boards);
  const [showConfirm, setShowConfirm] = useState(false);
  const [childTasks, setChildTasks] = useState<Task[]>([]);
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [copied, setCopied] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  console.log(`TaskCard ${task.id}:`, { isDragging, transform });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityConfig = {
    Low: { 
      gradient: 'from-green-400 to-green-600',
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200'
    },
    Medium: { 
      gradient: 'from-yellow-400 to-orange-500',
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      border: 'border-yellow-200'
    },
    High: { 
      gradient: 'from-red-400 to-red-600',
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200'
    },
  };

  const taskTypeConfig = {
    epic: { 
      bg: 'bg-violet-100',
      text: 'text-violet-700',
      border: 'border-violet-200',
      label: 'Epic'
    },
    feature: { 
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      border: 'border-blue-200',
      label: 'Feature'
    },
    story: { 
      bg: 'bg-green-100',
      text: 'text-green-700',
      border: 'border-green-200',
      label: 'Story'
    },
    bug: { 
      bg: 'bg-red-100',
      text: 'text-red-700',
      border: 'border-red-200',
      label: 'Bug'
    },
    enhancement: { 
      bg: 'bg-orange-100',
      text: 'text-orange-700',
      border: 'border-orange-200',
      label: 'Enhancement'
    },
    subtask: { 
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      border: 'border-gray-200',
      label: 'Subtask'
    },
    poc: { 
      bg: 'bg-yellow-100',
      text: 'text-yellow-700',
      border: 'border-yellow-200',
      label: 'POC'
    },
  };

  const config = priorityConfig[task.priority] || priorityConfig.Low;
  const typeConfig = taskTypeConfig[task.type as keyof typeof taskTypeConfig] || taskTypeConfig.story;

  // Listen to child tasks
  useEffect(() => {
    if (!user || !currentBoard) return;
    
    const unsubscribe = taskService.subscribeToChildTasks(
      user.uid,
      currentBoard.id,
      task.id,
      (childTasksData) => {
        setChildTasks(childTasksData);
      }
    );

    return () => unsubscribe();
  }, [user, currentBoard, task.id]);

  const getSubtaskProgress = () => {
    const total = childTasks.length;
    const completed = childTasks.filter(ct => ct.status === 'done').length;
    return { total, completed, percentage: total > 0 ? (completed / total) * 100 : 0 };
  };

  const progress = getSubtaskProgress();

  const handleDelete = async () => {
    if (!user || !currentBoard) return;
    
    try {
      await dispatch(deleteTask({
        userId: user.uid,
        boardId: currentBoard.id,
        taskId: task.id
      })).unwrap();
    } catch (err) {
      // Error('Failed to delete task:', err);
    } finally {
      setShowConfirm(false);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onClick(task);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowConfirm(true);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(task);
  };

  const handleSubtaskToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSubtasks(!showSubtasks);
  };

  const handleCopyTaskId = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    try {
      await navigator.clipboard.writeText(task.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Error('Failed to copy task ID:', err);
    }
  };


  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`group bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 p-2 mb-2 ${
          isDragging 
            ? 'opacity-30 shadow-lg' 
            : 'hover:border-slate-300'
        }`}
      >
        {/* Colorful top border based on priority */}
        <div className={`h-1 w-full rounded-t-lg ${config.gradient}`}></div>
        
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-2 mb-3 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100 border border-slate-300 shadow-sm hover:shadow-md"
        >
          <div className="text-xs text-slate-600 flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <circle cx="3" cy="3" r="1"/>
              <circle cx="9" cy="3" r="1"/>
              <circle cx="3" cy="6" r="1"/>
              <circle cx="9" cy="6" r="1"/>
              <circle cx="3" cy="9" r="1"/>
              <circle cx="9" cy="9" r="1"/>
            </svg>
          </div>
        </div>
        
        <div onClick={handleCardClick}>
              {/* Header with Task ID and Actions */}
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCopyTaskId}
                    className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-xs font-mono text-slate-600 transition-colors duration-150"
                    title="Copy Task ID"
                  >
                    {copied ? <Check size={10} /> : <Copy size={10} />}
                    {task.id.slice(-8)}
                  </button>
                  <div className={`px-1.5 py-0.5 rounded text-xs font-medium ${typeConfig.bg} ${typeConfig.border} border ${typeConfig.text}`}>
                    {typeConfig.label}
                  </div>
                </div>
                
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <button
                    onClick={handleEditClick}
                    className="p-1 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors duration-150"
                    title="Edit Task"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={handleDeleteClick}
                    className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors duration-150"
                    title="Delete Task"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {/* Task Title */}
              <h4 className="font-semibold text-slate-800 leading-tight mb-1 group-hover:text-slate-900 transition-colors text-sm">
                {task.title}
              </h4>

              {childTasks.length > 0 && (
                <div className="mb-1">
                  <div 
                    className="flex items-center justify-between p-1.5 bg-emerald-50 rounded-md cursor-pointer hover:bg-emerald-100 transition-colors"
                    onClick={handleSubtaskToggle}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex items-center text-emerald-600">
                        {showSubtasks ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        <CheckSquare size={14} className="ml-1" />
                      </div>
                      <span className="text-xs font-medium text-emerald-700">
                        Subtasks ({progress.completed}/{progress.total})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-12 bg-emerald-200 rounded-full h-1">
                        <div 
                          className="h-1 bg-emerald-600 rounded-full transition-all duration-300"
                          style={{ width: `${progress.percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-emerald-600 font-semibold">
                        {Math.round(progress.percentage)}%
                      </span>
                    </div>
                  </div>

                  {showSubtasks && (
                    <div className="mt-1.5 space-y-1 pl-1.5">
                      {childTasks.map((subtask) => (
                        <div key={subtask.id} className="flex items-center gap-1.5 p-1.5 bg-slate-50 rounded-lg">
                          <div className="text-emerald-500">
                            {subtask.status === 'done' ? (
                              <CheckSquare size={12} />
                            ) : (
                              <Square size={12} />
                            )}
                          </div>
                          <span className={`text-xs flex-1 ${
                            subtask.status === 'done' 
                              ? 'line-through text-slate-500' 
                              : 'text-slate-700'
                          }`}>
                            {subtask.title}
                          </span>
                          {subtask.priority && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                              subtask.priority === 'High' ? 'bg-red-100 text-red-600' :
                              subtask.priority === 'Medium' ? 'bg-yellow-100 text-yellow-600' :
                              'bg-green-100 text-green-600'
                            }`}>
                              {subtask.priority.charAt(0)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 mb-2 p-1.5 bg-slate-50 rounded-lg">
                <UserCircle size={14} className="text-slate-500" />
                {task.assignedTo ? (
                  <div>
                    <p className="text-xs text-slate-500">Assigned to</p>
                    <p className="text-xs text-slate-700 font-medium">
                      {task.assignedTo.name}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 font-medium">Unassigned</p>
                )}
              </div>

              
              {task.epics?.length > 0 && (
                <div className="flex flex-wrap gap-0.5">
                  {task.epics.slice(0, 2).map((epic, idx) => (
                    <span
                      key={idx}
                      className="text-xs text-purple-600 bg-purple-100 rounded-full px-1.5 py-0.5 border border-purple-200"
                    >
                      #{epic}
                    </span>
                  ))}
                  {task.epics.length > 2 && (
                    <span className="text-xs text-slate-500 bg-slate-50 rounded-full px-1.5 py-0.5">
                      +{task.epics.length - 2}
                    </span>
                  )}
                </div>
              )}
              
              {/* Bottom badges for priority and due date */}
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text} border ${config.border}`}>
                  {task.priority}
                </div>
                {task.dueDate && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-200">
                    <Calendar size={10} />
                    {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}
                  </div>
                )}
              </div>
        </div>
      </div>

      {showConfirm && createPortal(
        <ConfirmModal
          message="Are you sure you want to delete this task?"
          onConfirm={handleDelete}
          onCancel={() => setShowConfirm(false)}
        />,
        document.body
      )}
    </>
  );
};

export default TaskCard;