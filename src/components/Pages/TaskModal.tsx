// components/Modals/TaskModal.tsx - Enhanced version with Sprint Management
import React, { useEffect, useState } from "react";
import {
  X,
  Calendar,
  User,
  MessageCircle,
  FileText,
  Tag,
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
} from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
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
} from "../../store/types/types";
import ConfirmModal from "../Atoms/ConfirmModal";
import CustomDropdown from "../Atoms/CustomDropDown";
import FileUpload from "../Atoms/FileUpload";
import ErrorModal from "../Atoms/ErrorModal";

interface TaskModalProps {
  task: Task;
  onClose: () => void;
  sprints?: Sprint[];
}

const TaskModal: React.FC<TaskModalProps> = ({ task, onClose, sprints = [] }) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { currentBoard } = useAppSelector((state) => state.boards);
  const [isVisible, setIsVisible] = useState(false);

  // Form state
  const [title, setTitle] = useState(task.title || "");
  const [priority, setPriority] = useState(task.priority || "Medium");
  const [points, setPoints] = useState(task.points || 3);
  const [description, setDescription] = useState(task.description || "");
  const [assignedTo, setAssignedTo] = useState(task.assignedTo || "");
  const [dueDate, setDueDate] = useState(task.dueDate || "");
  const [tags, setTags] = useState<string[]>(task.tags || []);
  const [newTag, setNewTag] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  // Sprint state
  const [sprintId, setSprintId] = useState(task.sprintId || "");
  const [editingSprint, setEditingSprint] = useState(false);

  // Edit state for title, priority, and points
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingPriority, setEditingPriority] = useState(false);
  const [editingPoints, setEditingPoints] = useState(false);

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
  console.log("Active sprints", {sprints, currentSprint, sprintId});

  // Sprint options
  const sprintOptions = [
    { value: "", label: "Backlog" },
    ...activeSprints.map(s => ({
      value: s.id,
      label: `${s.name}`
    }))
  ];

  const closeModal = () => {
    if (unsavedChanges) {
      setShowWarning(true);
      return;
    }
    setIsVisible(false);
    setTimeout(() => onClose(), 200);
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
    if (title.trim() !== task.title) {
      setUnsavedChanges(true);
    }
  };

  // Handle priority save
  const handleSavePriority = () => {
    setEditingPriority(false);
    if (priority !== task.priority) {
      setUnsavedChanges(true);
    }
  };

  // Handle points save
  const handleSavePoints = () => {
    const validationError = validatePoints(points);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }
    setEditingPoints(false);
    if (points !== task.points) {
      setUnsavedChanges(true);
    }
  };

  // Handle sprint save
  const handleSaveSprint = () => {
    setEditingSprint(false);
    if (sprintId !== (task.sprintId || "")) {
      setUnsavedChanges(true);
    }
  };

  // Handle title cancel
  const handleCancelTitle = () => {
    setTitle(task.title || "");
    setEditingTitle(false);
  };

  // Handle priority cancel
  const handleCancelPriority = () => {
    setPriority(task.priority || "Medium");
    setEditingPriority(false);
  };

  // Handle points cancel
  const handleCancelPoints = () => {
    setPoints(task.points || 3);
    setEditingPoints(false);
  };

  // Handle sprint cancel
  const handleCancelSprint = () => {
    setSprintId(task.sprintId || "");
    setEditingSprint(false);
  };

  const validateSubtaskForm = (
    formData: typeof newChildTask
  ): string | null => {
    if (!formData.title.trim()) {
      return "Subtask title is required.";
    }

    if (formData.title.trim().length < 3) {
      return "Subtask title must be at least 3 characters long.";
    }

    if (formData.title.trim().length > 100) {
      return "Subtask title must be less than 100 characters.";
    }

    if (formData.description.length > 500) {
      return "Subtask description must be less than 500 characters.";
    }

    if (formData.dueDate) {
      const selectedDate = new Date(formData.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (isNaN(selectedDate.getTime())) {
        return "Please enter a valid due date.";
      }
    }

    return null; // No validation errors
  };

  const handleAddChildTask = async () => {
    // Validation with error modal
    if (!newChildTask.title.trim()) {
      setErrorMessage("Subtask title is required.");
      return;
    }

    if (newChildTask.title.trim().length < 3) {
      setErrorMessage("Subtask title must be at least 3 characters long.");
      return;
    }

    if (newChildTask.title.trim().length > 100) {
      setErrorMessage("Subtask title must be less than 100 characters.");
      return;
    }

    if (newChildTask.description.length > 500) {
      setErrorMessage("Subtask description must be less than 500 characters.");
      return;
    }

    if (!user || !currentBoard) {
      setErrorMessage("Unable to create subtask. Please try again.");
      return;
    }

    // Check for duplicate subtask titles
    const isDuplicate = childTasks.some(
      (ct) =>
        ct.title.toLowerCase().trim() ===
        newChildTask.title.toLowerCase().trim()
    );

    if (isDuplicate) {
      setErrorMessage("A subtask with this title already exists.");
      return;
    }

    // Validate due date if provided
    if (newChildTask.dueDate) {
      const selectedDate = new Date(newChildTask.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        setConfirmMessage(
          "The due date is in the past. Do you want to continue?"
        );
        setConfirmAction(() => () => executeAddChildTask());
        return;
      }
    }

    executeAddChildTask();
  };

  // 4. Separate execution function for adding child task
  const executeAddChildTask = async () => {
    if (!user || !currentBoard) return;

    try {
      const taskData = {
        title: newChildTask.title.trim(),
        description: newChildTask.description.trim(),
        priority: newChildTask.priority,
        dueDate: newChildTask.dueDate,
        status: "todo",
        assignedTo: newChildTask.assignedTo,
        parentTaskId: task.id,
        tags: [],
        comments: [],
        files: [],
        points: 3, // Default points for subtasks
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
        type: "subtask" as const
      };

      await dispatch(
        createTask({
          userId: user.uid,
          boardId: currentBoard.id,
          taskData,
        })
      ).unwrap();

      // Add detailed activity log to parent task
      const parentLogEntry = {
        type: "child-task-added" as const,
        desc: `Subtask "${newChildTask.title}" added${
          newChildTask.assignedTo
            ? ` and assigned to ${newChildTask.assignedTo}`
            : ""
        }${
          newChildTask.dueDate
            ? ` with due date ${new Date(
                newChildTask.dueDate
              ).toLocaleDateString()}`
            : ""
        }`,
        timestamp: Timestamp.now(),
        user: user.displayName || user.email,
      };

      const updatedProgressLog = [...(task.progressLog || []), parentLogEntry];
      await dispatch(
        updateTask({
          userId: user.uid,
          boardId: currentBoard.id,
          taskId: task.id,
          updates: { progressLog: updatedProgressLog },
        })
      ).unwrap();

      // Reset form
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

  // 5. Updated handleSaveChildTask with Error Modal
  const handleSaveChildTask = async (childTaskId: string) => {
    // Validation with error modal
    if (!editChildTaskData.title.trim()) {
      setErrorMessage("Subtask title is required.");
      return;
    }

    if (editChildTaskData.title.trim().length < 3) {
      setErrorMessage("Subtask title must be at least 3 characters long.");
      return;
    }

    if (editChildTaskData.title.trim().length > 100) {
      setErrorMessage("Subtask title must be less than 100 characters.");
      return;
    }

    if (editChildTaskData.description.length > 500) {
      setErrorMessage("Subtask description must be less than 500 characters.");
      return;
    }

    if (!user || !currentBoard) {
      setErrorMessage("Unable to save subtask. Please try again.");
      return;
    }

    try {
      const childTask = childTasks.find((ct) => ct.id === childTaskId);
      if (!childTask) {
        setErrorMessage("Subtask not found.");
        return;
      }

      // Check for duplicate titles (excluding current task)
      const isDuplicate = childTasks.some(
        (ct) =>
          ct.id !== childTaskId &&
          ct.title.toLowerCase().trim() ===
            editChildTaskData.title.toLowerCase().trim()
      );

      if (isDuplicate) {
        setErrorMessage("A subtask with this title already exists.");
        return;
      }

      // Validate due date if provided
      if (editChildTaskData.dueDate) {
        const selectedDate = new Date(editChildTaskData.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
          setConfirmMessage(
            "The due date is in the past. Do you want to continue?"
          );
          setConfirmAction(() => () => executeSaveChildTask(childTaskId));
          return;
        }
      }

      executeSaveChildTask(childTaskId);
    } catch (error) {
      console.error("Error updating child task:", error);
      setErrorMessage("Failed to update subtask. Please try again.");
    }
  };

  // 6. Separate execution function for saving child task
  const executeSaveChildTask = async (childTaskId: string) => {
    if (!user || !currentBoard) return;

    try {
      const childTask = childTasks.find((ct) => ct.id === childTaskId);
      if (!childTask) return;

      // Track changes for activity log
      const changes = [];
      if (childTask.title !== editChildTaskData.title.trim()) {
        changes.push(
          `title changed from "${
            childTask.title
          }" to "${editChildTaskData.title.trim()}"`
        );
      }
      if (childTask.description !== editChildTaskData.description.trim()) {
        changes.push(`description updated`);
      }
      if (childTask.assignedTo !== editChildTaskData.assignedTo) {
        changes.push(
          `assignee changed from "${
            childTask.assignedTo || "Unassigned"
          }" to "${editChildTaskData.assignedTo || "Unassigned"}"`
        );
      }
      if (childTask.dueDate !== editChildTaskData.dueDate) {
        const oldDate = childTask.dueDate
          ? new Date(childTask.dueDate).toLocaleDateString()
          : "No date";
        const newDate = editChildTaskData.dueDate
          ? new Date(editChildTaskData.dueDate).toLocaleDateString()
          : "No date";
        changes.push(`due date changed from ${oldDate} to ${newDate}`);
      }
      if (childTask.priority !== editChildTaskData.priority) {
        changes.push(
          `priority changed from ${childTask.priority} to ${editChildTaskData.priority}`
        );
      }

      // Create activity log entries
      const childTaskLogEntry = {
        type: "task-updated" as const,
        desc:
          changes.length > 0
            ? `Subtask updated: ${changes.join(", ")}`
            : "Subtask details updated",
        timestamp: Timestamp.now(),
        user: user.displayName || user.email,
      };

      const parentTaskLogEntry = {
        type: "task-updated" as const,
        desc: `Subtask "${editChildTaskData.title}" was updated`,
        timestamp: Timestamp.now(),
        user: user.displayName || user.email,
      };

      // Update child task
      await dispatch(
        updateTask({
          userId: user.uid,
          boardId: currentBoard.id,
          taskId: childTaskId,
          updates: {
            title: editChildTaskData.title.trim(),
            description: editChildTaskData.description.trim(),
            assignedTo: editChildTaskData.assignedTo,
            dueDate: editChildTaskData.dueDate,
            priority: editChildTaskData.priority,
            progressLog: [...(childTask.progressLog || []), childTaskLogEntry],
          },
        })
      ).unwrap();

      // Update parent task's progress log
      const updatedParentProgressLog = [
        ...(task.progressLog || []),
        parentTaskLogEntry,
      ];
      await dispatch(
        updateTask({
          userId: user.uid,
          boardId: currentBoard.id,
          taskId: task.id,
          updates: { progressLog: updatedParentProgressLog },
        })
      ).unwrap();

      // Reset editing state
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

  // 7. Updated handleDeleteChildTask (no confirm needed, using confirm modal)
  const handleDeleteChildTask = async (
    childTaskId: string,
    childTaskTitle: string
  ) => {
    if (!user || !currentBoard) return;

    try {
      await dispatch(
        deleteTask({
          userId: user.uid,
          boardId: currentBoard.id,
          taskId: childTaskId,
        })
      ).unwrap();

      // Add to parent task's progress log
      const parentLogEntry = {
        type: "child-task-deleted" as const,
        desc: `Subtask "${childTaskTitle}" was deleted`,
        timestamp: Timestamp.now(),
        user: user.displayName || user.email,
      };

      const updatedParentProgressLog = [
        ...(task.progressLog || []),
        parentLogEntry,
      ];
      await dispatch(
        updateTask({
          userId: user.uid,
          boardId: currentBoard.id,
          taskId: task.id,
          updates: { progressLog: updatedParentProgressLog },
        })
      ).unwrap();
    } catch (error) {
      console.error("Error deleting child task:", error);
      setErrorMessage("Failed to delete subtask. Please try again.");
    }
  };

  // 8. Updated handleToggleChildTask with error modal
  const handleToggleChildTask = async (
    childTaskId: string,
    currentStatus: string
  ) => {
    if (!user || !currentBoard) {
      setErrorMessage("Unable to update subtask status. Please try again.");
      return;
    }

    try {
      const newStatus = currentStatus === "done" ? "todo" : "done";
      const childTask = childTasks.find((ct) => ct.id === childTaskId);
      if (!childTask) {
        setErrorMessage("Subtask not found.");
        return;
      }

      const childTaskLogEntry = {
        type: "status-change" as const,
        desc: `Subtask marked as ${newStatus}`,
        timestamp: Timestamp.now(),
        user: user.displayName || user.email,
      };

      const parentTaskLogEntry = {
        type: "status-change" as const,
        desc: `Subtask "${childTask.title}" marked as ${newStatus}`,
        timestamp: Timestamp.now(),
        user: user.displayName || user.email,
      };

      // Update child task status
      await dispatch(
        updateTask({
          userId: user.uid,
          boardId: currentBoard.id,
          taskId: childTaskId,
          updates: {
            status: newStatus,
            progressLog: [...(childTask.progressLog || []), childTaskLogEntry],
          },
        })
      ).unwrap();

      // Update parent task's progress log
      const updatedParentProgressLog = [
        ...(task.progressLog || []),
        parentTaskLogEntry,
      ];
      await dispatch(
        updateTask({
          userId: user.uid,
          boardId: currentBoard.id,
          taskId: task.id,
          updates: { progressLog: updatedParentProgressLog },
        })
      ).unwrap();
    } catch (error) {
      console.error("Error toggling child task:", error);
      setErrorMessage("Failed to update subtask status. Please try again.");
    }
  };

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
      if (points !== task.points) {
        const pointsError = validatePoints(points);
        if (pointsError) {
          setErrorMessage(pointsError);
          return;
        }
        updates.points = points;
        newLogEntries.push({
          type: "points-change" as const,
          desc: `Story points changed from ${task.points || 'not set'} to ${points}`,
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

      if (assignedTo !== (task.assignedTo || "")) {
        updates.assignedTo = assignedTo;
        newLogEntries.push({
          type: "assignment-change" as const,
          desc: `Reassigned from ${task.assignedTo || "Unassigned"} to ${
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
        JSON.stringify([...tags].sort()) !==
        JSON.stringify([...(task.tags || [])].sort())
      ) {
        updates.tags = tags;
        newLogEntries.push({
          type: "tags-change" as const,
          desc: "Tags updated",
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
      }

      setUnsavedChanges(false);
      setFiles([]);
      setIsVisible(false);
      setTimeout(() => onClose(), 200);
    } catch (error) {
      console.error("Error saving task:", error);
    }
  };

  const handleEditChildTask = (childTask: Task) => {
    setEditingChildTask(childTask.id);
    setEditChildTaskData({
      title: childTask.title,
      description: childTask.description || "",
      assignedTo: childTask.assignedTo || "",
      dueDate: childTask.dueDate || "",
      priority: childTask.priority || "Medium",
    });
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
    setUnsavedChanges(true);
  };

  const handleDeleteComment = (index: number) => {
    const updatedComments = comments.filter((_, i) => i !== index);
    setComments(updatedComments);
    setUnsavedChanges(true);
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
    setUnsavedChanges(true);
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

  const priorityColors = {
    Low: "from-green-400 to-green-600",
    Medium: "from-yellow-400 to-orange-500",
    High: "from-red-400 to-red-600",
  };

  // Story point options (Fibonacci sequence)
  const storyPointOptions = ['1', '2', '3', '5', '8', '13', '21'];

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
              {/* Editable Title */}
              <div className="mb-2">
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
                    <h2 className="text-2xl font-bold text-white flex-1">
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
                {/* Sprint Info */}
                {currentSprint && (
                  <span className="flex items-center gap-2 px-2 py-1 bg-white/20 rounded-full">
                    <Zap size={14} />
                    Sprint {currentSprint.sprintNumber}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Editable Priority */}
              {editingPriority ? (
                <div className="flex items-center gap-2">
                  <CustomDropdown
                    options={["Low", "Medium", "High"]}
                    selected={priority}
                    setSelected={(val) =>
                      setPriority(val as "Low" | "Medium" | "High")
                    }
                    placeholder="Priority"
                    className="w-32 z-50"
                  />
                  <button
                    onClick={handleSavePriority}
                    className="p-2 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors"
                    title="Save priority"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={handleCancelPriority}
                    className="p-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
                    title="Cancel"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <div
                    className={`px-3 py-1 rounded-full bg-gradient-to-r ${
                      priorityColors[priority as keyof typeof priorityColors]
                    } text-white text-sm font-semibold shadow-lg`}
                  >
                    {priority} Priority
                  </div>
                  <button
                    onClick={() => setEditingPriority(true)}
                    className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors opacity-0 group-hover:opacity-100"
                    title="Edit priority"
                  >
                    <Edit3 size={16} />
                  </button>
                </div>
              )}

              {/* Editable Story Points */}
              {editingPoints ? (
                <div className="flex items-center gap-2">
                  <CustomDropdown
                    options={storyPointOptions}
                    selected={points.toString()}
                    setSelected={(val) => setPoints(parseInt(val))}
                    placeholder="Points"
                    className="w-24"
                  />
                  <button
                    onClick={handleSavePoints}
                    className="p-2 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors"
                    title="Save points"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={handleCancelPoints}
                    className="p-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
                    title="Cancel"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <div className="px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold shadow-lg flex items-center gap-1">
                    <Hash size={14} />
                    {points} {points === 1 ? 'Point' : 'Points'}
                  </div>
                  <button
                    onClick={() => setEditingPoints(true)}
                    className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors opacity-0 group-hover:opacity-100"
                    title="Edit story points"
                  >
                    <Edit3 size={16} />
                  </button>
                </div>
              )}

              <button
                onClick={closeModal}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all duration-200 hover:scale-110"
              >
                <X size={20} />
              </button>
            </div>
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
              onChange={(e) => {
                setDescription(e.target.value);
                setUnsavedChanges(true);
              }}
              className="w-full min-h-[100px] p-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none transition-all duration-200 resize-none"
              placeholder="Edit task description..."
            />
          </div>

                    {/* Sprint Assignment */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Zap size={18} className="text-purple-600" />
              </div>
              <h3 className="font-semibold text-slate-800">Sprint Assignment</h3>
            </div>
            
            {editingSprint ? (
              <div className="flex items-center gap-2">
                <div className="flex-1">
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
                <button
                  onClick={handleSaveSprint}
                  className="p-2 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors"
                  title="Save sprint assignment"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={handleCancelSprint}
                  className="p-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
                  title="Cancel"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between py-2 px-4 bg-purple-50 rounded-xl border border-purple-200 group">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-semibold text-purple-800">
                      {currentSprint ? currentSprint.name : "Backlog"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingSprint(true)}
                  className="p-2 rounded-lg bg-purple-200 hover:bg-purple-300 text-purple-700 transition-colors opacity-0 group-hover:opacity-100"
                  title="Change sprint assignment"
                >
                  <Edit3 size={16} />
                </button>
              </div>
            )}
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
                selected={assignedTo}
                setSelected={(val) => {
                  setAssignedTo(val);
                  setUnsavedChanges(true);
                }}
                placeholder="Assign to..."
                className="w-full py-4"
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
                onChange={(e) => {
                  setDueDate(e.target.value);
                  setUnsavedChanges(true);
                }}
                className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-purple-500 focus:outline-none transition-all duration-200"
              />
            </div>
          </div>

          {/* Rest of the content remains the same - Child Tasks, Tags, Files, Activity History, Comments sections */}
          {/* ... (keeping the rest of the component exactly as it was) ... */}

          {/* Child Tasks */}
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
                      min={new Date().toISOString().split("T")[0]} // Prevents selecting past dates
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
                      // Edit mode (keep existing edit form)
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
                          <div className="relative z-30">
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
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="relative z-30">
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
                          </div>
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
                            min={new Date().toISOString().split("T")[0]}
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
                      // Enhanced View mode with detailed information including description
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
                          {/* Title and Priority Row */}
                          <div className="flex items-center justify-between mb-3">
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
                              {childTask.priority && (
                                <span
                                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                                    childTask.priority === "High"
                                      ? "bg-red-100 text-red-700 border border-red-200"
                                      : childTask.priority === "Medium"
                                      ? "bg-yellow-100 text-yellow-700 border border-yellow-200"
                                      : "bg-green-100 text-green-700 border border-green-200"
                                  }`}
                                >
                                  {childTask.priority} Priority
                                </span>
                              )}
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
                                    () => () =>
                                      handleDeleteChildTask(
                                        childTask.id,
                                        childTask.title
                                      )
                                  );
                                }}
                                className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all"
                                title="Delete subtask"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          {/* Enhanced Description Display */}
                          {childTask.description &&
                            childTask.description.trim() && (
                              <div className="mb-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <FileText
                                    size={14}
                                    className="text-slate-500"
                                  />
                                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                    Description
                                  </span>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                    {childTask.description}
                                  </p>
                                </div>
                              </div>
                            )}

                          {/* Enhanced Assignment and Due Date Info */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            {/* Assignment Info */}
                            <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                              <div className="p-2 rounded-lg bg-blue-100">
                                <User size={14} className="text-blue-600" />
                              </div>
                              <div className="flex-1">
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                  Assigned To
                                </p>
                                <p
                                  className={`text-sm font-semibold ${
                                    !childTask.assignedTo ||
                                    childTask.assignedTo === "Unassigned"
                                      ? "text-slate-400 italic"
                                      : "text-slate-700"
                                  }`}
                                >
                                  {childTask.assignedTo || "Unassigned"}
                                </p>
                              </div>
                            </div>

                            {/* Due Date Info */}
                            <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                              <div
                                className={`p-2 rounded-lg ${
                                  childTask.dueDate &&
                                  new Date(childTask.dueDate) < new Date() &&
                                  childTask.status !== "done"
                                    ? "bg-red-100"
                                    : "bg-violet-100"
                                }`}
                              >
                                <Calendar
                                  size={14}
                                  className={
                                    childTask.dueDate &&
                                    new Date(childTask.dueDate) < new Date() &&
                                    childTask.status !== "done"
                                      ? "text-red-600"
                                      : "text-purple-600"
                                  }
                                />
                              </div>
                              <div className="flex-1">
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                  Due Date
                                </p>
                                <p
                                  className={`text-sm font-semibold ${
                                    !childTask.dueDate
                                      ? "text-slate-400 italic"
                                      : childTask.dueDate &&
                                        new Date(childTask.dueDate) <
                                          new Date() &&
                                        childTask.status !== "done"
                                      ? "text-red-700"
                                      : "text-slate-700"
                                  }`}
                                >
                                  {childTask.dueDate
                                    ? new Date(
                                        childTask.dueDate
                                      ).toLocaleDateString("en-US", {
                                        weekday: "short",
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                      })
                                    : "No due date"}
                                  {childTask.dueDate &&
                                    new Date(childTask.dueDate) < new Date() &&
                                    childTask.status !== "done" && (
                                      <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                                        Overdue
                                      </span>
                                    )}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Status and Creation Info */}
                          <div className="flex items-center justify-between text-xs text-slate-500 bg-white p-2 rounded-lg border border-slate-200">
                            <div className="flex items-center gap-4">
                              <span
                                className={`px-2 py-1 rounded-full font-medium ${
                                  childTask.status === "done"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-blue-100 text-blue-700"
                                }`}
                              >
                                {childTask.status === "done"
                                  ? "Completed"
                                  : "In Progress"}
                              </span>
                              <span>
                                Created by{" "}
                                {childTask.createdBy?.name ||
                                  childTask.createdBy?.email ||
                                  "Unknown"}
                              </span>
                            </div>
                            <span>
                              {childTask.createdAt
                                ?.toDate?.()
                                ?.toLocaleDateString?.() || "Unknown date"}
                            </span>
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

          {/* Tags */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-orange-100">
                  <Tag size={18} className="text-orange-600" />
                </div>
                <h3 className="font-semibold text-slate-800">Tags</h3>
              </div>
              <button
                onClick={() => setShowTagInput(!showTagInput)}
                className="p-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
              >
                {showTagInput ? <X size={16} /> : <Plus size={16} />}
              </button>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {tags.map((tag, index) => (
                  <span
                    key={index}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2 shadow-md"
                  >
                    #{tag}
                    <button
                      onClick={() => {
                        setTags(tags.filter((_, i) => i !== index));
                        setUnsavedChanges(true);
                      }}
                      className="hover:bg-white/20 rounded-full p-1 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {showTagInput && (
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newTag.trim()) {
                    setTags([...tags, newTag.trim()]);
                    setNewTag("");
                    setShowTagInput(false);
                    setUnsavedChanges(true);
                    e.preventDefault();
                  }
                }}
                placeholder="Type tag and press Enter"
                className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none transition-all duration-200"
                autoFocus
              />
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
                          setUnsavedChanges(true);
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
                setUnsavedChanges(true);
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
                          {log.user || "System"} â€¢{" "}
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
          {/* Enhanced Comments Section with Date and Time */}
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
                      {/* Comment Header with User Avatar */}
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
                                {comment.timestamp?.toDate?.() ? (
                                  <>
                                    {comment.timestamp
                                      .toDate()
                                      .toLocaleDateString("en-US", {
                                        weekday: "short",
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                      })}{" "}
                                    at{" "}
                                    {comment.timestamp
                                      .toDate()
                                      .toLocaleTimeString("en-US", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        hour12: true,
                                      })}
                                    {comment.edited && (
                                      <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                                        Edited
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  "Unknown time"
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

                      {/* Comment Content */}
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
    </div>
  );
};

export default TaskModal;