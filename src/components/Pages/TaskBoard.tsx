// components/Pages/TaskBoard.tsx
import React, { useEffect, useState, useMemo } from "react";
import { DragDropContext, Droppable, DropResult } from "@hello-pangea/dnd";
import { Plus, Users, Minus, X, Edit, Trash2, Search, Filter, UserCheck, Tag, UserRound, BarChart3, MessageSquare, BookOpen, Target } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { useTasksSync } from "../../hooks/useFirebaseSync";
import {
  fetchBoard,
  updateBoard,
  updateCurrentBoardStatuses,
  updateCurrentBoardCollaborators,
} from "../../store/slices/boardSlice";
import {
  updateTask,
  createTask,
  setSelectedTask,
} from "../../store/slices/taskSlice";
import { Task } from "../../store/types/types";
import TaskCard from "../Templates/TaskCard";
import TaskModal from "./TaskModal";
import TaskStats from "../TaskStats";
import CreateTaskForm from "../Forms/CreateTaskForm";
import ErrorModal from "../Atoms/ErrorModal";
import { useNavigate } from "react-router-dom";

interface TaskBoardProps {
  boardId: string;
}

const TaskBoard: React.FC<TaskBoardProps> = ({ boardId }) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { currentBoard, loading } = useAppSelector((state) => state.boards);
  const { selectedTask } = useAppSelector((state) => state.tasks);
  const tasks = useTasksSync(boardId); // Real-time sync
  const navigate = useNavigate();
  
  // Get collaborators from currentBoard, ensuring we have the latest data
  const collaborators = currentBoard?.collaborators || [];
  
  console.log('Current board collaborators:', collaborators); // Debug log

  // State variables
  const [formOpen, setFormOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusIndex, setNewStatusIndex] = useState<number | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [error, setError] = useState("");
  const [showCollaboratorInput, setShowCollaboratorInput] = useState(false);
  const [newCollaborator, setNewCollaborator] = useState("");
  const [newCollaboratorName, setNewCollaboratorName] = useState("");
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [moveToColumn, setMoveToColumn] = useState<string>("");

  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Get unique assignees and tags from tasks
  const uniqueAssignees = useMemo(() => {
    const assignees = new Set<string>();
    tasks.forEach(task => {
      if (task.assignedTo) {
        assignees.add(task.assignedTo);
      }
    });
    return Array.from(assignees);
  }, [tasks]);

  const uniqueTags = useMemo(() => {
    const tags = new Set<string>();
    tasks.forEach(task => {
      if (task.tags && task.tags.length > 0) {
        task.tags.forEach(tag => tags.add(tag));
      }
    });
    return Array.from(tags);
  }, [tasks]);

  // Filtered tasks based on search and filters (excluding subtasks)
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Exclude subtasks from main board view
      if (task.parentTaskId) return false;
      
      // Search filter
      const matchesSearch = searchTerm === "" || 
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.id.toLowerCase().includes(searchTerm.toLowerCase());

      // Assignee filter
      const matchesAssignee = selectedAssignees.length === 0 || 
        (task.assignedTo && selectedAssignees.includes(task.assignedTo));

      // Tags filter
      const matchesTags = selectedTags.length === 0 || 
        (task.tags && task.tags.some(tag => selectedTags.includes(tag)));

      return matchesSearch && matchesAssignee && matchesTags;
    });
  }, [tasks, searchTerm, selectedAssignees, selectedTags]);

  // Fetch board data on mount
  useEffect(() => {
    if (user && boardId) {
      dispatch(fetchBoard({ userId: user.uid, boardId }));
    }
  }, [user, boardId, dispatch]);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || !user || !currentBoard) return;

    const { draggableId, destination, source } = result;
    const newStatus = destination.droppableId;
    const oldStatus = source.droppableId;

    if (newStatus === oldStatus && destination.index === source.index) return;

    const taskToUpdate = tasks.find((t) => t.id === draggableId);
    if (!taskToUpdate || taskToUpdate.status === newStatus) return;

    const updatedProgressLog = [
      ...(taskToUpdate.progressLog || []),
      {
        type: "status-change" as const,
        desc: `Task status changed from ${taskToUpdate.status} to ${newStatus}`,
        timestamp: new Date(),
        user: user.displayName || user.email,
      },
    ];

    dispatch(
      updateTask({
        userId: user.uid,
        boardId,
        taskId: draggableId,
        updates: { status: newStatus, progressLog: updatedProgressLog },
      })
    );
  };

   const AnalyticsNavigation = () => (
    <div className="bg-white/95 backdrop-blur-md border-b border-slate-200/60 px-6 py-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Board Tools</h3>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/board/${boardId}/planning`)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm hover:shadow-md"
          >
            <Target size={16} />
            <span className="hidden sm:inline">Planning</span>
          </button>
          <button
            onClick={() => navigate(`/board/${boardId}/analytics`)}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-sm hover:shadow-md"
          >
            <BarChart3 size={16} />
            <span className="hidden sm:inline">Analytics</span>
          </button>
          <button
            onClick={() => navigate(`/board/${boardId}/retro`)}
            className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium shadow-sm hover:shadow-md"
          >
            <MessageSquare size={16} />
            <span className="hidden sm:inline">Retrospective</span>
          </button>
          <button
            onClick={() => navigate(`/board/${boardId}/reflection`)}
            className="flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium shadow-sm hover:shadow-md"
          >
            <BookOpen size={16} />
            <span className="hidden sm:inline">Reflection</span>
          </button>
        </div>
      </div>
    </div>
  );

  const handleAddColumn = async () => {
    const columnName = newColumnName.trim();
    if (!columnName || !user || !currentBoard) {
      setError("Column name is required.");
      return;
    }

    if (currentBoard.statuses.includes(columnName)) {
      setError("A column with that name already exists.");
      return;
    }

    const updatedStatuses = [...currentBoard.statuses, columnName];

    try {
      await dispatch(
        updateBoard({
          userId: user.uid,
          boardId: currentBoard.id,
          updates: { statuses: updatedStatuses },
        })
      ).unwrap();

      dispatch(updateCurrentBoardStatuses(updatedStatuses));
      setNewColumnName("");
      setShowAddColumn(false);
    } catch (error) {
      setError("Failed to add column.");
    }
  };

  const deleteColumnDirectly = async (statusToDelete: string) => {
    if (!user || !currentBoard) return;

    const updatedStatuses = currentBoard.statuses.filter((s) => s !== statusToDelete);

    try {
      await dispatch(
        updateBoard({
          userId: user.uid,
          boardId: currentBoard.id,
          updates: { statuses: updatedStatuses },
        })
      ).unwrap();

      dispatch(updateCurrentBoardStatuses(updatedStatuses));
    } catch (error) {
      setError("Failed to delete column.");
    }
  };

  const handleDeleteColumn = async (statusToDelete: string) => {
    if (!user || !currentBoard) return;

    // Check if there are tasks in this column
    const tasksInColumn = tasks.filter((task) => task.status === statusToDelete);
    
    if (tasksInColumn.length > 0) {
      // Show confirmation dialog to move tasks
      setShowDeleteConfirm(statusToDelete);
      setMoveToColumn(currentBoard.statuses.find(s => s !== statusToDelete) || "");
      return;
    }

    // If no tasks, delete directly
    await deleteColumnDirectly(statusToDelete);
  };

  const confirmDeleteColumn = async () => {
    if (!showDeleteConfirm || !user || !currentBoard || !moveToColumn) return;

    const tasksInColumn = tasks.filter((task) => task.status === showDeleteConfirm);

    try {
      // Move all tasks to the selected column
      for (const task of tasksInColumn) {
        const updatedProgressLog = [
          ...(task.progressLog || []),
          {
            type: "status-change" as const,
            desc: `Task moved from deleted column "${showDeleteConfirm}" to "${moveToColumn}"`,
            timestamp: new Date(),
            user: user.displayName || user.email,
          },
        ];

        await dispatch(
          updateTask({
            userId: user.uid,
            boardId,
            taskId: task.id,
            updates: { 
              status: moveToColumn, 
              progressLog: updatedProgressLog 
            },
          })
        );
      }

      // Now delete the column
      await deleteColumnDirectly(showDeleteConfirm);
      setShowDeleteConfirm(null);
      setMoveToColumn("");
    } catch (error) {
      setError("Failed to delete column and move tasks.");
    }
  };

  const handleAddCollaborator = async () => {
    const email = newCollaborator.trim();
    const name = newCollaboratorName.trim();

    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!valid) {
      setError("Invalid email address.");
      return;
    }

    if (!name) {
      setError("Collaborator name is required.");
      return;
    }

    if (!user || !currentBoard) return;

    const alreadyExists = currentBoard.collaborators.some(
      (c) => c.email === email
    );
    if (!alreadyExists) {
      const updatedCollaborators = [
        ...currentBoard.collaborators,
        { name, email },
      ];

      try {
        await dispatch(
          updateBoard({
            userId: user.uid,
            boardId: currentBoard.id,
            updates: { collaborators: updatedCollaborators },
          })
        ).unwrap();

        dispatch(updateCurrentBoardCollaborators(updatedCollaborators));
        setNewCollaborator("");
        setNewCollaboratorName("");
      } catch (error) {
        setError("Failed to add collaborator.");
      }
    }
  };

  const handleRemoveCollaborator = async (email: string) => {
    if (!user || !currentBoard) return;

    try {
      const updatedCollaborators = currentBoard.collaborators.filter(
        (c) => c.email !== email
      );

      await dispatch(
        updateBoard({
          userId: user.uid,
          boardId: currentBoard.id,
          updates: { collaborators: updatedCollaborators },
        })
      ).unwrap();

      dispatch(updateCurrentBoardCollaborators(updatedCollaborators));
    } catch (error) {
      setError("Failed to remove collaborator.");
    }
  };

  const handleCreateTask = async (taskData: Omit<Task, "id" | "boardId">) => {
    if (!user) return;

    try {
      await dispatch(
        createTask({
          userId: user.uid,
          boardId,
          taskData: {
            ...taskData,
            createdBy: {
              uid: user.uid,
              email: user.email,
              name: user.displayName || user.email,
            },
          },
        })
      ).unwrap();
      setFormOpen(false);
    } catch (error) {
      setError("Failed to create task");
    }
  };

  const handleRenameStatus = async (oldStatus: string) => {
    if (
      !user ||
      !currentBoard ||
      !newStatusName.trim() ||
      newStatusName === oldStatus
    ) {
      setEditingStatus(null);
      return;
    }

    if (currentBoard.statuses.includes(newStatusName.trim())) {
      setError("A column with that name already exists.");
      return;
    }

    const updatedStatuses = currentBoard.statuses.map((s) =>
      s === oldStatus ? newStatusName.trim() : s
    );

    try {
      await dispatch(
        updateBoard({
          userId: user.uid,
          boardId,
          updates: { statuses: updatedStatuses },
        })
      ).unwrap();

      dispatch(updateCurrentBoardStatuses(updatedStatuses));

      // Update all tasks with the old status
      const tasksToUpdate = tasks.filter((task) => task.status === oldStatus);
      for (const task of tasksToUpdate) {
        dispatch(
          updateTask({
            userId: user.uid,
            boardId,
            taskId: task.id,
            updates: { status: newStatusName.trim() },
          })
        );
      }

      setEditingStatus(null);
      setNewStatusName("");
    } catch (error) {
      setError("Failed to rename status");
    }
  };

  const tasksByStatus = (status: string) =>
    filteredTasks.filter((task) => task.status === status);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedAssignees([]);
    setSelectedTags([]);
  };

  const hasActiveFilters = searchTerm !== "" || selectedAssignees.length > 0 || selectedTags.length > 0;

  if (loading || !currentBoard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading board...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-100 to-blue-100 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`bg-white border-r-2 border-slate-200/60 shadow-xl transition-all duration-300 ${
          sidebarCollapsed ? "w-18" : "w-80"
        } flex-shrink-0 relative z-20`}
      >
        <div className="p-6 border-b border-slate-200/60 bg-gradient-to-r from-blue-600 to-blue-600">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <h2 className="text-white font-bold text-lg">Project Hub</h2>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all duration-200"
            >
              {sidebarCollapsed ? <Users size={20} /> : <Minus size={20} />}
            </button>
          </div>
        </div>

        {!sidebarCollapsed && (
          <div className="p-6 overflow-y-auto h-full">
            {/* Team Members Section */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-100">
                    <Users size={18} className="text-indigo-600" />
                  </div>
                  <h3 className="font-bold text-slate-800">Team</h3>
                </div>
                <button
                  onClick={() =>
                    setShowCollaboratorInput(!showCollaboratorInput)
                  }
                  className={`p-2 rounded-xl transition-all duration-200 ${
                    showCollaboratorInput
                      ? "bg-red-100 text-red-600 hover:bg-red-200"
                      : "bg-indigo-100 text-indigo-600 hover:bg-indigo-200"
                  }`}
                >
                  {showCollaboratorInput ? <X size={16} /> : <Plus size={16} />}
                </button>
              </div>

              {/* Add Collaborator Form */}
              <div
                className={`transition-all duration-300 overflow-hidden ${
                  showCollaboratorInput
                    ? "max-h-60 opacity-100 mb-4"
                    : "max-h-0 opacity-0"
                }`}
              >
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-2">
                      Email
                    </label>
                    <input
                      value={newCollaborator}
                      onChange={(e) => setNewCollaborator(e.target.value)}
                      placeholder="colleague@company.com"
                      className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-2">
                      Name
                    </label>
                    <input
                      value={newCollaboratorName}
                      onChange={(e) => setNewCollaboratorName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <button
                    onClick={() => {
                      handleAddCollaborator();
                      setShowCollaboratorInput(false);
                    }}
                    className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-2 px-4 rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                  >
                    Add Member
                  </button>
                </div>
              </div>

              {/* Team Members List */}
              <div className="space-y-3">
                {collaborators.map(
                  (c, idx) =>
                    c.email !== user?.email && (
                      <div
                        key={idx}
                        className="group flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-200/60 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-600 rounded-full flex items-center justify-center shadow-md">
                            <span className="text-white text-sm font-bold">
                              {c.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">
                              {c.name.length > 15
                              ? `${c.name.slice(0, 10)}...`
                              : c.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {c.email.length > 15 ? `${c.email.slice(0, 10)}...` : c.email}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveCollaborator(c.email)}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 hover:bg-red-100 p-2 rounded-xl transition-all duration-200"
                          title="Remove member"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )
                )}

                {collaborators.filter((c) => c.email !== user?.email).length ===
                  0 && (
                    <div className="text-center py-8">
                    <div className="flex justify-center mb-3">
                      <UserRound size={32} className="text-slate-300" />
                    </div>
                    <p className="text-sm text-slate-500">
                      No team members yet
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Add collaborators to get started
                    </p>
                    </div>
                )}
              </div>
            </div>

            {/* Task Stats */}
            <div className="border-t border-slate-200/60 pt-6">
              <TaskStats tasks={filteredTasks} />
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{
              backgroundImage: `url(${
                currentBoard.imageUrl || "/default-board.png"
              })`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-white/90 to-blue-100/90"></div>
        </div>

        <div className="relative z-10 h-full flex flex-col">
          {/* Header */}
          <div className="flex-shrink-0 p-6 pb-4">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  {currentBoard.title}
                </h1>
                <p className="text-slate-600 mt-1">
                  Manage your project tasks efficiently
                </p>
              </div>
              <button
                onClick={() => setFormOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 hover:scale-105"
              >
                <Plus size={20} />
                Add Task
              </button>
            </div>

             <AnalyticsNavigation />

            {/* Search and Filter Controls */}
            <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/60 shadow-lg p-4 mb-4">
              <div className="flex flex-col gap-4">
                {/* Search Bar and Filter Toggle */}
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search tasks by title, description, or ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-4 py-2 rounded-xl font-medium text-sm transition-colors flex items-center gap-2 ${
                      showFilters || hasActiveFilters
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                    }`}
                  >
                    <Filter size={16} />
                    Filters
                    {hasActiveFilters && (
                      <span className="bg-white text-blue-600 text-xs px-2 py-1 rounded-full font-bold">
                        {(searchTerm ? 1 : 0) + selectedAssignees.length + selectedTags.length}
                      </span>
                    )}
                  </button>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="px-4 py-2 bg-red-100 text-red-600 rounded-xl font-medium text-sm hover:bg-red-200 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Filter Controls */}
                {showFilters && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                    {/* Assignee Filter */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                        <UserCheck size={16} />
                        Assigned To
                      </label>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {uniqueAssignees.map(assignee => (
                          <label key={assignee} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={selectedAssignees.includes(assignee)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAssignees([...selectedAssignees, assignee]);
                                } else {
                                  setSelectedAssignees(selectedAssignees.filter(a => a !== assignee));
                                }
                              }}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-slate-600">{assignee}</span>
                          </label>
                        ))}
                        {uniqueAssignees.length === 0 && (
                          <p className="text-sm text-slate-400">No assigned tasks yet</p>
                        )}
                      </div>
                    </div>

                    {/* Tags Filter */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                        <Tag size={16} />
                        Tags
                      </label>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {uniqueTags.map(tag => (
                          <label key={tag} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={selectedTags.includes(tag)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTags([...selectedTags, tag]);
                                } else {
                                  setSelectedTags(selectedTags.filter(t => t !== tag));
                                }
                              }}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-slate-600 px-2 py-1 bg-slate-100 rounded-lg text-xs">
                              {tag}
                            </span>
                          </label>
                        ))}
                        {uniqueTags.length === 0 && (
                          <p className="text-sm text-slate-400">No tags found</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Create Task Form */}
            {formOpen && (
              <CreateTaskForm
                board={currentBoard}
                onSubmit={handleCreateTask}
                onCancel={() => setFormOpen(false)}
                existingTasks={tasks}
              />
            )}
          </div>

          {/* Kanban Board Container */}
          <div className="flex-1 min-h-0">
            <div className="h-full overflow-auto px-6">
              <DragDropContext onDragEnd={handleDragEnd}>
                <div className="flex gap-6 pb-6" style={{ width: 'max-content', minWidth: '100%' }}>
                  {currentBoard.statuses.map((status, index) => (
                    <div
                      key={status}
                      className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/60 shadow-xl flex-shrink-0 group"
                      style={{ width: '320px' }}
                    >
                      {/* Column Header */}
                      <div className="p-6 border-b border-slate-200/60">
                        <div className="flex justify-between items-center">
                          {editingStatus === status ? (
                            <input
                              value={newStatusName}
                              onChange={(e) => setNewStatusName(e.target.value)}
                              onBlur={() => handleRenameStatus(status)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleRenameStatus(status);
                                if (e.key === "Escape") {
                                  setEditingStatus(null);
                                  setNewStatusName("");
                                }
                              }}
                              className="border-2 border-blue-500 p-2 rounded-xl text-sm mr-2 flex-1 focus:outline-none"
                              autoFocus
                            />
                          ) : (
                            <div className="flex items-center gap-2 flex-1">
                              <h3 className="text-lg font-bold capitalize flex-1 text-slate-800">
                                {status}
                              </h3>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => {
                                    setEditingStatus(status);
                                    setNewStatusName(status);
                                  }}
                                  className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-100 transition-all"
                                  title="Rename column"
                                >
                                  <Edit size={14} />
                                </button>
                                {currentBoard.statuses.length > 1 && (
                                  <button
                                    onClick={() => handleDeleteColumn(status)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-100 transition-all"
                                    title="Delete column"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full ml-2">
                            {tasksByStatus(status).length} tasks
                          </span>
                        </div>
                      </div>

                      {/* Droppable Area */}
                      <Droppable droppableId={status} type="TASK">
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`p-4 transition-all duration-200 ${
                              snapshot.isDraggingOver
                                ? "bg-blue-50/80 border-2 border-dashed border-blue-300 rounded-xl"
                                : ""
                            }`}
                            style={{
                              minHeight: '200px'
                            }}
                          >
                            <div className="space-y-4">
                              {tasksByStatus(status).map((task, index) => (
                                <div
                                  key={task.id}
                                  style={{
                                    position: 'relative',
                                    zIndex: 1001
                                  }}
                                >
                                  <TaskCard
                                    task={task}
                                    index={index}
                                    onClick={(task) =>
                                      dispatch(setSelectedTask(task))
                                    }
                                  />
                                </div>
                              ))}
                            </div>
                            {provided.placeholder}
                            <div style={{ minHeight: '20px' }} />
                          </div>
                        )}
                      </Droppable>
                    </div>
                  ))}
                  
                  {/* Add Column Button */}
                  <div 
                    className="flex-shrink-0 flex items-start" 
                    style={{ 
                      width: '100px',
                      minWidth: '100px'
                    }}
                  >
                    {showAddColumn ? (
                      <div className="bg-white/95 backdrop-blur-md rounded-2xl border-2 border-dashed border-blue-300 shadow-xl p-4" style={{ width: '300px' }}>
                        <div className="space-y-3">
                          <input
                            value={newColumnName}
                            onChange={(e) => setNewColumnName(e.target.value)}
                            placeholder="Column name..."
                            className="w-full border-2 border-blue-400 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleAddColumn();
                              if (e.key === "Escape") {
                                setShowAddColumn(false);
                                setNewColumnName("");
                              }
                            }}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleAddColumn}
                              className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                            >
                              Add
                            </button>
                            <button
                              onClick={() => {
                                setShowAddColumn(false);
                                setNewColumnName("");
                              }}
                              className="flex-1 bg-slate-200 text-slate-600 py-2 px-3 rounded-lg text-sm font-medium hover:bg-slate-300 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowAddColumn(true)}
                        className="w-16 h-16 bg-white/70 backdrop-blur-md rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 flex items-center justify-center group"
                        title="Add new column"
                      >
                        <Plus size={24} className="text-slate-400 group-hover:text-blue-500" />
                      </button>
                    )}
                  </div>
                </div>
              </DragDropContext>
            </div>
          </div>
        </div>
      </main>

      {/* Create Task Modal */}
      {formOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div 
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative z-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white rounded-t-2xl border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10 relative">
              <h3 className="text-xl font-bold text-slate-800">Create New Task</h3>
              <button
                onClick={() => setFormOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 relative z-0">
              <CreateTaskForm
                board={currentBoard}
                onSubmit={handleCreateTask}
                onCancel={() => setFormOpen(false)}
                existingTasks={tasks}
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
        />
      )}

      {/* Delete Column Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-800 mb-2">Delete Column</h3>
              <p className="text-slate-600">
                The column "<span className="font-semibold">{showDeleteConfirm}</span>" contains {tasks.filter(t => t.status === showDeleteConfirm).length} task(s). 
                Where would you like to move them?
              </p>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Move tasks to:
              </label>
              <select
                value={moveToColumn}
                onChange={(e) => setMoveToColumn(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select a column...</option>
                {currentBoard?.statuses
                  .filter(s => s !== showDeleteConfirm)
                  .map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))
                }
              </select>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(null);
                  setMoveToColumn("");
                }}
                className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteColumn}
                disabled={!moveToColumn}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors"
              >
                Delete Column
              </button>
            </div>
          </div>
        </div>
      )}

      <ErrorModal message={error} onClose={() => setError("")} />
    </div>
  );
};

export default TaskBoard;