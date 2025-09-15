// components/Pages/TaskBoard.tsx - Enhanced with Sprint Management, Task Types, and Epic Support
import React, { useEffect, useState, useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  rectIntersection,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  useDroppable,
} from "@dnd-kit/core";
import {
  Plus,
  Users,
  Minus,
  X,
  Edit,
  Trash2,
  Search,
  Filter,
  UserCheck,
  Crown,
  UserRound,
  BarChart3,
  MessageSquare,
  BookOpen,
  Target,
  Calendar,
  Clock,
  TrendingUp,
  Play,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Zap,
  Layers,
  Calendar1Icon,
  AlertCircle,
  Shield,
} from "lucide-react";
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
import { fetchSprints } from "../../store/slices/sprintSlice";
import { Task, Sprint } from "../../store/types/types";
import TaskCard from "../Templates/TaskCard";
import TaskModal from "./TaskModal";
import TaskStats from "../TaskStats";
import CreateTaskForm from "../Forms/CreateTaskForm";
import ConfirmModal from "../Atoms/ConfirmModal";
import RoleManagementModal from "../Atoms/RoleManagementModal";
import ErrorModal from "../Atoms/ErrorModal";
import { useNavigate } from "react-router-dom";
import { notificationService } from "../../services/notificationService";
import { boardService } from "../../services/boardService";
import FilterSection from "../Atoms/Filter";
import { hasPermissionLegacy, getRoleDisplayName } from "../../utils/permissions";

// Droppable Column Component - Simplified
const DroppableColumn: React.FC<{
  status: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  children: React.ReactNode;
}> = ({ status, tasks, onTaskClick, children }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });


  return (
    <div
      ref={setNodeRef}
      className={`bg-slate-50 border border-slate-200 rounded-xl shadow-sm flex flex-col transition-all duration-200 ${
        isOver ? "bg-blue-50 border-blue-300 shadow-md" : "hover:shadow-md"
      }`}
      style={{ 
        width: "260px", 
        minWidth: "260px",
        height: "calc(100vh - 200px)",
        minHeight: "calc(100vh - 200px)"
      }}
    >
      {children}
      
      {/* Droppable Area */}
      <div
        className="p-4 flex-1 overflow-y-auto bg-white rounded-b-xl"
        style={{
          minHeight: "calc(100vh - 300px)"
        }}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div>
            {tasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                onClick={onTaskClick}
              />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  );
};

interface TaskBoardProps {
  boardId: string;
}

