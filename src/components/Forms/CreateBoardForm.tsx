// Updated CreateBoardForm.tsx optimized for modal usage
import React, { useState } from 'react';
import { Plus, Tag, Users, Image, Save, X } from 'lucide-react';
import { Board, Collaborator, User } from '../../store/types/types';
import ErrorModal from '../Atoms/ErrorModal';

interface CreateBoardFormProps {
  onSubmit: (boardData: Omit<Board, 'id'>) => void;
  onCancel: () => void;
  loading: boolean;
  existingBoards: Board[];
  user: User | null;
}

const CreateBoardForm: React.FC<CreateBoardFormProps> = ({ onSubmit, onCancel, loading, existingBoards, user }) => {
  const [formState, setFormState] = useState({
    title: '',
    category: '',
    description: '',
    tagInput: '',
    tags: [] as string[],
    collaborators: [] as Collaborator[],
    nameInput: '',
    emailInput: '',
    imageFile: null as File | null,
  });

  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({
    title: '',
    category: '',
    email: '',
    name: '',
  });

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const validateField = (name: string, value: string) => {
    let error = '';
    
    switch (name) {
      case 'title':
        if (!value.trim()) {
          error = 'Board title is required';
        } else if (value.trim().length < 3) {
          error = 'Board title must be at least 3 characters';
        } else if (value.trim().length > 50) {
          error = 'Board title must be less than 50 characters';
        } else {
          // Check for duplicate board titles (case-insensitive)
          const isDuplicate = existingBoards.some(
            board => board.title.toLowerCase().trim() === value.toLowerCase().trim()
          );
          if (isDuplicate) {
            error = 'A board with this title already exists';
          }
        }
        break;
      case 'category':
        if (!value.trim()) {
          error = 'Category is required';
        } else if (value.trim().length < 2) {
          error = 'Category must be at least 2 characters';
        }
        break;
      case 'emailInput':
        if (value.trim() && !isValidEmail(value)) {
          error = 'Please enter a valid email address';
        }
        break;
      case 'nameInput':
        if (value.trim() && value.trim().length < 2) {
          error = 'Name must be at least 2 characters';
        }
        break;
    }

    setFieldErrors(prev => ({ ...prev, [name]: error }));
    return !error;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
    
    // Real-time validation for specific fields
    if (['title', 'category', 'emailInput', 'nameInput'].includes(name)) {
      validateField(name, value);
    }
  };

  const handleAddTag = () => {
    const tagInput = formState.tagInput.trim();
    
    if (!tagInput) {
      setError('Please enter a tag before adding.');
      return;
    }

    const newTags = tagInput
      .split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0 && tag.length <= 20);

    if (newTags.length === 0) {
      setError('Please enter valid tags (max 20 characters each).');
      return;
    }

    const duplicates = newTags.filter(tag => formState.tags.includes(tag));
    if (duplicates.length > 0) {
      setError(`Tag(s) already exist: ${duplicates.join(', ')}`);
      return;
    }

    if (formState.tags.length + newTags.length > 10) {
      setError('Maximum 10 tags allowed per board.');
      return;
    }

    setFormState(prev => ({
      ...prev,
      tags: [...prev.tags, ...newTags],
      tagInput: '',
    }));
  };

  const handleAddCollaborator = () => {
    const { nameInput, emailInput, collaborators } = formState;
    const name = nameInput.trim();
    const email = emailInput.trim();

    // Validate required fields
    if (!name) {
      setError('Collaborator name is required.');
      return;
    }
    
    if (!email) {
      setError('Collaborator email is required.');
      return;
    }

    // Validate field formats
    if (!validateField('nameInput', name) || !validateField('emailInput', email)) {
      return;
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    // Check for duplicates
    if (collaborators.some(c => c.email.toLowerCase() === email.toLowerCase())) {
      setError('This collaborator has already been added.');
      return;
    }

    // Check maximum collaborators
    if (collaborators.length >= 20) {
      setError('Maximum 20 collaborators allowed per board.');
      return;
    }

    setFormState(prev => ({
      ...prev,
      collaborators: [...prev.collaborators, { name, email, role: 'user' as const }],
      nameInput: '',
      emailInput: '',
    }));

    // Clear field errors
    setFieldErrors(prev => ({ ...prev, name: '', email: '' }));
  };

  const handleRemoveCollaborator = (emailToRemove: string) => {
    setFormState(prev => ({
      ...prev,
      collaborators: prev.collaborators.filter(c => c.email !== emailToRemove)
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file.');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image file size must be less than 5MB.');
      return;
    }

    setFormState(prev => ({ ...prev, imageFile: file }));
  };

  const validateForm = () => {
    const { title, category } = formState;
    
    // Check required fields
    if (!title.trim()) {
      setError('Board title is required.');
      return false;
    }
    
    if (!category.trim()) {
      setError('Category is required.');
      return false;
    }

    // Check field validations
    if (!validateField('title', title) || !validateField('category', category)) {
      setError('Please fix the validation errors before submitting.');
      return false;
    }

    // Check if there are any field errors
    if (Object.values(fieldErrors).some(error => error)) {
      setError('Please fix all validation errors before submitting.');
      return false;
    }

    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const { title, category, tags, imageFile, collaborators, description } = formState;

    // Automatically include current user as admin collaborator
    const updatedCollaborators = [...collaborators];
    if (user && !collaborators.some(c => c.email === user.email)) {
      updatedCollaborators.push({
        name: user.displayName || user.email || 'Current User',
        email: user.email || '',
        role: 'admin' as const
      });
    }

    // Set default role as 'user' for other collaborators
    const collaboratorsWithRoles = updatedCollaborators.map(collab => ({
      ...collab,
      role: collab.role || 'user' as const
    }));

    const boardData: Omit<Board, 'id'> = {
      title: title.trim(),
      category: category.trim(),
      tags,
      imageUrl: imageFile ? URL.createObjectURL(imageFile) : '',
      description: description.trim(),
      createdBy: {
        uid: user?.uid || '',
        email: user?.email || '',
        name: user?.displayName || user?.email || '',
      },
      collaborators: collaboratorsWithRoles,
      statuses: ['todo', 'inprogress', 'done'],
      createdAt: new Date().toISOString(),
      imageFile: imageFile || undefined,
    };

    onSubmit(boardData);
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Title and Category Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Board Title *</label>
            <input
              type="text"
              name="title"
              value={formState.title}
              onChange={handleInputChange}
              placeholder="Enter board title (3-50 characters)"
              className={`w-full border rounded-lg px-4 py-3 h-12 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                fieldErrors.title ? 'border-red-300 bg-red-50' : 'border-slate-300'
              }`}
              maxLength={50}
            />
            {fieldErrors.title && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.title}</p>
            )}
            <p className="text-xs text-slate-500">{formState.title.length}/50 characters</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Category *</label>
            <input
              type="text"
              name="category"
              value={formState.category}
              onChange={handleInputChange}
              placeholder="Enter category"
              className={`w-full border rounded-lg px-4 py-3 h-12 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                fieldErrors.category ? 'border-red-300 bg-red-50' : 'border-slate-300'
              }`}
            />
            {fieldErrors.category && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.category}</p>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Description</label>
          <textarea
            name="description"
            value={formState.description}
            onChange={handleInputChange}
            placeholder="Enter board description (optional)"
            rows={3}
            maxLength={500}
            className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
          />
          <p className="text-xs text-slate-500">{formState.description.length}/500 characters</p>
        </div>

        {/* Tags Section */}
        <div className="space-y-3 relative z-0">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Tag size={16} />
            Tags (Optional)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              name="tagInput"
              value={formState.tagInput}
              onChange={handleInputChange}
              onKeyPress={(e) => handleKeyPress(e, handleAddTag)}
              placeholder="Add tags (comma separated, max 10 tags)"
              className="flex-1 border border-slate-300 rounded-lg px-4 py-3 h-12 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
            <button
              onClick={handleAddTag}
              disabled={!formState.tagInput.trim()}
              className="px-6 py-3 h-12 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
          {formState.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formState.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-3 py-1 font-medium flex items-center gap-2"
                >
                  #{tag}
                  <button
                    onClick={() => setFormState(prev => ({
                      ...prev,
                      tags: prev.tags.filter((_, i) => i !== idx)
                    }))}
                    className="hover:bg-indigo-200 rounded-full p-0.5 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <p className="text-xs text-slate-500">{formState.tags.length}/10 tags</p>
        </div>

        {/* Collaborators Section */}
        <div className="space-y-3 relative z-0">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Users size={16} />
            Team Members (Optional)
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <input
                type="text"
                name="nameInput"
                value={formState.nameInput}
                onChange={handleInputChange}
                placeholder="Collaborator name"
                className={`w-full border rounded-lg px-4 py-3 h-12 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  fieldErrors.name ? 'border-red-300 bg-red-50' : 'border-slate-300'
                }`}
              />
              {fieldErrors.name && (
                <p className="text-red-600 text-xs">{fieldErrors.name}</p>
              )}
            </div>
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <input
                  type="email"
                  name="emailInput"
                  value={formState.emailInput}
                  onChange={handleInputChange}
                  onKeyPress={(e) => handleKeyPress(e, handleAddCollaborator)}
                  placeholder="Collaborator email"
                  className={`w-full border rounded-lg px-4 py-3 h-12 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    fieldErrors.email ? 'border-red-300 bg-red-50' : 'border-slate-300'
                  }`}
                />
                {fieldErrors.email && (
                  <p className="text-red-600 text-xs">{fieldErrors.email}</p>
                )}
              </div>
              <button
                onClick={handleAddCollaborator}
                disabled={!formState.nameInput.trim() || !formState.emailInput.trim()}
                className="px-6 py-3 h-12 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </div>
          {formState.collaborators.length > 0 && (
            <div className="space-y-2">
              {formState.collaborators.map((collaborator, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {collaborator.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{collaborator.name}</p>
                      <p className="text-xs text-slate-500">{collaborator.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveCollaborator(collaborator.email)}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-slate-500">{formState.collaborators.length}/20 collaborators</p>
        </div>

        {/* Image Upload Section */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Image size={16} />
            Board Background (Optional)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full border border-slate-300 rounded-lg px-4 py-3 h-12 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          />
          <p className="text-xs text-slate-500">Supported formats: JPG, PNG, GIF (max 5MB)</p>
          {formState.imageFile && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <span>Selected: {formState.imageFile.name}</span>
              <button
                onClick={() => setFormState(prev => ({ ...prev, imageFile: null }))}
                className="text-red-500 hover:text-red-700"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
          <button
            onClick={onCancel}
            className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !formState.title.trim() || !formState.category.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
            <Save size={16} />
            {loading ? 'Creating...' : 'Create Board'}
          </button>
        </div>
      </div>

      <ErrorModal message={error} onClose={() => setError('')} />
    </>
  );
};

export default CreateBoardForm;