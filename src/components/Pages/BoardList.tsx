// components/Pages/BoardList.tsx - Updated Layout
import React, { useState, useEffect } from 'react';
import { Plus, X, Calendar } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { useBoardsSync } from '../../hooks/useFirebaseSync';
import { createBoard } from '../../store/slices/boardSlice';
import { Board, Task } from '../../store/types/types';
import { taskService } from '../../services/taskService';
import { setSelectedTask } from '../../store/slices/taskSlice';
import BoardCard from '../Templates/BoardCard';
import TaskStats from '../TaskStats';
import CreateBoardForm from '../Forms/CreateBoardForm';
import TaskModal from './TaskModal';
import ErrorModal from '../Atoms/ErrorModal';
import CompactCalendar from './Calendar';
import SprintPlanning from './Analytics/SprintPlanning';

const BoardList: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const { loading, error } = useAppSelector(state => state.boards);
  const { selectedTask } = useAppSelector(state => state.tasks);
  const boards = useBoardsSync();
  const [showForm, setShowForm] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState("");

  // Fetch all tasks from all boards
  useEffect(() => {
    const fetchAllTasks = async () => {
      if (!user || boards.length === 0) {
        setAllTasks([]);
        setTasksLoading(false);
        return;
      }

      setTasksLoading(true);
      try {
        const taskPromises = boards.map(board => 
          taskService.fetchBoardTasks(user.uid, board.id)
        );
        
        const boardTasks = await Promise.all(taskPromises);
        const combinedTasks = boardTasks.flat();
        setAllTasks(combinedTasks);
        setTasksError("");
      } catch (error) {
        console.error('Error fetching tasks:', error);
        setTasksError("Failed to load task statistics");
        setAllTasks([]);
      } finally {
        setTasksLoading(false);
      }
    };

    fetchAllTasks();
  }, [user, boards]);

  const handleCreateBoard = async (boardData: Omit<Board, 'id'>) => {
    if (!user) return;
    
    try {
      await dispatch(createBoard({ userId: user.uid, boardData })).unwrap();
      setShowForm(false);
    } catch (error) {
      console.error('Failed to create board:', error);
    }
  };

  // Calculate user stats for Task Overview
  const myTasks = allTasks.filter(task => 
    task.assignedTo?.name === user?.displayName || 
    task.assignedTo?.email === user?.email ||
    (task.createdBy && (task.createdBy.email === user?.email || task.createdBy.uid === user?.uid))
  ).length;

  const tasksWithDueDates = allTasks.filter(task => task.dueDate).length;

  if (loading && boards.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading boards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Project Boards</h1>
            <p className="text-slate-600">Organize and track your projects efficiently</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Show Calendar Button */}
            {tasksWithDueDates > 0 && (
              <button
                onClick={() => setShowCalendar(true)}
                className="flex items-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold shadow-sm hover:shadow-md transition-all duration-300"
              >
                <Calendar size={20} />
                Show Calendar
              </button>
            )}
            {/* Create Board Button */}
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <Plus size={20} />
              Create Board
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex gap-6">
          {/* Left Sidebar - Task Stats */}
          <div className="w-72 flex-shrink-0">
            {tasksLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : tasksError ? (
              <div className="text-center py-8">
                <div className="text-red-400 text-xl mb-2">⚠️</div>
                <p className="text-sm text-red-600">{tasksError}</p>
              </div>
            ) : (
              <TaskStats tasks={allTasks} />
            )}
          </div>

          {/* Main Boards Area */}
          <div className="flex-1">
            {boards.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-slate-400 text-6xl mb-4">📋</div>
                <h3 className="text-xl font-semibold text-slate-600 mb-2">No boards yet</h3>
                <p className="text-slate-500 mb-6">Create your first project board to get started</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="flex items-center gap-2 mx-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <Plus size={20} />
                  Create Your First Board
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {boards.map((board) => (
                  <BoardCard key={board.id} board={board} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Calendar Modal */}
      {showCalendar && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div 
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white rounded-t-2xl border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <Calendar size={24} className="text-blue-600" />
                <h3 className="text-xl font-bold text-slate-800">Task Calendar</h3>
              </div>
              <button
                onClick={() => setShowCalendar(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <CompactCalendar 
                boards={boards} 
                onClose={() => setShowCalendar(false)} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Create Board Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div 
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative z-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white rounded-t-2xl border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10 relative">
              <h3 className="text-xl font-bold text-slate-800">Create New Board</h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 relative z-0">
              <CreateBoardForm
                onSubmit={handleCreateBoard}
                onCancel={() => setShowForm(false)}
                loading={loading}
                existingBoards={boards}
                user={user}
              />
            </div>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => dispatch(setSelectedTask(null))}
          existingTasks={allTasks}
        />
      )}
      
      {error && <ErrorModal message={error} onClose={() => {}} />}
    </div>
  );
};

export default BoardList;