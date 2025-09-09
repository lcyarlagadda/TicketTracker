// components/Forms/CreateTaskForm.tsx with Task Types and Epic Selection
import React, { useState } from "react";
import {
  Plus,
  FileText,
  Target,
  User,
  Calendar,
  Save,
  X,
  Hash,
  Zap,
  Layers,
  Crown,
} from "lucide-react";
import { Board, Task, Sprint, TaskType } from "../../store/types/types";
import CustomDropdown from "../Atoms/CustomDropDown";
import ErrorModal from "../Atoms/ErrorModal";

interface CreateTaskFormProps {
  board: Board;
  onSubmit: (taskData: Omit<Task, "id" | "boardId">) => void;
  onCancel: () => void;
  existingTasks: Task[];
  sprints?: Sprint[];
  isSubtask?: boolean;
  parentTaskId?: string;
}

const CreateTaskForm: React.FC<CreateTaskFormProps> = ({
  board,
  onSubmit,
  onCancel,
  existingTasks,
  sprints = [],
  isSubtask = false,
  parentTaskId,
}) => {
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "Medium" as "Low" | "Medium" | "High",
    points: null as number | null, // Optional story points
    dueDate: "",
    epics: [] as string[],
    assignedTo: "",
    taskStatus: "todo",
    sprintId: "",
    sprintName: "Backlog",
    type: isSubtask ? "subtask" : "story" as "epic" | "feature" | "story" | "bug" | "enhancement" | "subtask" | "poc",
  });


  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({
    title: "",
    dueDate: "",
    taskStatus: "",
    epics: "",
    points: "",
    sprintId: "",
    type: "",
  });

  // Get epic-type tasks from the board
  const epicTasks = existingTasks
    .filter(task => task.type === 'epic')
    .sort((a, b) => a.title.localeCompare(b.title));

  const validateField = (name: string, value: string | number) => {
    let error = "";

    switch (name) {
      case "title":
        if (typeof value === "string") {
          if (!value.trim()) {
            error = "Task title is required";
          } else if (value.trim().length < 3) {
            error = "Task title must be at least 3 characters";
          } else if (value.trim().length > 100) {
            error = "Task title must be less than 100 characters";
          } else {
            // Check for duplicate task titles in the current board (case-insensitive)
            const isDuplicate = existingTasks.some(
              (task) =>
                task.title.toLowerCase().trim() === value.toLowerCase().trim()
            );
            if (isDuplicate) {
              error = "A task with this title already exists in this board";
            }
          }
        }
        break;
      case "points":
        if (typeof value === "number" && value !== null) {
          if (value < 1 || value > 100) {
            error = "Story points must be between 1 and 100";
          }
        }
        break;
      case "dueDate":
        if (typeof value === "string") {
          if (value) {
            const selectedDate = new Date(value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (selectedDate < today) {
              error = "Due date cannot be in the past";
            }
          }
        }
        break;
      case "taskStatus":
        if (typeof value === "string") {
          if (!value) {
            error = "Status column is required";
          } else if (!board.statuses.includes(value)) {
            error = "Invalid status selected";
          }
        }
        break;
      case "sprintId":
        if (typeof value === "string" && value && sprints.length > 0) {
          const validSprint = sprints.find((s) => s.id === value);
          if (!validSprint) {
            error = "Invalid sprint selected";
          } else if (validSprint.status === "completed") {
            error = "Cannot assign task to completed sprint";
          }
        }
        break;
      case "type":
        if (typeof value === "string") {
          const validTypes = ["epic", "feature", "story", "bug", "enhancement", "subtask", "poc"];
          if (!validTypes.includes(value)) {
            error = "Invalid task type selected";
          }
        }
        break;
    }

    setFieldErrors((prev) => ({ ...prev, [name]: error }));
    return !error;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    const processedValue = name === "points" ? parseInt(value) || 1 : value;
    setForm((prev) => ({ ...prev, [name]: processedValue }));

    // Real-time validation for specific fields
    if (
      ["title", "dueDate", "taskStatus", "points", "sprintId", "type"].includes(
        name
      )
    ) {
      validateField(name, processedValue);
    }
  };

  const handleDropdownChange = (field: string, value: string) => {
    if (field === "points") {
      const pointsValue = value === "" ? null : parseInt(value);
      setForm((prev) => ({ ...prev, [field]: pointsValue }));
      if (pointsValue !== null) {
        validateField(field, pointsValue);
      }
    } else {
      setForm((prev) => ({ ...prev, [field]: value }));
      if (["taskStatus", "sprintId", "type"].includes(field)) {
        validateField(field, value);
      }
    }
  };


  const handleRemoveEpic = (epicToRemove: string) => {
    setForm(prev => ({
      ...prev,
      epics: prev.epics.filter(epic => epic !== epicToRemove)
    }));
  };

  const validateForm = () => {
    const { title, dueDate, taskStatus, points, sprintId, type } = form;

    // Validate all required fields
    const titleValid = validateField("title", title);
    const statusValid = validateField("taskStatus", taskStatus);
    const sprintValid = validateField("sprintId", sprintId);
    const typeValid = validateField("type", type);

    if (
      !titleValid ||
      !statusValid ||
      !sprintValid ||
      !typeValid
    ) {
      setError("Please fix all validation errors before submitting.");
      return false;
    }

    // Additional business logic validation
    if (
      form.assignedTo &&
      !["Unassigned", ...board.collaborators.map((c) => c.name)].includes(
        form.assignedTo
      )
    ) {
      setError("Invalid assignee selected.");
      return false;
    }

    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const {
      title,
      description,
      priority,
      points,
      dueDate,
      taskStatus,
      epics,
      assignedTo,
      sprintId,
      type,
    } = form;

    const taskData: Omit<Task, "id" | "boardId"> = {
      title: title.trim(),
      description: description.trim(),
      priority,
      dueDate: dueDate || "",
      status: taskStatus,
      epics: epics,
      assignedTo: assignedTo && assignedTo !== "Unassigned" 
        ? {
            uid: board.collaborators.find(c => c.name === assignedTo)?.email || "",
            email: board.collaborators.find(c => c.name === assignedTo)?.email || "",
            name: assignedTo
          }
        : null,
      createdAt: new Date(),
      createdBy: {
        uid: "",
        email: "",
        name: "",
      },
      points: points || null,
      progressLog: [],
      comments: [],
      files: [],
      type: type as TaskType,
      ...(sprintId && { 
        sprintId: sprintId,
        sprintName: sprints.find((s) => s.id === sprintId)?.name 
      }),
      ...(parentTaskId && { parentTaskId }),
    };

    onSubmit(taskData);
  };

  // Get today's date for min date validation
  const today = new Date().toISOString().split("T")[0];

  const assigneeOptions = [
    "Unassigned",
    ...board.collaborators.map((c) => c.name),
  ];

  // Common story point values (Fibonacci sequence) with "No Points" option
  const storyPointOptions = ["", "1", "2", "3", "5", "8", "13", "21"];

  // Task type options
  const taskTypeOptions = isSubtask 
    ? ["subtask"]
    : ["epic", "feature", "story", "bug", "enhancement", "poc"];

  // Sprint options - only show active and planning sprints if they exist
  const activeSprints = sprints.filter((s) => s.status === "active" || s.status === "planning");
  const sprintOptions = activeSprints.map((s) => ({
    value: s.id,
    label: s.name,
  }));

  const getSprintOptionValue = (
    option: { value: string; label: string }
  ) => {
    return option.value;
  };

  const getSprintOptionLabel = (
    option: { value: string; label: string }
  ) => {
    return option.label;
  };

  return (
    <>
      <div className="space-y-6">
        {/* Title, Type and Priority Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1 md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <FileText size={16} className="inline mr-2" />
              Task Title *
            </label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Enter task title (3-100 characters)"
              maxLength={100}
              className={`w-full border-2 rounded-xl px-4 py-3 h-12 focus:outline-none transition-colors ${
                fieldErrors.title
                  ? "border-red-300 bg-red-50 focus:border-red-500"
                  : "border-slate-200 focus:border-blue-500"
              }`}
            />
            {fieldErrors.title && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.title}</p>
            )}
            <p className="text-xs text-slate-500">
              {form.title.length}/100 characters
            </p>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <Layers size={16} className="inline mr-2" />
              Type *
            </label>
            <div className="h-12">
              <CustomDropdown
                options={taskTypeOptions}
                selected={form.type}
                setSelected={(val) =>
                  handleDropdownChange("type", val)
                }
                placeholder="Select type"
                className="w-full h-full"
                disabled={isSubtask}
              />
            </div>
            {fieldErrors.type && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.type}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <Target size={16} className="inline mr-2" />
              Priority
            </label>
            <div className="h-12">
              <CustomDropdown
                options={["Low", "Medium", "High"]}
                selected={form.priority}
                setSelected={(val) =>
                  handleDropdownChange(
                    "priority",
                    val as "Low" | "Medium" | "High"
                  )
                }
                placeholder="Select priority"
                className="w-full h-full"
              />
            </div>
          </div>
        </div>

        {/* Points, Status, and Sprint Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <Hash size={16} className="inline mr-2" />
              Story Points
            </label>
            <div className="h-12">
              <CustomDropdown
                options={["No Points", "1", "2", "3", "5", "8", "13", "21"]}
                selected={form.points ? form.points?.toString() : "No Points"}
                setSelected={(val) => handleDropdownChange("points", val === "No Points" ? "" : val)}
                placeholder="Select points (optional)"
                className="w-full h-full"
              />
            </div>
            {fieldErrors.points && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.points}</p>
            )}
            <p className="text-xs text-slate-500">
              Effort estimate (Fibonacci: 1, 2, 3, 5, 8, 13, 21)
            </p>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <Target size={16} className="inline mr-2" />
              Status Column *
            </label>
            <div className="h-12">
              <CustomDropdown
                options={board.statuses}
                selected={form.taskStatus}
                setSelected={(val) => handleDropdownChange("taskStatus", val)}
                placeholder="Select column"
                className="w-full h-full"
              />
            </div>
            {fieldErrors.taskStatus && (
              <p className="text-red-600 text-xs mt-1">
                {fieldErrors.taskStatus}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <Zap size={16} className="inline mr-2" />
              Sprint Assignment
            </label>
            {activeSprints.length > 0 ? (
              <div className="h-12 relative z-0">
                <CustomDropdown
                  options={sprintOptions.map((option) =>
                    getSprintOptionLabel(option)
                  )}
                  selected={form.sprintName ? form.sprintName : ""}
                  setSelected={(val) => {
                    const selectedOption = sprintOptions.find(
                      (option) => getSprintOptionLabel(option) === val
                    );

                    if (selectedOption) {
                      const sprintId = getSprintOptionValue(selectedOption);
                      const sprintName = getSprintOptionLabel(selectedOption);

                      setForm((prev) => ({
                        ...prev,
                        sprintId,
                        sprintName,
                      }));

                      validateField("sprintId", sprintId);
                    }
                  }}
                  placeholder="Select sprint"
                  className="w-full h-full"
                />
              </div>
            ) : (
              <div className="h-12 w-full px-3 py-2 bg-slate-100 border-2 border-slate-200 rounded-xl text-slate-500 text-sm flex items-center">
                No active sprints available
              </div>
            )}
            {fieldErrors.sprintId && (
              <p className="text-red-600 text-xs mt-1">
                {fieldErrors.sprintId}
              </p>
            )}
            <p className="text-xs text-slate-500">
              {sprints.length === 0
                ? "Backlogs available"
                : "Optional sprint assignment"}
            </p>
          </div>
        </div>

        {/* Assignment and Due Date Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <User size={16} className="inline mr-2" />
              Assign To
            </label>
            <div className="h-12 relative z-0">
              <CustomDropdown
                options={assigneeOptions}
                selected={form.assignedTo || "Unassigned"}
                setSelected={(val) => handleDropdownChange("assignedTo", val)}
                placeholder="Select assignee"
                className="w-full h-full"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <Calendar size={16} className="inline mr-2" />
              Due Date
            </label>
            <input
              type="date"
              name="dueDate"
              value={form.dueDate}
              onChange={handleChange}
              min={today}
              className={`w-full border-2 rounded-xl px-4 py-3 h-12 focus:outline-none transition-colors ${
                fieldErrors.dueDate
                  ? "border-red-300 bg-red-50 focus:border-red-500"
                  : "border-slate-200 focus:border-blue-500"
              }`}
            />
            {fieldErrors.dueDate && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.dueDate}</p>
            )}
          </div>
        </div>

        {/* Epic Relations Row */}
        <div className="space-y-1">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            <Crown size={16} className="inline mr-2" />
            Related epics
          </label>

          {/* Selected Epic Tasks */}
          {form.epics.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {form.epics.map((epicName) => (
                <span
                  key={epicName}
                  className="flex items-center gap-2 text-sm text-purple-700 bg-purple-100 border border-purple-200 rounded-full px-3 py-1"
                >
                  {epicName}
                  <button
                    type="button"
                    onClick={() => handleRemoveEpic(epicName)}
                    className="hover:bg-purple-200 rounded-full p-1 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Epic Tasks Multi-Select */}
          {epicTasks.length > 0 && (
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
              <p className="text-xs font-medium text-purple-600 mb-3">Select epic tasks to add:</p>
              <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-purple-100">
                {epicTasks.map((epicTask) => (
                  <label key={epicTask.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-purple-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.epics.includes(epicTask.title)}
                      onChange={(e) => {
                        if (e.target.checked && form.epics.length < 3) {
                          setForm(prev => ({
                            ...prev,
                            epics: [...prev.epics, epicTask.title]
                          }));
                        } else if (!e.target.checked) {
                          setForm(prev => ({
                            ...prev,
                            epics: prev.epics.filter(name => name !== epicTask.title)
                          }));
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

          <p className="text-xs text-slate-500">
            {form.epics.length}/3 epic added to this task.
          </p>
        </div>

        {/* Description Row */}
        <div className="space-y-1">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            <FileText size={16} className="inline mr-2" />
            Description (Optional)
          </label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Task description (optional)"
            rows={3}
            maxLength={1000}
            className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors resize-none"
          />
          <p className="text-xs text-slate-500">
            {form.description.length}/1000 characters
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-slate-200">
          <button
            onClick={handleSubmit}
            disabled={
              !form.title.trim() ||
              !form.taskStatus ||
              !form.type ||
              Object.values(fieldErrors).some((error) => error)
            }
            className="bg-slate-700 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <Save size={18} />
            {isSubtask ? 'Create Subtask' : 'Create Task'}
          </button>
          <button
            onClick={onCancel}
            className="border-2 border-slate-300 text-slate-700 px-6 py-3 rounded-xl font-semibold hover:bg-slate-50 transition-all duration-200"
          >
            Cancel
          </button>
        </div>
      </div>

      <ErrorModal message={error} onClose={() => setError("")} />
    </>
  );
};

export default CreateTaskForm;