const TaskBoard: React.FC<TaskBoardProps> = ({ boardId }) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { currentBoard, loading } = useAppSelector((state) => state.boards);
  const { selectedTask } = useAppSelector((state) => state.tasks);
  const { sprints } = useAppSelector((state) => state.sprints);
  const tasks = useTasksSync(boardId);
  const navigate = useNavigate();

  // Get collaborators from currentBoard
  const collaborators = currentBoard?.collaborators || [];

  // State variables
  const [formOpen, setFormOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [newStatusName, setNewStatusName] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [teamSectionCollapsed, setTeamSectionCollapsed] = useState(false);
  const [error, setError] = useState("");
  const [showCollaboratorInput, setShowCollaboratorInput] = useState(false);
  const [newCollaborator, setNewCollaborator] = useState("");
  const [newCollaboratorName, setNewCollaboratorName] = useState("");
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [collaboratorToDelete, setCollaboratorToDelete] = useState<string | null>(null);
  const [columnToDelete, setColumnToDelete] = useState<string | null>(null);
  const [moveToColumn, setMoveToColumn] = useState<string>("");
  const [showRoleManagement, setShowRoleManagement] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedEpics, setSelectedEpics] = useState<string[]>([]);
  const [selectedSprints, setSelectedSprints] = useState<string[]>([]);

  // Current active sprint for board header
  const [currentSprint, setCurrentSprint] = useState<Sprint | null>(null);

  // Get unique assignees, epics, and sprints from tasks
  const uniqueAssignees = useMemo(() => {
    const assignees = new Set<string>();
    tasks.forEach((task) => {
      if (task.assignedTo) {
        assignees.add(task.assignedTo.name);
      }
    });
    return Array.from(assignees);
  }, [tasks]);

  const uniqueEpics = useMemo(() => {
    const epics = new Set<string>();
    tasks.forEach((task) => {
      if (task.epics && task.epics.length > 0) {
        task.epics.forEach((epic) => epics.add(epic));
      }
      if(task.type === "epic" && task.title) {
        epics.add(task.title);
      }
    });
    return Array.from(epics);
  }, [tasks]);

  const uniqueSprints = useMemo(() => {
    const sprintNames = new Set<string>();
    tasks.forEach((task) => {
      if (task.sprintId) {
        const sprint = sprints.find((s) => s.id === task.sprintId);
        if (sprint) {
          sprintNames.add(sprint.name);
        }
      } else {
        sprintNames.add("Backlog");
      }
    });
    return Array.from(sprintNames);
  }, [tasks, sprints]);

  // Filtered tasks based on search and filters
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Exclude subtasks from main board view
      if (task.parentTaskId) return false;

      // Search filter
      const matchesSearch =
        searchTerm === "" ||
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.id.toLowerCase().includes(searchTerm.toLowerCase());

      // Assignee filter
      const matchesAssignee =
        selectedAssignees.length === 0 ||
        (selectedAssignees.includes('Unassigned') && !task.assignedTo) ||
        (task.assignedTo && selectedAssignees.includes(task.assignedTo.name));

      // Epic filter
      const matchesEpic =
        selectedEpics.length === 0 ||
        (task.epics && task.epics.some((epic) => selectedEpics.includes(epic))) || task.type === "epic" && task.title && selectedEpics.includes(task.title);

      // Sprint filter
      const matchesSprint =
        selectedSprints.length === 0 ||
        (task.sprintId &&
          selectedSprints.includes(
            sprints.find((s) => s.id === task.sprintId)?.name || ""
          )) ||
        (!task.sprintId && selectedSprints.includes("Backlog"));

      return matchesSearch && matchesAssignee && matchesEpic && matchesSprint;
    });
  }, [
    tasks,
    searchTerm,
    selectedAssignees,
    selectedEpics,
    selectedSprints,
    sprints,
  ]);

  // Fetch board data and sprints on mount
  useEffect(() => {
    if (user && boardId) {
      dispatch(fetchBoard({ userId: user.uid, boardId }));
      dispatch(fetchSprints({ userId: user.uid, boardId }));
    }
  }, [user, boardId, dispatch]);

  // Close teams component when board is opened
  useEffect(() => {
    if (currentBoard) {
      setTeamSectionCollapsed(true);
    }
  }, [currentBoard]);

  // Set current active sprint
  useEffect(() => {
    const activeSprint = sprints.find((sprint) => sprint.status === "active");
    setCurrentSprint(activeSprint || null);
  }, [sprints]);

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    
    const { active, over } = event;
    
    if (!over || !user || !currentBoard) {
      setActiveId(null);
      return;
    }

    const taskId = active.id as string;
    let newStatus = over.id as string;

    // If the drop target is a task card, find which column it belongs to
    if (!currentBoard.statuses.includes(newStatus)) {
      const targetTask = tasks.find(t => t.id === newStatus);
      if (targetTask) {
        newStatus = targetTask.status;
      } else {
        console.error('Invalid drop target:', newStatus, 'Available:', currentBoard.statuses);
        setActiveId(null);
        return;
      }
    }

    const taskToUpdate = tasks.find((t) => t.id === taskId);
    if (!taskToUpdate) {
      console.error('Task not found:', taskId);
      setActiveId(null);
      return;
    }
    
    if (taskToUpdate.status === newStatus) {
      setActiveId(null);
      return;
    }


    const updatedProgressLog = [
      ...(taskToUpdate.progressLog || []),
      {
        type: "status-change" as const,
        desc: `Task status changed from ${taskToUpdate.status} to ${newStatus}`,
        timestamp: new Date().toISOString(),
        user: user.displayName || user.email,
      },
    ];

    try {
      dispatch(
        updateTask({
          userId: user.uid,
          boardId,
          taskId: taskId,
          updates: { status: newStatus, progressLog: updatedProgressLog },
        })
      );
    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      setActiveId(null);
    }
  };

  // Enhanced Board Tools Component with Sprint Context
  const BoardTools = () => {
    const currentSprintNumber = currentSprint?.sprintNumber;

    return (
      <div className="flex gap-2">
        <button
          onClick={() => navigate(`/board/${boardId}/planning`)}
          className="flex items-center gap-1 px-2 tablet:px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm hover:shadow-md"
        >
          <Target size={14} />
          <span className="hidden laptop:inline">Planning</span>
        </button>
        {currentSprint && (
          <>
            <button
              onClick={() =>
                navigate(
                  `/board/${boardId}/${currentSprintNumber}/analytics/`
                )
              }
              className="flex items-center gap-1 px-2 tablet:px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-sm hover:shadow-md"
            >
              <BarChart3 size={14} />
              <span className="hidden laptop:inline">Analytics</span>
            </button>
            <button
              onClick={() =>
                navigate(
                   `/board/${boardId}/${currentSprintNumber}/retro/`
                )
              }
              className="flex items-center gap-1 px-2 tablet:px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium shadow-sm hover:shadow-md"
            >
              <MessageSquare size={14} />
              <span className="hidden laptop:inline">Retro</span>
            </button>
            <button
              onClick={() =>
                navigate(
                   `/board/${boardId}/${currentSprintNumber}/reflection/`
                )
              }
              className="flex items-center gap-1 px-2 tablet:px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium shadow-sm hover:shadow-md"
            >
              <BookOpen size={14} />
              <span className="hidden laptop:inline">Reflection</span>
            </button>
          </>
        )}
      </div>
    );
  };

  // Rest of the existing handlers (keeping them unchanged)
  const handleAddColumn = async () => {
    const columnName = newColumnName.trim().toLowerCase();
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

    // Check if user has permission to manage columns
    if (!hasPermissionLegacy(currentBoard, user.email || '', 'canManageColumns')) {
      setError("Access denied: Only managers and admins can delete columns.");
      return;
    }

    const updatedStatuses = currentBoard.statuses.filter(
      (s) => s !== statusToDelete
    );

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
    // handleDeleteColumn called
    if (!user || !currentBoard) return;

    // Check if user has permission to manage columns
    if (!hasPermissionLegacy(currentBoard, user.email || '', 'canManageColumns')) {
      setError("Access denied: Only managers and admins can delete columns.");
      return;
    }

    const tasksInColumn = tasks.filter(
      (task) => task.status === statusToDelete
    );

    // Tasks in column checked

    // Always show confirmation dialog for column deletion
    // Setting columnToDelete
    setColumnToDelete(statusToDelete);
    setMoveToColumn(
      currentBoard.statuses.find((s) => s !== statusToDelete) || ""
    );
  };

  const confirmDeleteColumn = async () => {
    if (!columnToDelete || !user || !currentBoard) return;

    // Check if user has permission to manage columns
    if (!hasPermissionLegacy(currentBoard, user.email || '', 'canManageColumns')) {
      setError("Access denied: Only managers and admins can delete columns.");
      setColumnToDelete(null);
      return;
    }

    const tasksInColumn = tasks.filter(
      (task) => task.status === columnToDelete
    );

    // For columns with tasks, we need a moveToColumn
    if (tasksInColumn.length > 0 && !moveToColumn) return;

    try {
      // Move tasks to the selected column (if there are any tasks)
      if (tasksInColumn.length > 0) {
        for (const task of tasksInColumn) {
          const updatedProgressLog = [
            ...(task.progressLog || []),
            {
              type: "status-change" as const,
              desc: `Task moved from deleted column "${columnToDelete}" to "${moveToColumn}"`,
              timestamp: new Date().toISOString(),
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
                progressLog: updatedProgressLog,
              },
            })
          );
        }
      }

      await deleteColumnDirectly(columnToDelete);
      setColumnToDelete(null);
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
        { name, email, role: 'user' as const },
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

        // Share board with the new collaborator
        await boardService.shareBoardWithCollaborator(
          user.uid,
          currentBoard.id,
          email,
          'user'
        );

        // Send notification email in background
        const boardUrl = `${window.location.origin}/board/${boardId}`;
        notificationService.notifyCollaboratorAdded({
          collaboratorEmail: email,
          collaboratorName: name,
          boardName: currentBoard.title,
          addedBy: user.displayName || user.email || 'Unknown User',
          boardUrl,
        });
        // Collaborator notification queued for sending

        setNewCollaborator("");
        setNewCollaboratorName("");
      } catch (error) {
        setError("Failed to add collaborator.");
      }
    }
  };

  const handleRemoveCollaborator = (email: string) => {
    setCollaboratorToDelete(email);
  };

  const confirmRemoveCollaborator = async () => {
    if (!user || !currentBoard || !collaboratorToDelete) return;

    try {
      const updatedCollaborators = currentBoard.collaborators.filter(
        (c) => c.email !== collaboratorToDelete
      );

      await dispatch(
        updateBoard({
          userId: user.uid,
          boardId: currentBoard.id,
          updates: { collaborators: updatedCollaborators },
        })
      ).unwrap();

      dispatch(updateCurrentBoardCollaborators(updatedCollaborators));

      // Remove board access for the collaborator
      // Note: We need to find the collaborator's userId to remove their access
      // For now, we'll remove from pending access and the user will lose access on next login
      try {
        await boardService.unshareBoardWithCollaborator(collaboratorToDelete, currentBoard.id);
      } catch (error) {
        // Error('Error removing board access:', error);
        // Continue anyway as the collaborator is removed from the list
      }

      setCollaboratorToDelete(null);
    } catch (error) {
      setError("Failed to remove collaborator.");
      setCollaboratorToDelete(null);
    }
  };

  const handleUpdateRole = async (collaboratorEmail: string, newRole: 'admin' | 'manager' | 'user') => {
    if (!user || !currentBoard) return;

    try {
      const updatedCollaborators = currentBoard.collaborators.map(collab => 
        collab.email === collaboratorEmail 
          ? { ...collab, role: newRole }
          : collab
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
      setError("Failed to update role.");
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
    const trimmedNewName = newStatusName.trim().toLowerCase();
    if (
      !user ||
      !currentBoard ||
      !trimmedNewName ||
      trimmedNewName === oldStatus
    ) {
      setEditingStatus(null);
      return;
    }

    // Check if user has permission to manage columns
    if (!hasPermissionLegacy(currentBoard, user.email || '', 'canManageColumns')) {
      setError("Access denied: Only managers and admins can rename columns.");
      setEditingStatus(null);
      return;
    }

    if (currentBoard.statuses.includes(trimmedNewName)) {
      setError("A column with that name already exists.");
      return;
    }

    const updatedStatuses = currentBoard.statuses.map((s) =>
      s === oldStatus ? trimmedNewName : s
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

      const tasksToUpdate = tasks.filter((task) => task.status === oldStatus);
      for (const task of tasksToUpdate) {
        dispatch(
          updateTask({
            userId: user.uid,
            boardId,
            taskId: task.id,
            updates: { status: trimmedNewName },
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
    setSelectedEpics([]);
    setSelectedSprints([]);
  };

  const hasActiveFilters =
    searchTerm !== "" ||
    selectedAssignees.length > 0 ||
    selectedEpics.length > 0 ||
    selectedSprints.length > 0;

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
    <div className="flex flex-col tablet:flex-row h-screen bg-gradient-to-br from-slate-100 to-blue-100 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`bg-white border-r-2 border-slate-200/60 shadow-xl transition-all duration-300 ${
          sidebarCollapsed ? "w-16" : "w-64"
        } flex-shrink-0 relative z-20 hidden tablet:block`}
      >
        <div className="p-4 tablet:p-6 border-b border-slate-200/60 bg-gradient-to-r from-blue-600 to-blue-600">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <h2 className="text-white font-bold text-base tablet:text-lg">Project Hub</h2>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all duration-200"
            >
              {sidebarCollapsed ? <Users size={18} /> : <Minus size={18} />}
            </button>
          </div>
        </div>

        {!sidebarCollapsed && (
          <div className="p-4 tablet:p-6 overflow-y-auto h-full">

            {/* Team Members Section */}
            <div className="mb-6 tablet:mb-8">
              <div className="flex justify-between items-center mb-3 tablet:mb-4">
                <button
                  onClick={() => setTeamSectionCollapsed(!teamSectionCollapsed)}
                  className="flex items-center gap-2"
                >
                  <div className="p-1.5 tablet:p-2 rounded-xl bg-indigo-100">
                    <Users size={16} className="text-indigo-600" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm tablet:text-base">Team</h3>
                  {teamSectionCollapsed ? (
                    <ChevronDown size={14} className="text-slate-600" />
                  ) : (
                    <ChevronUp size={14} className="text-slate-600" />
                  )}
                </button>
                
                {!teamSectionCollapsed && (
                  <div className="flex gap-2">
                    {hasPermissionLegacy(currentBoard, user?.email || '', 'canManageCollaborators') && (
                      <button
                        onClick={() => setShowRoleManagement(true)}
                        className="p-2 rounded-xl bg-purple-100 text-purple-600 hover:bg-purple-200 transition-all duration-200"
                        title="Manage Roles"
                      >
                        <Shield size={16} />
                      </button>
                    )}
                    {hasPermissionLegacy(currentBoard, user?.email || '', 'canManageCollaborators') && (
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
                        {showCollaboratorInput ? (
                          <X size={16} />
                        ) : (
                          <Plus size={16} />
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {!teamSectionCollapsed && (
                <>
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
                          onChange={(e) =>
                            setNewCollaboratorName(e.target.value)
                          }
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
                  <div className="space-y-2 tablet:space-y-3">
                    {collaborators.map(
                      (c, idx) =>
                        c.email !== user?.email && (
                          <div
                            key={idx}
                            className="group flex justify-between items-center p-3 tablet:p-4 bg-slate-50 rounded-2xl border border-slate-200/60 hover:shadow-md transition-all duration-200"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 tablet:w-8 tablet:h-8 bg-gradient-to-br from-blue-600 to-blue-600 rounded-full flex items-center justify-center shadow-md">
                                <span className="text-white text-xs font-bold">
                                  {c.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-slate-800 text-xs tablet:text-sm truncate">
                                    {c.name.length > 20
                                    ? `${c.name.slice(0, 20)}...`
                                    : c.name}
                                  </p>
                                  {/* <span className={`px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800`}>
                                    {getRoleDisplayName(c.role)}
                                  </span> */}
                                </div>
                                <p className="text-xs text-slate-500">
                                  {c.email.length > 10
                                    ? `${c.email.slice(0, 10)}...`
                                    : c.email}
                                </p>
                              </div>
                            </div>
                            {hasPermissionLegacy(currentBoard, user?.email || '', 'canManageCollaborators') && (
                              <button
                                onClick={() => handleRemoveCollaborator(c.email)}
                                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 hover:bg-red-100 p-2 rounded-xl transition-all duration-200"
                                title="Remove member"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        )
                    )}

                    {collaborators.filter((c) => c.email !== user?.email)
                      .length === 0 && (
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
                </>
              )}
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
          {/* Header with Sprint Info */}
          <div className="flex-shrink-0 p-3 tablet:p-4 pb-3">
            <div className="flex flex-col tablet:flex-row tablet:justify-between tablet:items-center gap-4 mb-4">
              <div className="flex items-center gap-4">
                <div>
                  <h1 className="text-2xl tablet:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                    {currentBoard.title}
                  </h1>

                  {currentSprint && (
                    <div className="flex flex-wrap items-center gap-2 tablet:gap-4 mt-2">
                      <div className="flex items-center gap-1 px-2 tablet:px-3 py-1 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full text-xs tablet:text-sm font-medium shadow-sm">
                        <Zap size={14} />
                        <span>{currentSprint.name}</span>
                      </div>
                      {currentSprint.endDate && (
                        <div className="flex items-center gap-1 text-sm text-slate-600">
                          <Calendar1Icon size={14} />
                          <span>
                            {new Date(
                              currentSprint.startDate
                            ).toLocaleDateString()}{" "}
                            -{" "}
                            {new Date(
                              currentSprint.endDate
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <BoardTools />
                <button
                  onClick={() => setFormOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 tablet:px-4 py-2 tablet:py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 hover:scale-105"
                >
                  <Plus size={20} />
                  <span className="hidden tablet:inline">Add Task</span>
                </button>
              </div>
            </div>

            <FilterSection
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              showFilters={showFilters}
              setShowFilters={setShowFilters}
              selectedAssignees={selectedAssignees}
              setSelectedAssignees={setSelectedAssignees}
              selectedEpics={selectedEpics}
              setSelectedEpics={setSelectedEpics}
              selectedSprints={selectedSprints}
              setSelectedSprints={setSelectedSprints}
              uniqueAssignees={uniqueAssignees}
              uniqueEpics={uniqueEpics}
              uniqueSprints={uniqueSprints}
              hasActiveFilters={hasActiveFilters}
              clearFilters={clearFilters}
            />

            {/* Create Task Form */}
            {formOpen && (
              <CreateTaskForm
                board={currentBoard}
                onSubmit={handleCreateTask}
                onCancel={() => setFormOpen(false)}
                existingTasks={tasks}
                sprints={sprints}
              />
            )}
          </div>

          {/* Kanban Board Container */}
          <div className="flex-1 min-h-0">
            <div className="h-full overflow-auto px-2 tablet:px-4 pb-4" style={{ height: "calc(100vh - 120px)" }}>
              <DndContext
                sensors={sensors}
                collisionDetection={rectIntersection}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={(event) => {
                }}
              >
                <div
                  className="flex gap-4 pb-12 overflow-x-auto items-start px-2"
                  style={{ 
                    width: "max-content", 
                    minWidth: "100%",
                    minHeight: "calc(100vh - 200px)"
                  }}
                >
                  {currentBoard.statuses.map((status, index) => (
                    <DroppableColumn
                      key={status}
                      status={status}
                      tasks={tasksByStatus(status)}
                      onTaskClick={(task) => dispatch(setSelectedTask(task))}
                    >
                      {/* Column Header */}
                      <div className="p-4 border-b border-slate-200 flex-shrink-0 bg-white rounded-t-xl group">
                        <div className="flex justify-between items-center gap-3">
                          {editingStatus === status ? (
                            <input
                              value={newStatusName}
                              onChange={(e) => setNewStatusName(e.target.value)}
                              onBlur={() => handleRenameStatus(status)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter")
                                  handleRenameStatus(status);
                                if (e.key === "Escape") {
                                  setEditingStatus(null);
                                  setNewStatusName("");
                                }
                              }}
                              className="border-2 border-blue-500 p-2 rounded-xl text-sm mr-2 flex-1 focus:outline-none"
                              autoFocus
                            />
                          ) : (
                            <div className="flex items-center gap-3 flex-1">
                              <h3 className="text-lg font-semibold capitalize flex-1 text-slate-800">
                                {status}
                              </h3>
                              {hasPermissionLegacy(currentBoard, user?.email || '', 'canManageColumns') && (
                                <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity duration-200">
                                  <button
                                    onClick={() => {
                                      setEditingStatus(status);
                                      setNewStatusName(status);
                                    }}
                                    className="p-1.5 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all duration-150 border border-transparent hover:border-blue-200"
                                    title="Rename column"
                                  >
                                    <Edit size={14} />
                                  </button>
                                  {currentBoard.statuses.length > 1 && (
                                    <button
                                      onClick={() => handleDeleteColumn(status)}
                                      className="p-1.5 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all duration-150 border border-transparent hover:border-red-200"
                                      title="Delete column"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                          <span className="text-xs font-medium text-slate-600 bg-slate-200 px-2 py-1 rounded-full">
                            {tasksByStatus(status).length}
                          </span>
                        </div>
                      </div>
                    </DroppableColumn>
                  ))}

                  {/* Add Column Button */}
                  {hasPermissionLegacy(currentBoard, user?.email || '', 'canManageColumns') && (
                    <div
                      className="flex-shrink-0 flex items-start"
                      style={{
                        width: "100px",
                        minWidth: "100px",
                      }}
                    >
                      {showAddColumn ? (
                      <div
                        className="bg-white/95 backdrop-blur-md rounded-2xl border-2 border-dashed border-blue-300 shadow-xl p-4"
                        style={{ width: "260px" }}
                      >
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
                        <Plus
                          size={24}
                          className="text-slate-400 group-hover:text-blue-500"
                        />
                      </button>
                    )}
                    </div>
                  )}
                </div>
                
                <DragOverlay>
                  {activeId ? (
                    <div className="bg-white border-2 border-slate-300 p-4 m-2 opacity-95 shadow-2xl rounded-xl transform scale-105">
                      {/* Drag indicator */}
                      <div className="p-2 mb-3 bg-slate-100 rounded-lg border border-slate-300">
                        <div className="text-xs text-slate-600 font-medium flex items-center gap-2">
                          <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse"></div>
                          Dragging...
                        </div>
                      </div>
                      
                      {/* Task content */}
                      <div>
                        <div className="font-semibold text-slate-800 text-sm">
                          {tasks.find(t => t.id === activeId)?.title || 'Task'}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {tasks.find(t => t.id === activeId)?.priority || 'Medium'} Priority
                        </div>
                      </div>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
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
              <h3 className="text-xl font-bold text-slate-800">
                Create New Task
              </h3>
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
                sprints={sprints}
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
          sprints={sprints}
          existingTasks={tasks}
        />
      )}

      {/* Delete Column Confirmation Modal */}
      {columnToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle size={24} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Delete Column</h3>
                <p className="text-slate-600 text-sm">This action cannot be undone</p>
              </div>
            </div>

            <div className="mb-6">
              {tasks.filter((t) => t.status === columnToDelete).length > 0 ? (
                <>
                  <p className="text-slate-700 mb-4 leading-relaxed">
                    The column "<span className="font-semibold">{columnToDelete}</span>" contains{" "}
                    {tasks.filter((t) => t.status === columnToDelete).length}{" "}
                    task(s). Where would you like to move them?
                  </p>
                  
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
                      .filter((s) => s !== columnToDelete)
                      .map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                  </select>
                </>
              ) : (
                <p className="text-slate-700 mb-4 leading-relaxed">
                  Are you sure you want to delete the column "<span className="font-semibold">{columnToDelete}</span>"? 
                  This action cannot be undone.
                </p>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setColumnToDelete(null);
                  setMoveToColumn("");
                }}
                className="px-4 py-2 border-2 border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteColumn}
                disabled={tasks.filter((t) => t.status === columnToDelete).length > 0 && !moveToColumn}
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-medium hover:from-red-600 hover:to-red-700 transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                Delete Column
              </button>
            </div>
          </div>
        </div>
      )}

      <ErrorModal message={error} onClose={() => setError("")} />
      
      {/* Confirm Remove Collaborator Modal */}
      {collaboratorToDelete && (
        <ConfirmModal
          message={`Are you sure you want to remove this team member? They will lose access to this board and all its tasks.`}
          onConfirm={confirmRemoveCollaborator}
          onClose={() => setCollaboratorToDelete(null)}
          confirmText="Remove"
          cancelText="Cancel"
        />
      )}

      {/* Role Management Modal */}
      {showRoleManagement && currentBoard && (
        <RoleManagementModal
          isOpen={showRoleManagement}
          onClose={() => setShowRoleManagement(false)}
          board={currentBoard}
          currentUserEmail={user?.email || ''}
          onUpdateRole={handleUpdateRole}
        />
      )}
    </div>
  );
};

export default TaskBoard;