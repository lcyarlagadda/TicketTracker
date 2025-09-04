// components/Forms/CreateTaskForm.tsx with Points Field
import React, { useState } from 'react';
import { Plus, FileText, Target, User, Calendar, Tag, Save, X, Hash } from 'lucide-react';
import { Board, Task } from '../../store/types/types';
import CustomDropdown from '../Atoms/CustomDropDown';
import ErrorModal from '../Atoms/ErrorModal';

interface CreateTaskFormProps {
  board: Board;
  onSubmit: (taskData: Omit<Task, 'id' | 'boardId'>) => void;
  onCancel: () => void;
  existingTasks: Task[]; 
}

const CreateTaskForm: React.FC<CreateTaskFormProps> = ({ board, onSubmit, onCancel, existingTasks }) => {
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'Medium' as 'Low' | 'Medium' | 'High',
    points: 3, // Default to 3 story points
    dueDate: '',
    tags: '',
    assignedTo: '',
    taskStatus: '',
  });

  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({
    title: '',
    dueDate: '',
    taskStatus: '',
    tags: '',
    points: '',
  });

  const validateField = (name: string, value: string | number) => {
    let error = '';
    
    switch (name) {
      case 'title':
        if (typeof value === 'string') {
          if (!value.trim()) {
            error = 'Task title is required';
          } else if (value.trim().length < 3) {
            error = 'Task title must be at least 3 characters';
          } else if (value.trim().length > 100) {
            error = 'Task title must be less than 100 characters';
          } else {
            // Check for duplicate task titles in the current board (case-insensitive)
            const isDuplicate = existingTasks.some(
              task => task.title.toLowerCase().trim() === value.toLowerCase().trim()
            );
            if (isDuplicate) {
              error = 'A task with this title already exists in this board';
            }
          }
        }
        break;
      case 'points':
        if (typeof value === 'number') {
          if (value < 1 || value > 100) {
            error = 'Story points must be between 1 and 100';
          }
        }
        break;
      case 'dueDate':
        if (typeof value === 'string') {
          if (!value) {
            error = 'Due date is required';
          } else {
            const selectedDate = new Date(value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (selectedDate < today) {
              error = 'Due date cannot be in the past';
            }
          }
        }
        break;
      case 'taskStatus':
        if (typeof value === 'string') {
          if (!value) {
            error = 'Status column is required';
          } else if (!board.statuses.includes(value)) {
            error = 'Invalid status selected';
          }
        }
        break;
      case 'tags':
        if (typeof value === 'string' && value.trim()) {
          const tagList = value.split(',').map(tag => tag.trim()).filter(Boolean);
          if (tagList.length > 5) {
            error = 'Maximum 5 tags allowed';
          } else if (tagList.some(tag => tag.length > 20)) {
            error = 'Each tag must be 20 characters or less';
          } else if (tagList.some(tag => tag.length < 2)) {
            error = 'Each tag must be at least 2 characters';
          }
        }
        break;
    }

    setFieldErrors(prev => ({ ...prev, [name]: error }));
    return !error;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const processedValue = name === 'points' ? parseInt(value) || 1 : value;
    setForm(prev => ({ ...prev, [name]: processedValue }));
    
    // Real-time validation for specific fields
    if (['title', 'dueDate', 'taskStatus', 'tags', 'points'].includes(name)) {
      validateField(name, processedValue);
    }
  };

  const handleDropdownChange = (field: string, value: string) => {
    if (field === 'points') {
      const pointsValue = parseInt(value);
      setForm(prev => ({ ...prev, [field]: pointsValue }));
      validateField(field, pointsValue);
    } else {
      setForm(prev => ({ ...prev, [field]: value }));
      if (['taskStatus'].includes(field)) {
        validateField(field, value);
      }
    }
  };

  const validateForm = () => {
    const { title, dueDate, taskStatus, tags, points } = form;
    
    // Validate all required fields
    const titleValid = validateField('title', title);
    const dueDateValid = validateField('dueDate', dueDate);
    const statusValid = validateField('taskStatus', taskStatus);
    const tagsValid = validateField('tags', tags);
    const pointsValid = validateField('points', points);

    if (!titleValid || !dueDateValid || !statusValid || !tagsValid || !pointsValid) {
      setError('Please fix all validation errors before submitting.');
      return false;
    }

    // Additional business logic validation
    if (form.assignedTo && !['Unassigned', ...board.collaborators.map(c => c.name)].includes(form.assignedTo)) {
      setError('Invalid assignee selected.');
      return false;
    }

    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const { title, description, priority, points, dueDate, taskStatus, tags, assignedTo } = form;

    // Parse and clean tags
    const tagList = tags
      .split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(Boolean)
      .filter((tag, index, array) => array.indexOf(tag) === index); // Remove duplicates

    const taskData: Omit<Task, 'id' | 'boardId'> = {
      title: title.trim(),
      description: description.trim(),
      priority,
      dueDate,
      status: taskStatus,
      tags: tagList,
      assignedTo: assignedTo || 'Unassigned',
      createdAt: new Date(),
      createdBy: {
        uid: '',
        email: '',
        name: '',
      },
      points,
      progressLog: [],
      comments: [],
      files: [],
    };

    onSubmit(taskData);
  };

  // Get today's date for min date validation
  const today = new Date().toISOString().split('T')[0];

  const assigneeOptions = ['Unassigned', ...board.collaborators.map(c => c.name)];
  
  // Common story point values (Fibonacci sequence)
  const storyPointOptions = ['1', '2', '3', '5', '8', '13', '21'];
  
  console.log('Board collaborators in CreateTaskForm:', board.collaborators); // Debug log

  return (
    <>
      <div className="space-y-6">
        {/* Title and Priority Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  ? 'border-red-300 bg-red-50 focus:border-red-500' 
                  : 'border-slate-200 focus:border-blue-500'
              }`}
            />
            {fieldErrors.title && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.title}</p>
            )}
            <p className="text-xs text-slate-500">{form.title.length}/100 characters</p>
          </div>
          
          <div className="space-y-1">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <Target size={16} className="inline mr-2" />
              Priority
            </label>
            <div className="h-12">
              <CustomDropdown
                options={['Low', 'Medium', 'High']}
                selected={form.priority}
                setSelected={(val) => handleDropdownChange('priority', val as 'Low' | 'Medium' | 'High')}
                placeholder="Select priority"
                className="w-full h-full"
              />
            </div>
          </div>
        </div>

        {/* Points and Status Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <Hash size={16} className="inline mr-2" />
              Story Points *
            </label>
            <div className="h-12">
              <CustomDropdown
                options={storyPointOptions}
                selected={form.points.toString()}
                setSelected={(val) => handleDropdownChange('points', val)}
                placeholder="Select points"
                className="w-full h-full"
              />
            </div>
            {fieldErrors.points && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.points}</p>
            )}
            <p className="text-xs text-slate-500">Effort estimate (Fibonacci: 1, 2, 3, 5, 8, 13, 21)</p>
          </div>
          
          <div className="space-y-1">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <Target size={16} className="inline mr-2" />
              Status Column *
            </label>
            <div className="h-12 relative z-0">
              <CustomDropdown
                options={board.statuses}
                selected={form.taskStatus}
                setSelected={(val) => handleDropdownChange('taskStatus', val)}
                placeholder="Select column"
                className="w-full h-full"
              />
            </div>
            {fieldErrors.taskStatus && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.taskStatus}</p>
            )}
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
                selected={form.assignedTo || 'Unassigned'}
                setSelected={(val) => handleDropdownChange('assignedTo', val)}
                placeholder="Select assignee"
                className="w-full h-full"
              />
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <Calendar size={16} className="inline mr-2" />
              Due Date *
            </label>
            <input
              type="date"
              name="dueDate"
              value={form.dueDate}
              onChange={handleChange}
              min={today}
              className={`w-full border-2 rounded-xl px-4 py-3 h-12 focus:outline-none transition-colors ${
                fieldErrors.dueDate 
                  ? 'border-red-300 bg-red-50 focus:border-red-500' 
                  : 'border-slate-200 focus:border-blue-500'
              }`}
            />
            {fieldErrors.dueDate && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.dueDate}</p>
            )}
          </div>
        </div>

        {/* Tags Row */}
        <div className="space-y-1">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            <Tag size={16} className="inline mr-2" />
            Tags (Optional)
          </label>
          <input
            type="text"
            name="tags"
            value={form.tags}
            onChange={handleChange}
            placeholder="Enter tags separated by commas (max 5 tags, 20 chars each)"
            className={`w-full border-2 rounded-xl px-4 py-3 h-12 focus:outline-none transition-colors ${
              fieldErrors.tags 
                ? 'border-red-300 bg-red-50 focus:border-red-500' 
                : 'border-slate-200 focus:border-blue-500'
            }`}
          />
          {fieldErrors.tags && (
            <p className="text-red-600 text-xs mt-1">{fieldErrors.tags}</p>
          )}
          {form.tags && (
            <div className="flex flex-wrap gap-2 mt-2">
              {form.tags.split(',').map((tag, idx) => {
                const trimmedTag = tag.trim();
                if (!trimmedTag) return null;
                return (
                  <span
                    key={idx}
                    className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-1"
                  >
                    #{trimmedTag}
                  </span>
                );
              })}
            </div>
          )}
          <p className="text-xs text-slate-500">
            {form.tags ? form.tags.split(',').filter(t => t.trim()).length : 0}/5 tags
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
          <p className="text-xs text-slate-500">{form.description.length}/1000 characters</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-slate-200">
          <button
            onClick={handleSubmit}
            disabled={!form.title.trim() || !form.dueDate || !form.taskStatus || Object.values(fieldErrors).some(error => error)}
            className="bg-slate-700 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <Save size={18} />
            Create Task
          </button>
          <button
            onClick={onCancel}
            className="border-2 border-slate-300 text-slate-700 px-6 py-3 rounded-xl font-semibold hover:bg-slate-50 transition-all duration-200"
          >
            Cancel
          </button>
        </div>
      </div>

      <ErrorModal message={error} onClose={() => setError('')} />
    </>
  );
};

export default CreateTaskForm;