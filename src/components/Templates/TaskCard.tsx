// components/Templates/TaskCard.tsx
import React, { useState, useEffect } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Pencil, Trash2, UserCircle, Calendar, CheckSquare, Square, ChevronDown, ChevronRight } from 'lucide-react';
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

  const config = priorityConfig[task.priority] || priorityConfig.Low;

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
      console.error('Failed to delete task:', err);
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

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';

  return (
    <>
      <Draggable draggableId={task.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`group relative bg-white rounded-xl border border-slate-200 shadow-lg hover:shadow-xl cursor-pointer transition-all duration-300 overflow-hidden ${
              snapshot.isDragging 
                ? 'rotate-2 scale-105 z-50 shadow-2xl' 
                : 'hover:scale-[1.02]'
            }`}
            style={{
              ...provided.draggableProps.style,
              ...(snapshot.isDragging && { 
                transform: `${provided.draggableProps.style?.transform} rotate(2deg)`,
                zIndex: 1000 
              })
            }}
            onClick={handleCardClick}
          >
            <div className={`h-1 bg-gradient-to-r ${config.gradient}`}></div>
            
            <div className="p-4">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-bold text-slate-800 leading-tight flex-1 pr-2 group-hover:text-slate-900 transition-colors">
                  {task.title}
                </h4>
                
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                  <button
                    onClick={handleEditClick}
                    className="p-1.5 rounded-lg hover:bg-blue-100 text-slate-400 hover:text-blue-600 transition-colors"
                    title="Edit Task"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={handleDeleteClick}
                    className="p-1.5 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors"
                    title="Delete Task"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {childTasks.length > 0 && (
                <div className="mb-3">
                  <div 
                    className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg cursor-pointer hover:bg-emerald-100 transition-colors"
                    onClick={handleSubtaskToggle}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex items-center text-emerald-600">
                        {showSubtasks ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        <CheckSquare size={14} className="ml-1" />
                      </div>
                      <span className="text-sm font-medium text-emerald-700">
                        Subtasks ({progress.completed}/{progress.total})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-emerald-200 rounded-full h-1.5">
                        <div 
                          className="h-1.5 bg-emerald-600 rounded-full transition-all duration-300"
                          style={{ width: `${progress.percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-emerald-600 font-semibold">
                        {Math.round(progress.percentage)}%
                      </span>
                    </div>
                  </div>

                  {showSubtasks && (
                    <div className="mt-2 space-y-1 pl-2">
                      {childTasks.map((subtask) => (
                        <div key={subtask.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
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

              <div className="flex items-center gap-2 mb-3 p-2 bg-slate-50 rounded-lg">
                <UserCircle size={16} className="text-slate-500" />
                <div>
                  <p className="text-xs text-slate-500">Assigned to</p>
                  <p className="text-sm text-slate-700 font-medium">
                    {task.assignedTo || 'Unassigned'}
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center mb-3">
                <div className={`px-2 py-1 rounded-lg ${config.bg} ${config.border} border`}>
                  <span className={`text-xs font-semibold ${config.text}`}>
                    {task.priority}
                  </span>
                </div>
                
                {task.dueDate && (
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                    isOverdue 
                      ? 'bg-red-50 border border-red-200 text-red-700' 
                      : 'bg-blue-50 border border-blue-200 text-blue-700'
                  }`}>
                    <Calendar size={12} />
                    {new Date(task.dueDate).toLocaleDateString()}
                  </div>
                )}
              </div>
              
              {task.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {task.tags.slice(0, 3).map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-xs text-slate-600 bg-slate-100 rounded-full px-2 py-1"
                    >
                      #{tag}
                    </span>
                  ))}
                  {task.tags.length > 3 && (
                    <span className="text-xs text-slate-500 bg-slate-50 rounded-full px-2 py-1">
                      +{task.tags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Draggable>

      {showConfirm && (
        <ConfirmModal
          message="Are you sure you want to delete this task?"
          onConfirm={handleDelete}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
};

export default TaskCard;