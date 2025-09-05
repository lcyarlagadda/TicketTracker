import React, { useState, useMemo, useRef } from 'react';
import { X, Search, Hash, CheckCircle } from 'lucide-react';
import { Task } from '../../store/types/types';

interface TaskSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[]; 
  onTaskSelect: (task: Task) => void;
}

const TaskSelectionModal: React.FC<TaskSelectionModalProps> = ({
  isOpen,
  onClose,
  tasks,
  onTaskSelect
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTasks = useMemo(() => {
    if (!searchTerm.trim()) return tasks;
    
    return tasks.filter(task =>
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [tasks, searchTerm]);

  const handleTaskSelect = (task: Task) => {
    onTaskSelect(task);
    onClose();
    setSearchTerm('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Hash size={20} className="text-blue-600" />
            <h2 className="text-xl font-bold text-slate-800">Select Task to Reference</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-slate-200">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tasks by title, ID, or description..."
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>
        </div>

        {/* Task List */}
        <div className="max-h-96 overflow-y-auto">
          {filteredTasks.length > 0 ? (
            <div className="p-4 space-y-2">
              {filteredTasks.map(task => (
                <button
                  key={task.id}
                  onClick={() => handleTaskSelect(task)}
                  className="w-full text-left p-4 hover:bg-blue-50 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Hash size={16} className="text-slate-400 group-hover:text-blue-600" />
                      <span className="text-sm font-mono text-slate-500 group-hover:text-blue-600">
                        #{task.id.slice(-6)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-slate-800 group-hover:text-blue-800 truncate">
                          {task.title}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                          task.priority === 'High' ? 'bg-red-100 text-red-700' :
                          task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {task.priority}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                          task.status === 'Done' || task.status === 'done' ? 'bg-green-100 text-green-700' :
                          task.status === 'In Progress' || task.status === 'inprogress' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {task.status === 'inprogress' ? 'In Progress' : task.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <span>{task.points !== null && task.points !== undefined ? task.points : 0} points</span>
                        <span>•</span>
                        <span>{task.assignedTo ? task.assignedTo.name : 'Unassigned'}</span>
                        {(task.status === 'Done' || task.status === 'done') && (
                          <CheckCircle size={14} className="text-green-600" />
                        )}
                      </div>
                      {task.description && (
                        <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500">
              <Hash size={48} className="mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-medium mb-2">No tasks found</h3>
              <p className="text-sm">
                {searchTerm ? `No tasks match "${searchTerm}"` : 'No tasks available to reference'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <p className="text-xs text-slate-600 text-center">
            Click on a task to reference it in your comment or reflection
          </p>
        </div>
      </div>
    </div>
  );
};

interface SmartCommentInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  users: Array<{ id: string; name: string; email: string }>;
  tasks: Task[]; // Use actual Task type
}

const SmartCommentInput: React.FC<SmartCommentInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder,
  users,
  tasks
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [mentionState, setMentionState] = useState<{
    isOpen: boolean;
    type: 'users' | null;
    position: { top: number; left: number };
    searchTerm: string;
    startIndex: number;
  }>({
    isOpen: false,
    type: null,
    position: { top: 0, left: 0 },
    searchTerm: '',
    startIndex: 0
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;
    
    onChange(newValue);
    
    // Check for @ mentions only (# will open modal)
    const beforeCursor = newValue.slice(0, cursorPosition);
    const atMatch = beforeCursor.match(/@(\w*)$/);
    
    if (atMatch) {
      const searchTerm = atMatch[1];
      const startIndex = cursorPosition - atMatch[0].length;
      
      // Calculate position for dropdown
      if (inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect();
        const textWidth = getTextWidth(beforeCursor.slice(0, startIndex), inputRef.current);
        
        setMentionState({
          isOpen: true,
          type: 'users',
          position: {
            top: rect.bottom + 4,
            left: rect.left + textWidth
          },
          searchTerm,
          startIndex
        });
      }
    } else {
      setMentionState(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === '#') {
      // Open task modal for # mentions
      e.preventDefault();
      setShowTaskModal(true);
    } else if (e.key === 'Enter' && !mentionState.isOpen) {
      onSubmit();
    } else if (e.key === 'Escape') {
      setMentionState(prev => ({ ...prev, isOpen: false }));
    }
  };

  const getTextWidth = (text: string, element: HTMLInputElement): number => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context) {
      const style = window.getComputedStyle(element);
      context.font = `${style.fontSize} ${style.fontFamily}`;
      return context.measureText(text).width;
    }
    return 0;
  };

  const handleUserMentionSelect = (user: { id: string; name: string }) => {
    const beforeMention = value.slice(0, mentionState.startIndex);
    const afterCursor = value.slice(inputRef.current?.selectionStart || 0);
    const mentionText = `@${user.name}`;
    
    const newValue = beforeMention + mentionText + ' ' + afterCursor;
    onChange(newValue);
    setMentionState(prev => ({ ...prev, isOpen: false }));
    
    // Focus back to input
    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPosition = beforeMention.length + mentionText.length + 1;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
  };

  const handleTaskSelect = (task: Task) => {
    const cursorPosition = inputRef.current?.selectionStart || value.length;
    const beforeCursor = value.slice(0, cursorPosition);
    const afterCursor = value.slice(cursorPosition);
    
    const taskReference = `#${task.id.slice(-6)}`;
    const newValue = beforeCursor + taskReference + ' ' + afterCursor;
    onChange(newValue);
    
    // Focus back to input
    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPosition = beforeCursor.length + taskReference.length + 1;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
  };

  const filteredUsers = useMemo(() => {
    if (!mentionState.isOpen || mentionState.type !== 'users') return [];
    
    if (!mentionState.searchTerm) return users.slice(0, 5);
    
    return users.filter(user => 
      user.name.toLowerCase().includes(mentionState.searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(mentionState.searchTerm.toLowerCase())
    ).slice(0, 5);
  }, [mentionState, users]);

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyPress}
        placeholder={placeholder}
        className="flex-1 p-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
      />
      
      {/* User Mention Dropdown */}
      {mentionState.isOpen && mentionState.type === 'users' && (
        <div 
          className="fixed bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto"
          style={{ 
            top: mentionState.position.top, 
            left: mentionState.position.left,
            minWidth: '200px'
          }}
        >
          <div className="p-2">
            <div className="flex items-center gap-2 px-2 py-1 text-xs text-slate-500 border-b">
              <span>@</span>
              <span>Mention User</span>
            </div>
            {filteredUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => handleUserMentionSelect(user)}
                className="w-full text-left px-2 py-2 hover:bg-blue-50 rounded text-sm flex items-center gap-2"
              >
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-xs text-slate-500">{user.email}</div>
                </div>
              </button>
            ))}
            {filteredUsers.length === 0 && (
              <div className="px-2 py-3 text-sm text-slate-500 text-center">
                No users found
              </div>
            )}
          </div>
        </div>
      )}

      {/* Task Selection Modal */}
      <TaskSelectionModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        tasks={tasks}
        onTaskSelect={handleTaskSelect}
      />
    </>
  );
};

// Fix 3: Updated Smart Reflection Input with correct types
interface SmartReflectionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  tasks: Task[];
  className?: string;
  rows?: number;
  isTextarea?: boolean;
}

const SmartReflectionInput: React.FC<SmartReflectionInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder,
  tasks,
  className = "",
  rows = 1,
  isTextarea = false
}) => {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === '#') {
      // Open task modal for # mentions
      e.preventDefault();
      setShowTaskModal(true);
    } else if (e.key === 'Enter' && !e.shiftKey && !isTextarea) {
      e.preventDefault();
      onSubmit();
    }
  };

  const handleTaskSelect = (task: Task) => {
    const cursorPosition = (inputRef.current as any)?.selectionStart || value.length;
    const beforeCursor = value.slice(0, cursorPosition);
    const afterCursor = value.slice(cursorPosition);
    
    const taskReference = `#${task.id.slice(-6)}`;
    const newValue = beforeCursor + taskReference + ' ' + afterCursor;
    onChange(newValue);
    
    // Focus back to input
    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPosition = beforeCursor.length + taskReference.length + 1;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
  };

  const InputComponent = isTextarea ? 'textarea' : 'input';

  return (
    <>
      <InputComponent
        ref={inputRef as any}
        type={isTextarea ? undefined : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyPress}
        placeholder={placeholder}
        className={className}
        rows={isTextarea ? rows : undefined}
      />
      
      <TaskSelectionModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        tasks={tasks}
        onTaskSelect={handleTaskSelect}
      />
    </>
  );
};

export { TaskSelectionModal, SmartCommentInput, SmartReflectionInput };