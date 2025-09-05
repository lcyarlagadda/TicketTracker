// components/Modals/TaskModal.tsx
import React, { useEffect, useState } from "react";
import {
  X,
  Calendar,
  User,
  MessageCircle,
  FileText,
  Save,
  Edit3,
  Clock,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Square,
  Target,
  History,
  Upload,
  Download,
  SquarePen,
  Check,
  Hash,
  Zap,
  Layers,
  Crown,
  Copy,
} from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { notificationService } from "../../services/notificationService";
import {
  updateTask,
  createTask,
  deleteTask,
} from "../../store/slices/taskSlice";
import { taskService } from "../../services/taskService";
import {
  Task,
  Comment,
  FileAttachment,
  Collaborator,
  Sprint,
  TaskType,
} from "../../store/types/types";
import ConfirmModal from "../Atoms/ConfirmModal";
import CustomDropdown from "../Atoms/CustomDropDown";
import FileUpload from "../Atoms/FileUpload";
import ErrorModal from "../Atoms/ErrorModal";

interface TaskModalProps {
  task: Task;
  onClose: () => void;
  sprints?: Sprint[];
  existingTasks?: Task[];
}

const TaskModal: React.FC<TaskModalProps> = ({ task, onClose, sprints = [], existingTasks = [] }) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { currentBoard } = useAppSelector((state) => state.boards);
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form state - all directly editable with unified save
  const [title, setTitle] = useState(task.title || "");
  const [priority, setPriority] = useState(task.priority || "Medium");
  const [points, setPoints] = useState(task.points !== null && task.points !== undefined ? task.points : null);
  const [taskType, setTaskType] = useState(task.type || "story");
  const [description, setDescription] = useState(task.description || "");
  const [assignedTo, setAssignedTo] = useState(task.assignedTo?.name || "");
  const [dueDate, setDueDate] = useState(task.dueDate || "");
  const [epics, setEpics] = useState<string[]>(task.epics || []);
  const [files, setFiles] = useState<File[]>([]);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  // Sprint state
  const [sprintId, setSprintId] = useState(task.sprintId || "");

  // Edit state for title only (other fields are now directly editable)
  const [editingTitle, setEditingTitle] = useState(false);

  // Comments state
  const [comments, setComments] = useState<Comment[]>(task.comments || []);
  const [commentText, setCommentText] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  // Child tasks state
  const [childTasks, setChildTasks] = useState<Task[]>([]);
  const [showChildTasks, setShowChildTasks] = useState(true);
  const [showAddChildTask, setShowAddChildTask] = useState(false);
  const [editingChildTask, setEditingChildTask] = useState<string | null>(null);
  const [newChildTask, setNewChildTask] = useState({
    title: "",
    description: "",
    assignedTo: "",
    dueDate: "",
    priority: "Medium" as "Low" | "Medium" | "High",
  });
  const [editChildTaskData, setEditChildTaskData] = useState({
    title: "",
    description: "",
    assignedTo: "",
    dueDate: "",
    priority: "Medium" as "Low" | "Medium" | "High",
  });

  // Modal state
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 50);
  }, []);

  // Track changes for unified save
  useEffect(() => {
    const hasChanges = 
      title !== (task.title || "") ||
      priority !== (task.priority || "Medium") ||
      points !== (task.points !== null && task.points !== undefined ? task.points : null) ||
      taskType !== (task.type || "story") ||
      description !== (task.description || "") ||
      assignedTo !== (task.assignedTo?.name || "") ||
      dueDate !== (task.dueDate || "") ||
      sprintId !== (task.sprintId || "") ||
      JSON.stringify(epics.sort()) !== JSON.stringify((task.epics || []).sort()) ||
      comments !== task.comments ||
      files.length > 0;

    setUnsavedChanges(hasChanges);
  }, [title, priority, points, taskType, description, assignedTo, dueDate, sprintId, epics, comments, files, task]);

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

  const collaborators = currentBoard?.collaborators || [];

  // Get current sprint info
  const currentSprint = sprintId ? sprints.find(s => s.id === sprintId) : null;
  const activeSprints = sprints.filter(s => s.status === 'active' || s.status === 'planning');

  // Sprint options
  const sprintOptions = [
    { value: "", label: "Backlog" },
    ...activeSprints.map(s => ({
      value: s.id,
      label: `${s.name}`
    }))
  ];

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
      bg: 'bg-purple-100',
      text: 'text-purple-700',
      border: 'border-purple-200',
      label: 'POC'
    },
  };

  const typeConfig = taskTypeConfig[taskType as keyof typeof taskTypeConfig] || taskTypeConfig.story;

  const closeModal = () => {
    if (unsavedChanges) {
      setShowWarning(true);
      return;
    }
    setIsVisible(false);
    setTimeout(() => onClose(), 200);
  };

  const handleCopyTaskId = async () => {
    try {
      await navigator.clipboard.writeText(task.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy task ID:', err);
    }
  };

  // Title validation function
  const validateTitle = (titleValue: string): string | null => {
    if (!titleValue.trim()) {
      return "Task title is required.";
    }
    if (titleValue.trim().length < 3) {
      return "Task title must be at least 3 characters long.";
    }
    if (titleValue.trim().length > 100) {
      return "Task title must be less than 100 characters.";
    }
    return null;
  };

  // Points validation function
  const validatePoints = (pointsValue: number): string | null => {
    if (pointsValue < 1 || pointsValue > 100) {
      return "Story points must be between 1 and 100.";
    }
    return null;
  };

  // Handle title save
  const handleSaveTitle = () => {
    const validationError = validateTitle(title);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }
    setEditingTitle(false);
  };

  // Handle title cancel
  const handleCancelTitle = () => {
    setTitle(task.title || "");
    setEditingTitle(false);
  };

  // Epic management functions

  const handleRemoveEpic = (epicToRemove: string) => {
    setEpics(prev => prev.filter(epic => epic !== epicToRemove));
  };

  // Get epic-type tasks from the board
  const epicTasks = existingTasks
    .filter(existingTask => existingTask.type === 'epic' && existingTask.id !== task.id) // Exclude current task
    .sort((a, b) => a.title.localeCompare(b.title));

  // Child task functions (keeping existing implementation)
  const handleAddChildTask = async () => {
    if (!newChildTask.title.trim()) {
      setErrorMessage("Subtask title is required.");
      return;
    }

    if (!user || !currentBoard) {
      setErrorMessage("Unable to create subtask. Please try again.");
      return;
    }

    const isDuplicate = childTasks.some(
      (ct) => ct.title.toLowerCase().trim() === newChildTask.title.toLowerCase().trim()
    );

    if (isDuplicate) {
      setErrorMessage("A subtask with this title already exists.");
      return;
    }

    try {
      const taskData = {
        title: newChildTask.title.trim(),
        description: newChildTask.description.trim(),
        priority: newChildTask.priority,
        dueDate: newChildTask.dueDate,
        status: "todo",
        assignedTo: newChildTask.assignedTo && newChildTask.assignedTo !== "Unassigned" 
          ? {
              uid: collaborators.find(c => c.name === newChildTask.assignedTo)?.email || "",
              email: collaborators.find(c => c.name === newChildTask.assignedTo)?.email || "",
              name: newChildTask.assignedTo
            }
          : null,
        parentTaskId: task.id,
        epics: [],
        comments: [],
        files: [],
        points: 3,
        type: "subtask" as TaskType,
        progressLog: [
          {
            type: "created" as const,
            desc: "Subtask created",
            timestamp: Timestamp.now(),
            user: user.displayName || user.email,
          },
        ],
        createdBy: {
          uid: user.uid,
          email: user.email,
          name: user.displayName || user.email,
        },
        createdAt: Timestamp.now(),
        boardId: currentBoard.id,
      };

      await dispatch(
        createTask({
          userId: user.uid,
          boardId: currentBoard.id,
          taskData,
        })
      ).unwrap();

      setNewChildTask({
        title: "",
        description: "",
        assignedTo: "",
        dueDate: "",
        priority: "Medium",
      });
      setShowAddChildTask(false);
    } catch (error) {
      console.error("Error adding child task:", error);
      setErrorMessage("Failed to create subtask. Please try again.");
    }
  };

  const handleToggleChildTask = async (childTaskId: string, currentStatus: string) => {
    if (!user || !currentBoard) return;

    try {
      const newStatus = currentStatus === "done" ? "todo" : "done";
      await dispatch(
        updateTask({
          userId: user.uid,
          boardId: currentBoard.id,
          taskId: childTaskId,
          updates: { status: newStatus },
        })
      ).unwrap();
    } catch (error) {
      console.error("Error toggling child task:", error);
      setErrorMessage("Failed to update subtask status. Please try again.");
    }
  };

  const handleDeleteChildTask = async (childTaskId: string) => {
    if (!user || !currentBoard) return;

    try {
      await dispatch(
        deleteTask({
          userId: user.uid,
          boardId: currentBoard.id,
          taskId: childTaskId,
        })
      ).unwrap();
    } catch (error) {
      console.error("Error deleting child task:", error);
      setErrorMessage("Failed to delete subtask. Please try again.");
    }
  };

  const handleEditChildTask = (childTask: Task) => {
    setEditingChildTask(childTask.id);
    setEditChildTaskData({
      title: childTask.title,
      description: childTask.description || "",
      assignedTo: childTask.assignedTo?.name || "",
      dueDate: childTask.dueDate || "",
      priority: childTask.priority || "Medium",
    });
  };

  const handleSaveChildTask = async (childTaskId: string) => {
    if (!editChildTaskData.title.trim()) {
      setErrorMessage("Subtask title is required.");
      return;
    }

    if (!user || !currentBoard) return;

    try {
      await dispatch(
        updateTask({
          userId: user.uid,
          boardId: currentBoard.id,
          taskId: childTaskId,
          updates: {
            title: editChildTaskData.title.trim(),
            description: editChildTaskData.description.trim(),
            assignedTo: editChildTaskData.assignedTo && editChildTaskData.assignedTo !== "Unassigned" 
              ? {
                  uid: collaborators.find(c => c.name === editChildTaskData.assignedTo)?.email || "",
                  email: collaborators.find(c => c.name === editChildTaskData.assignedTo)?.email || "",
                  name: editChildTaskData.assignedTo
                }
              : null,
            dueDate: editChildTaskData.dueDate,
            priority: editChildTaskData.priority,
          },
        })
      ).unwrap();

      setEditingChildTask(null);
      setEditChildTaskData({
        title: "",
        description: "",
        assignedTo: "",
        dueDate: "",
        priority: "Medium",
      });
    } catch (error) {
      console.error("Error updating child task:", error);
      setErrorMessage("Failed to update subtask. Please try again.");
    }
  };

  // Unified save function
  const handleSave = async () => {
    if (!user || !currentBoard) return;

    try {
      const updates: Partial<Task> = {};
      const newLogEntries = [];

      // Validate title if it has changed
      if (title.trim() !== task.title) {
        const titleError = validateTitle(title);
        if (titleError) {
          setErrorMessage(titleError);
          return;
        }
        updates.title = title.trim();
        newLogEntries.push({
          type: "title-change" as const,
          desc: `Title changed from "${task.title}" to "${title.trim()}"`,
          timestamp: Timestamp.now(),
          user: user.displayName || user.email,
        });
      }

      // Check for task type changes
      if (taskType !== task.type) {
        updates.type = taskType;
        newLogEntries.push({
          type: "type-change" as const,
          desc: `Task type changed from ${task.type} to ${taskType}`,
          timestamp: Timestamp.now(),
          user: user.displayName || user.email,
        });
      }

      // Check for priority changes
      if (priority !== task.priority) {
        updates.priority = priority;
        newLogEntries.push({
          type: "priority-change" as const,
          desc: `Priority changed from ${task.priority} to ${priority}`,
          timestamp: Timestamp.now(),
          user: user.displayName || user.email,
        });
      }

      // Check for points changes
      if (points !== (task.points !== null && task.points !== undefined ? task.points : null)) {
        if (points !== null) {
          const pointsError = validatePoints(points);
          if (pointsError) {
            setErrorMessage(pointsError);
            return;
          }
        }
        updates.points = points;
        newLogEntries.push({
          type: "points-change" as const,
          desc: `Story points changed from ${task.points || 'not set'} to ${points || 'not set'}`,
          timestamp: Timestamp.now(),
          user: user.displayName || user.email,
        });
      }

      // Check for sprint changes
      if (sprintId !== (task.sprintId || "")) {
        updates.sprintId = sprintId || undefined;
        const oldSprintName = task.sprintId 
          ? sprints.find(s => s.id === task.sprintId)?.name || "Unknown Sprint"
          : "Backlog";
        const newSprintName = sprintId 
          ? sprints.find(s => s.id === sprintId)?.name || "Unknown Sprint"
          : "Backlog";
        
        newLogEntries.push({
          type: "sprint-change" as const,
          desc: `Task moved from ${oldSprintName} to ${newSprintName}`,
          timestamp: Timestamp.now(),
          user: user.displayName || user.email,
        });
      }

      // Check for description changes
      if (description.trim() !== (task.description || "").trim()) {
        updates.description = description;
        newLogEntries.push({
          type: "description-change" as const,
          desc: "Task description updated",
          timestamp: Timestamp.now(),
          user: user.displayName || user.email,
        });
      }

      if (assignedTo !== (task.assignedTo?.name || "")) {
        // Find the collaborator object for the selected assignee
        const selectedCollaborator = assignedTo && assignedTo !== "Unassigned" 
          ? collaborators.find(c => c.name === assignedTo)
          : null;
        
        updates.assignedTo = selectedCollaborator ? {
          uid: selectedCollaborator.email, // Using email as uid for now
          email: selectedCollaborator.email,
          name: selectedCollaborator.name
        } : null;
        
        newLogEntries.push({
          type: "assignment-change" as const,
          desc: `Reassigned from ${task.assignedTo?.name || "Unassigned"} to ${
            assignedTo || "Unassigned"
          }`,
          timestamp: Timestamp.now(),
          user: user.displayName || user.email,
        });
      }

      if (dueDate !== (task.dueDate || "")) {
        updates.dueDate = dueDate;
        newLogEntries.push({
          type: "dueDate-change" as const,
          desc: `Due date updated to ${dueDate || "No date"}`,
          timestamp: Timestamp.now(),
          user: user.displayName || user.email,
        });
      }

      if (
        JSON.stringify([...epics].sort()) !==
        JSON.stringify([...(task.epics || [])].sort())
      ) {
        updates.epics = epics;
        newLogEntries.push({
          type: "epics-change" as const,
          desc: "Epics updated",
          timestamp: Timestamp.now(),
          user: user.displayName || user.email,
        });
      }

      if (files.length > 0) {
        const uploaded = await taskService.uploadTaskFiles(
          user.uid,
          currentBoard.id,
          task.id,
          files
        );
        updates.files = [...(task.files || []), ...uploaded];
        newLogEntries.push({
          type: "file-upload" as const,
          desc: `${files.length} file(s) uploaded`,
          timestamp: Timestamp.now(),
          user: user.displayName || user.email,
        });
      }

      if (comments !== task.comments) {
        updates.comments = comments;
      }

      if (newLogEntries.length > 0) {
        updates.progressLog = [...(task.progressLog || []), ...newLogEntries];
      }

      if (Object.keys(updates).length > 0) {
        await dispatch(
          updateTask({
            userId: user.uid,
            boardId: currentBoard.id,
            taskId: task.id,
            updates,
          })
        ).unwrap();

        // Send notification if task was assigned to someone new
        if (updates.assignedTo && updates.assignedTo.email !== user.email) {
          try {
            const taskUrl = `${window.location.origin}/board/${currentBoard.id}`;
            const boardUrl = `${window.location.origin}/board/${currentBoard.id}`;
            
            await notificationService.notifyTaskAssigned({
              assigneeEmail: updates.assignedTo.email,
              assigneeName: updates.assignedTo.name,
              taskTitle: title,
              boardName: currentBoard.title,
              assignedBy: user.displayName || user.email || 'Unknown User',
              taskUrl,
              boardUrl,
              taskId: task.id,
            });
            console.log('Task assignment notification sent successfully');
          } catch (notificationError) {
            console.error('Failed to send task assignment notification:', notificationError);
            // Don't show error to user as the task was still updated successfully
          }
        }
      }

      setUnsavedChanges(false);
      setFiles([]);
      setIsVisible(false);
      setTimeout(() => onClose(), 200);
    } catch (error) {
      console.error("Error saving task:", error);
      setErrorMessage("Failed to save changes. Please try again.");
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;

    const newComment: Comment = {
      text: commentText,
      timestamp: Timestamp.now(),
      user: user?.displayName || user?.email || "Unknown",
    };

    const updatedComments = [...comments, newComment];
    setComments(updatedComments);
    setCommentText("");
  };

  const handleDeleteComment = (index: number) => {
    const updatedComments = comments.filter((_, i) => i !== index);
    setComments(updatedComments);
  };

  const handleEditComment = (index: number) => {
    const updatedComments = [...comments];
    updatedComments[index] = {
      ...updatedComments[index],
      text: editText,
      edited: true,
    };
    setComments(updatedComments);
    setEditingIndex(null);
  };

  const getChildTasksProgress = () => {
    const total = childTasks.length;
    const completed = childTasks.filter((ct) => ct.status === "done").length;
    return {
      total,
      completed,
      percentage: total > 0 ? (completed / total) * 100 : 0,
    };
  };

  const progress = getChildTasksProgress();

  // Story point options (Fibonacci sequence) with "No Points" option
  const storyPointOptions = ['No Points', '1', '2', '3', '5', '8', '13', '21'];

  // Task type options
  const taskTypeOptions = task.parentTaskId 
    ? ["subtask"]
    : ["epic", "feature", "story", "bug", "enhancement", "poc"];

  return (
    <div
      className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-start pt-4 z-50 transition-all duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      } p-4`}
    >
      <div
        className={`bg-white w-full max-w-4xl rounded-2xl shadow-2xl relative max-h-[95vh] overflow-hidden transform transition-all duration-300 ${
          isVisible ? "scale-100 translate-y-0" : "scale-95 -translate-y-4"
        }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-white/10"></div>
          <div className="relative flex justify-between items-start">
            <div className="flex-1">
              {/* Editable Title and Task Info Row */}
              <div className="flex items-start justify-between mb-2 gap-4 flex-wrap">
                {/* Title (editable) */}
                <div className="flex-1 min-w-0">
                  {editingTitle ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleSaveTitle();
                          } else if (e.key === "Escape") {
                            handleCancelTitle();
                          }
                        }}
                        className="text-2xl font-bold bg-white/20 text-white placeholder-white/70 border-2 border-white/30 rounded-lg px-3 py-1 focus:outline-none focus:border-white/50 flex-1"
                        placeholder="Task title"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveTitle}
                        className="p-2 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors"
                        title="Save title"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={handleCancelTitle}
                        className="p-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
                        title="Cancel"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group">
                      <h2 className="text-2xl font-bold text-white flex-1 truncate">
                        {title}
                        <button
                          onClick={() => setEditingTitle(true)}
                          className="ml-2 p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors opacity-0 group-hover:opacity-100"
                          title="Edit title"
                          style={{ marginLeft: "0.5rem", verticalAlign: "middle" }}
                        >
                          <Edit3 size={16} />
                        </button>
                      </h2>
                    </div>
                  )}
                </div>
                
                {/* Task ID and Type Row (right) */}
                <div className="flex items-center gap-3 flex-shrink-0 mt-2 md:mt-0 h-10">
                  {/* Sprint Info */}
                  {currentSprint && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/20 text-white rounded-lg h-10 min-h-[2.5rem]">
                      <Zap size={14} />
                      <span className="text-sm font-medium">Sprint {currentSprint.sprintNumber}</span>
                    </div>
                  )}
                  <div className={`px-3 py-1 rounded-lg ${typeConfig.bg} border border-white/30 h-10 min-h-[2.5rem] flex items-center`}>
                    <span className={`text-sm font-semibold text-slate-700`}>
                      {typeConfig.label}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyTaskId}
                    className="flex items-center gap-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors h-10 min-h-[2.5rem]"
                    title="Copy Task ID"
                    style={{ minWidth: "110px" }}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    <span className="font-mono text-sm">{task.id.slice(-8)}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 text-blue-100 text-sm">
                <span className="flex items-center gap-2">
                  <User size={14} />
                  Created by {task.createdBy?.name || task.createdBy?.email}
                </span>
                <span className="flex items-center gap-2">
                  <Clock size={14} />
                  {task.createdAt?.toDate?.()?.toLocaleDateString?.() || "N/A"}
                </span>
                {childTasks.length > 0 && (
                  <span className="flex items-center gap-2">
                    <CheckSquare size={14} />
                    {progress.completed}/{progress.total} subtasks
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={closeModal}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all duration-200 hover:scale-110 ml-6"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(95vh-200px)]">

          {/* Description */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <FileText size={18} className="text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-800">Description</h3>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full min-h-[100px] p-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none transition-all duration-200 resize-none"
              placeholder="Edit task description..."
            />
          </div>

          {/* Task Type, Priority, and Story Points Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Task Type */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-slate-200">
                  <Layers size={18} className="text-slate-600" />
                </div>
                <h3 className="font-semibold text-slate-800">Task Type</h3>
              </div>
              <CustomDropdown
                options={taskTypeOptions}
                selected={taskType}
                setSelected={(val) => setTaskType(val as TaskType)}
                placeholder="Select type"
                className="w-full"
                disabled={task.parentTaskId ? true : false}
              />
            </div>

            {/* Priority */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-orange-100">
                  <Target size={18} className="text-orange-600" />
                </div>
                <h3 className="font-semibold text-slate-800">Priority</h3>
              </div>
              <CustomDropdown
                options={["Low", "Medium", "High"]}
                selected={priority}
                setSelected={(val) => setPriority(val as "Low" | "Medium" | "High")}
                placeholder="Priority"
                className="w-full"
              />
            </div>

            {/* Story Points */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-indigo-100">
                  <Hash size={18} className="text-indigo-600" />
                </div>
                <h3 className="font-semibold text-slate-800">Story Points</h3>
              </div>
              <CustomDropdown
                options={storyPointOptions}
                selected={points ? points.toString() : "No Points"}
                setSelected={(val) => setPoints(val === "No Points" ? null : parseInt(val))}
                placeholder="Points"
                className="w-full"
              />
            </div>
          </div>

          {/* Sprint Assignment */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Zap size={18} className="text-purple-600" />
              </div>
              <h3 className="font-semibold text-slate-800">Sprint Assignment</h3>
            </div>
            <CustomDropdown
              options={sprintOptions.map(opt => opt.label)}
              selected={sprintId 
                ? sprintOptions.find(opt => opt.value === sprintId)?.label || ""
                : "Backlog"
              }
              setSelected={(label) => {
                const option = sprintOptions.find(opt => opt.label === label);
                setSprintId(option?.value || "");
              }}
              placeholder="Select sprint"
              className="w-full"
            />
          </div>

          {/* Assignment and Due Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <User size={18} className="text-green-600" />
                </div>
                <h3 className="font-semibold text-slate-800">Assigned To</h3>
              </div>
              <CustomDropdown
                options={[
                  "Unassigned",
                  ...collaborators.map((c: Collaborator) => c.name),
                ]}
                selected={assignedTo || "Unassigned"}
                setSelected={(val) => setAssignedTo(val)}
                placeholder="Assign to..."
                className="w-full"
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-violet-100">
                <Calendar size={18} className="text-purple-600" />
              </div>
              <h3 className="font-semibold text-slate-800">Due Date</h3>
              </div>
              <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl focus:border-purple-500 focus:outline-none transition-all duration-200 text-sm"
              />
            </div>
          </div>

          {/* Epics Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Crown size={18} className="text-purple-600" />
              </div>
              <h3 className="font-semibold text-slate-800">Epic Relations</h3>
            </div>

            {/* Selected Epic Tasks */}
            {epics.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {epics.map((epicName) => (
                  <span
                    key={epicName}
                    className="flex items-center gap-2 text-sm text-purple-700 bg-purple-100 border border-purple-200 rounded-full px-3 py-1"
                  >
                    {epicName}
                    <button
                      onClick={() => handleRemoveEpic(epicName)}
                      className="hover:bg-purple-200 rounded-full p-1 transition-colors"
                      title="Remove epic relation"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Epic Tasks Dropdown - Multi-select for epic-type tasks */}
            {epicTasks.length > 0 && (
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-200 mb-3">
                <p className="text-xs font-medium text-purple-600 mb-3">Select epic tasks to relate:</p>
                <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-purple-100">
                  {epicTasks.map((epicTask) => (
                    <label key={epicTask.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-purple-100 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={epics.includes(epicTask.title)}
                        onChange={(e) => {
                          if (e.target.checked && epics.length < 3) {
                            setEpics(prev => [...prev, epicTask.title]);
                          } else if (!e.target.checked) {
                            setEpics(prev => prev.filter(name => name !== epicTask.title));
                          }
                        }}
                        className="w-4 h-4 text-purple-600 border-purple-300 rounded focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-slate-700">{epicTask.title}</span>
                        {epicTask.description && (
                          <p className="text-xs text-slate-500 truncate">{epicTask.description}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {epicTasks.length === 0 && (
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-200 text-center">
                <p className="text-xs text-purple-600">No epics on this board.</p>
              </div>
            )}

            {/* Info Text */}
            <p className="text-xs text-purple-600 mt-2">
              {epics.length}/3 epic relations (connect tasks to epic-type tasks)
            </p>

          </div>

          {/* Child Tasks Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowChildTasks(!showChildTasks)}
                  className="p-1 rounded hover:bg-slate-100 transition-colors"
                >
                  {showChildTasks ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </button>
                <div className="p-2 rounded-lg bg-emerald-100">
                  <CheckSquare size={18} className="text-emerald-600" />
                </div>
                <h3 className="font-semibold text-slate-800">Subtasks</h3>
                {childTasks.length > 0 && (
                  <span className="bg-emerald-500 text-white text-xs px-2 py-1 rounded-full">
                    {progress.completed}/{progress.total}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowAddChildTask(!showAddChildTask)}
                className="p-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
              >
                {showAddChildTask ? <X size={16} /> : <Plus size={16} />}
              </button>
            </div>

            {/* Progress Bar */}
            {childTasks.length > 0 && (
              <div className="mb-4">
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="h-2 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500"
                    style={{ width: `${progress.percentage}%` }}
                  ></div>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {Math.round(progress.percentage)}% complete
                </div>
              </div>
            )}

            {/* Add Child Task Form */}
            {showAddChildTask && (
              <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 mb-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={newChildTask.title}
                      onChange={(e) =>
                        setNewChildTask({
                          ...newChildTask,
                          title: e.target.value,
                        })
                      }
                      placeholder="Subtask title *"
                      className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 focus:border-emerald-500 focus:outline-none transition-colors"
                    />
                    <CustomDropdown
                      options={["Low", "Medium", "High"]}
                      selected={newChildTask.priority}
                      setSelected={(val) =>
                        setNewChildTask({
                          ...newChildTask,
                          priority: val as "Low" | "Medium" | "High",
                        })
                      }
                      placeholder="Priority"
                      className="w-full"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <CustomDropdown
                      options={[
                        "Unassigned",
                        ...collaborators.map((c: Collaborator) => c.name),
                      ]}
                      selected={newChildTask.assignedTo}
                      setSelected={(val) =>
                        setNewChildTask({ ...newChildTask, assignedTo: val })
                      }
                      placeholder="Assign to"
                      className="w-full"
                    />
                    <input
                      type="date"
                      value={newChildTask.dueDate}
                      onChange={(e) =>
                        setNewChildTask({
                          ...newChildTask,
                          dueDate: e.target.value,
                        })
                      }
                      className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 focus:border-emerald-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <textarea
                    value={newChildTask.description}
                    onChange={(e) =>
                      setNewChildTask({
                        ...newChildTask,
                        description: e.target.value,
                      })
                    }
                    placeholder="Description (optional)"
                    rows={2}
                    className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 focus:border-emerald-500 focus:outline-none transition-colors resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddChildTask}
                      className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
                    >
                      <Plus size={16} />
                      Add Subtask
                    </button>
                    <button
                      onClick={() => {
                        setShowAddChildTask(false);
                        setNewChildTask({
                          title: "",
                          description: "",
                          assignedTo: "",
                          dueDate: "",
                          priority: "Medium",
                        });
                      }}
                      className="border-2 border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showChildTasks && childTasks.length > 0 && (
              <div className="space-y-3">
                {childTasks.map((childTask) => (
                  <div
                    key={childTask.id}
                    className="bg-slate-50 rounded-xl border border-slate-200 p-4 hover:bg-slate-100 transition-colors"
                  >
                    {editingChildTask === childTask.id ? (
                      // Edit mode
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={editChildTaskData.title}
                            onChange={(e) =>
                              setEditChildTaskData({
                                ...editChildTaskData,
                                title: e.target.value,
                              })
                            }
                            placeholder="Task title"
                            className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none transition-colors"
                          />
                          <CustomDropdown
                            options={["Low", "Medium", "High"]}
                            selected={editChildTaskData.priority}
                            setSelected={(val) =>
                              setEditChildTaskData({
                                ...editChildTaskData,
                                priority: val as "Low" | "Medium" | "High",
                              })
                            }
                            placeholder="Priority"
                            className="w-full"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <CustomDropdown
                            options={[
                              "Unassigned",
                              ...collaborators.map((c: Collaborator) => c.name),
                            ]}
                            selected={editChildTaskData.assignedTo}
                            setSelected={(val) =>
                              setEditChildTaskData({
                                ...editChildTaskData,
                                assignedTo: val,
                              })
                            }
                            placeholder="Assign to"
                            className="w-full"
                          />
                          <input
                            type="date"
                            value={editChildTaskData.dueDate}
                            onChange={(e) =>
                              setEditChildTaskData({
                                ...editChildTaskData,
                                dueDate: e.target.value,
                              })
                            }
                            className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none transition-colors"
                          />
                        </div>
                        <textarea
                          value={editChildTaskData.description}
                          onChange={(e) =>
                            setEditChildTaskData({
                              ...editChildTaskData,
                              description: e.target.value,
                            })
                          }
                          placeholder="Description (optional)"
                          rows={3}
                          className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none transition-colors resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveChildTask(childTask.id)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                          >
                            <Save size={16} />
                            Save
                          </button>
                          <button
                            onClick={() => setEditingChildTask(null)}
                            className="border-2 border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View mode
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() =>
                            handleToggleChildTask(
                              childTask.id,
                              childTask.status
                            )
                          }
                          className="mt-1 text-emerald-500 hover:text-emerald-600 transition-colors"
                        >
                          {childTask.status === "done" ? (
                            <CheckSquare size={20} />
                          ) : (
                            <Square size={20} />
                          )}
                        </button>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4
                              className={`font-semibold text-lg ${
                                childTask.status === "done"
                                  ? "line-through text-slate-500"
                                  : "text-slate-800"
                              }`}
                            >
                              {childTask.title}
                            </h4>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditChildTask(childTask)}
                                className="text-blue-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-all"
                                title="Edit subtask"
                              >
                                <SquarePen size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  setConfirmMessage(
                                    `Are you sure you want to delete the subtask "${childTask.title}"? This action cannot be undone.`
                                  );
                                  setConfirmAction(
                                    () => () => handleDeleteChildTask(childTask.id)
                                  );
                                }}
                                className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all"
                                title="Delete subtask"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          {childTask.description && (
                            <p className="text-sm text-slate-600 mb-2">
                              {childTask.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>
                              {childTask.assignedTo ? childTask.assignedTo.name : "Unassigned"}
                            </span>
                            {childTask.dueDate && (
                              <span>
                                Due: {new Date(childTask.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Show Add Child Task button if no child tasks exist */}
            {childTasks.length === 0 && !showAddChildTask && (
              <button
                onClick={() => setShowAddChildTask(true)}
                className="w-full border-2 border-dashed border-emerald-300 rounded-xl p-6 text-emerald-600 hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                Add Subtasks
              </button>
            )}
          </div>

          {/* Files Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-indigo-100">
                <Upload size={18} className="text-indigo-600" />
              </div>
              <h3 className="font-semibold text-slate-800">Attachments</h3>
            </div>

            {(task.files || []).length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-slate-600 mb-2">
                  Existing Files:
                </p>
                <div className="flex flex-wrap gap-2">
                  {(task.files || []).map(
                    (file: FileAttachment, index: number) => (
                      <a
                        key={index}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-sm hover:bg-blue-200 transition-colors"
                      >
                        <Download size={14} />
                        {file.name}
                      </a>
                    )
                  )}
                </div>
              </div>
            )}

            {files.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-slate-600 mb-2">
                  New Files to Upload:
                </p>
                <div className="flex flex-wrap gap-2">
                  {files.map((file, index) => (
                    <span
                      key={index}
                      className="bg-green-100 text-green-800 px-3 py-2 rounded-lg text-sm flex items-center gap-2"
                    >
                      {file.name}
                      <button
                        onClick={() => {
                          const updatedFiles = [...files];
                          updatedFiles.splice(index, 1);
                          setFiles(updatedFiles);
                        }}
                        className="hover:bg-green-200 rounded-full p-1 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <FileUpload
              multiple={true}
              accept={[
                "application/pdf",
                "application/vnd.ms-powerpoint",
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                "image/png",
                "image/jpeg",
                "text/plain",
                "text/csv",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              ]}
              maxSizeMB={5}
              uploadLabel="Upload New Files"
              onFilesSelected={(selectedFiles) => {
                setFiles((prev) => [
                  ...prev,
                  ...(Array.isArray(selectedFiles)
                    ? selectedFiles
                    : [selectedFiles]),
                ]);
              }}
            />
          </div>

          {/* Activity History */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-slate-200">
                <History size={18} className="text-slate-600" />
              </div>
              <h3 className="font-semibold text-slate-800">Activity History</h3>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 max-h-48 overflow-y-auto">
              {(task.progressLog || []).length > 0 ? (
                <div className="space-y-3">
                  {(task.progressLog || []).slice(-10).map((log, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-700">
                          {log.desc}
                        </p>
                        <div className="text-xs text-slate-500 mt-1">
                          {log.user || "System"} • {" "}
                          {log.timestamp?.toDate?.()?.toLocaleString?.() || ""}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic text-center py-4">
                  No activity yet
                </p>
              )}
            </div>
          </div>

          {/* Comments */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <MessageCircle size={18} className="text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-800">Comments</h3>
              <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                {comments.length}
              </span>
            </div>

            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
              {comments.map((comment, i) => (
                <div
                  key={i}
                  className="bg-slate-50 rounded-xl p-4 border border-slate-200 hover:bg-slate-100 transition-colors"
                >
                  {editingIndex === i ? (
                    <div className="space-y-3">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors resize-none"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditComment(i)}
                          className="bg-green-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-green-600 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingIndex(null)}
                          className="bg-slate-300 text-slate-700 px-3 py-1 rounded-lg text-sm hover:bg-slate-400 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-bold">
                            {comment.user.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">
                                {comment.user}
                              </p>
                              <p className="text-xs text-slate-500">
                                {comment.timestamp?.toDate?.()?.toLocaleString() || "Unknown time"}
                                {comment.edited && (
                                  <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                                    Edited
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setEditingIndex(i);
                                  setEditText(comment.text);
                                }}
                                className="p-1 rounded hover:bg-slate-200 transition-colors"
                                title="Edit comment"
                              >
                                <Edit3 size={14} className="text-slate-500" />
                              </button>
                              <button
                                onClick={() => handleDeleteComment(i)}
                                className="p-1 rounded hover:bg-red-100 transition-colors"
                                title="Delete comment"
                              >
                                <Trash2 size={14} className="text-red-500" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="ml-11">
                        <p className="text-sm text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                          {comment.text}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {comments.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <MessageCircle
                    size={32}
                    className="mx-auto mb-2 text-slate-300"
                  />
                  <p className="text-sm">No comments yet</p>
                  <p className="text-xs text-slate-400">
                    Be the first to add a comment
                  </p>
                </div>
              )}
            </div>

            {/* Add Comment Form */}
            <div className="flex gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">
                  {user?.displayName?.charAt(0)?.toUpperCase() ||
                    user?.email?.charAt(0)?.toUpperCase() ||
                    "U"}
                </span>
              </div>
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddComment();
                  }
                }}
              />
              <button
                onClick={handleAddComment}
                disabled={!commentText.trim()}
                className={`px-4 py-3 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 ${
                  commentText.trim()
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:shadow-lg"
                    : "bg-slate-300 text-slate-500 cursor-not-allowed"
                }`}
              >
                <MessageCircle size={16} />
                Post
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-600">
            {unsavedChanges && (
              <>
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Unsaved changes</span>
              </>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={closeModal}
              className="px-6 py-2 border-2 border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-100 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!unsavedChanges}
              className={`px-6 py-2 rounded-xl font-medium flex items-center gap-2 transition-all duration-200 ${
                unsavedChanges
                  ? "bg-gradient-to-r from-green-500 to-green-600 text-white hover:shadow-lg hover:scale-105"
                  : "bg-slate-300 text-slate-500 cursor-not-allowed"
              }`}
            >
              <Save size={16} />
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {confirmMessage && confirmAction && (
        <ConfirmModal
          message={confirmMessage}
          onConfirm={() => {
            confirmAction();
            setConfirmMessage("");
            setConfirmAction(null);
          }}
          onCancel={() => {
            setConfirmMessage("");
            setConfirmAction(null);
          }}
        />
      )}
      {errorMessage && (
        <ErrorModal
          message={errorMessage}
          onClose={() => setErrorMessage("")}
        />
      )}
      {showWarning && (
        <ConfirmModal
          message="You have unsaved changes. Are you sure you want to close without saving?"
          onConfirm={() => {
            setShowWarning(false);
            setIsVisible(false);
            setTimeout(() => onClose(), 200);
          }}
          onCancel={() => setShowWarning(false)}
        />
      )}
    </div>
  );
};

export default TaskModal;