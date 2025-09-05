// components/Analytics/EnhancedRetrospective.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, X, Trash2, Users, Calendar, CheckCircle, AlertCircle, Target, ThumbsUp, ThumbsDown, Settings, MessageCircle, Send, AtSign, Hash } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../../hooks/redux';
import { updateBoard } from '../../../store/slices/boardSlice';
import { Task, Board, Collaborator, Sprint, EnhancedRetroItem, NewItemForm, SprintRetroData, RetroComment, MentionTask, MentionUser } from '../../../store/types/types';
import { useParams } from 'react-router-dom';
import { sprintService } from '../../../services/sprintService';
import TaskModal from '../TaskModal';

interface EnhancedRetrospectiveTabProps {
  board: Board;
  tasks: Task[];
}

// Enhanced Smart Input for Retrospective with user and task mentions
interface EnhancedRetroInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  users: MentionUser[];
  tasks: MentionTask[];
  className?: string;
  rows?: number;
}

const EnhancedRetroInput: React.FC<EnhancedRetroInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder,
  users,
  tasks,
  className = "",
  rows = 3
}) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);
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

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;
    
    onChange(newValue);
    
    // Check for @ mentions
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
    } else if (e.key === 'Enter' && !e.shiftKey && !mentionState.isOpen) {
      e.preventDefault();
      onSubmit();
    } else if (e.key === 'Escape') {
      setMentionState(prev => ({ ...prev, isOpen: false }));
    }
  };

  const getTextWidth = (text: string, element: HTMLTextAreaElement): number => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context) {
      const style = window.getComputedStyle(element);
      context.font = `${style.fontSize} ${style.fontFamily}`;
      return context.measureText(text).width;
    }
    return 0;
  };

  const handleUserMentionSelect = (user: MentionUser) => {
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

  const handleTaskSelect = (task: MentionTask) => {
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
      <textarea
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyPress}
        placeholder={placeholder}
        className={className}
        rows={rows}
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
              <AtSign size={12} />
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
      {showTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Hash size={20} className="text-blue-600" />
                <h2 className="text-xl font-bold text-slate-800">Select Task to Reference</h2>
              </div>
              <button
                onClick={() => setShowTaskModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Task List */}
            <div className="max-h-96 overflow-y-auto">
              {tasks.length > 0 ? (
                <div className="p-4 space-y-2">
                  {tasks.map(task => (
                    <button
                      key={task.id}
                      onClick={() => {
                        handleTaskSelect(task);
                        setShowTaskModal(false);
                      }}
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
                          <h3 className="font-medium text-slate-800 group-hover:text-blue-800 truncate">
                            {task.name}
                          </h3>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500">
                  <Hash size={48} className="mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-medium mb-2">No tasks found</h3>
                  <p className="text-sm">No tasks available to reference</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Enhanced Comment Input Component
interface EnhancedCommentInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  users: MentionUser[];
  tasks: MentionTask[];
}

const EnhancedCommentInput: React.FC<EnhancedCommentInputProps> = ({
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

  const handleTaskSelect = (task: MentionTask) => {
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
      {showTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Hash size={20} className="text-blue-600" />
                <h2 className="text-xl font-bold text-slate-800">Select Task to Reference</h2>
              </div>
              <button
                onClick={() => setShowTaskModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Task List */}
            <div className="max-h-96 overflow-y-auto">
              {tasks.length > 0 ? (
                <div className="p-4 space-y-2">
                  {tasks.map(task => (
                    <button
                      key={task.id}
                      onClick={() => {
                        handleTaskSelect(task);
                        setShowTaskModal(false);
                      }}
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
                          <h3 className="font-medium text-slate-800 group-hover:text-blue-800 truncate">
                            {task.name}
                          </h3>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500">
                  <Hash size={48} className="mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-medium mb-2">No tasks found</h3>
                  <p className="text-sm">No tasks available to reference</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const EnhancedRetrospectiveTab: React.FC<EnhancedRetrospectiveTabProps> = ({ board, tasks }) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const { sprintNo } = useParams();
  
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [retroItems, setRetroItems] = useState<EnhancedRetroItem[]>([]);
  const [newItem, setNewItem] = useState<NewItemForm>({ 
    type: 'went-well', 
    content: '', 
    assignedTo: '', 
    dueDate: '',
    priority: 'Medium'
  });
  const [showAddForm, setShowAddForm] = useState<{[key: string]: boolean}>({ 
    'went-well': false, 
    'improve': false, 
    'action': false 
  });
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'error'>('saved');
  const [commentTexts, setCommentTexts] = useState<{[key: number]: string}>({});
  const [showComments, setShowComments] = useState<{[key: number]: boolean}>({});

  // Task modal state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);

  // Prepare users and tasks for mentions
  const mentionUsers = useMemo(() => {
    return board.collaborators.map(collab => ({
      id: collab.email,
      name: collab.name,
      email: collab.email
    }));
  }, [board.collaborators]);

  const mentionTasks = useMemo(() => {
    return tasks.map(task => ({
      id: task.id,
      name: task.title
    }));
  }, [tasks]);

  // Fetch sprint data
  useEffect(() => {
    const fetchSprintData = async () => {
      if (!user || !board.id || !sprintNo) return;
      
      try {
        const sprints = await sprintService.fetchBoardSprints(user.uid, board.id);
        const targetSprint = sprints.find(s => s.sprintNumber === parseInt(sprintNo));
        if (targetSprint) {
          setSprint(targetSprint);
          
          const sprintRetroKey = `sprintRetro_${targetSprint.id}`;
          const sprintRetroData = board[sprintRetroKey] as SprintRetroData | undefined;
          
          if (sprintRetroData) {
            setRetroItems(sprintRetroData.items || []);
          }
        }
      } catch (error) {
        console.error('Error fetching sprint data:', error);
      }
    };

    fetchSprintData();
  }, [user, board.id, sprintNo, board]);

  // Sprint summary
  const sprintSummary = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'Done' || t.status === 'done').length;
    const getTaskPoints = (task: Task): number => {
      return task.points || 0;
    };
    
    const totalPoints = tasks.reduce((sum, t) => sum + getTaskPoints(t), 0);
    const completedPoints = tasks
      .filter(t => t.status === 'Done' || t.status === 'done')
      .reduce((sum, t) => sum + getTaskPoints(t), 0);
    
    return {
      totalTasks,
      completedTasks,
      totalPoints,
      completedPoints,
      completionRate: totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : '0',
      velocity: completedPoints,
      teamSize: (sprint?.status === 'active' || sprint?.status === 'planning') ? board.collaborators.length : (sprint?.teamSize || board.collaborators.length)
    };
  }, [tasks, board.collaborators, sprint]);

  // Auto-save retro data
  const saveRetroData = async (): Promise<void> => {
    if (!user || !board.id || !sprint) return;
    
    setSaveStatus('saving');
    try {
      const sprintRetroKey = `sprintRetro_${sprint.id}`;
      const retroData: SprintRetroData = {
        sprintId: sprint.id,
        sprintNumber: sprint.sprintNumber,
        items: retroItems,
        lastUpdated: new Date().toISOString(),
        sprintName: sprint.name,
        facilitator: user.displayName || user.email || 'Anonymous'
      };

      const cleanObject = (obj: any): any => {
        if (obj === null || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(cleanObject);
        
        const cleaned: any = {};
        Object.keys(obj).forEach(key => {
          const value = obj[key];
          if (value !== undefined) {
            cleaned[key] = cleanObject(value);
          }
        });
        return cleaned;
      };

      const updates: any = { [sprintRetroKey]: retroData };
      const cleanedUpdates = cleanObject(updates);

      await dispatch(updateBoard({
        userId: user.uid,
        boardId: board.id,
        updates: cleanedUpdates
      })).unwrap();
      
      setSaveStatus('saved');
    } catch (error) {
      console.error('Error saving retro data:', error);
      setSaveStatus('error');
    }
  };

  useEffect(() => {
    if (retroItems.length > 0 && sprint) {
      const timeoutId = setTimeout(saveRetroData, 1000);
      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [retroItems, sprint]);

  const handleAddItem = (type: 'went-well' | 'improve' | 'action'): void => {
    if (!newItem.content.trim() || !user) return;

    const item: EnhancedRetroItem = {
      id: Date.now(),
      type,
      content: newItem.content.trim(),
      author: user.displayName || user.email || 'Current User',
      authorEmail: user.email || '',
      createdAt: new Date().toISOString(),
      votes: [],
      assignedTo: type === 'action' ? newItem.assignedTo : undefined,
      dueDate: type === 'action' ? newItem.dueDate : undefined,
      priority: type === 'action' ? newItem.priority : 'Medium',
      tags: [],
      comments: []
    };

    setRetroItems([...retroItems, item]);
    setNewItem({ type: 'went-well', content: '', assignedTo: '', dueDate: '', priority: 'Medium' });
    setShowAddForm({ ...showAddForm, [type]: false });
  };

  const handleVote = (itemId: number): void => {
    if (!user?.email) return;

    setRetroItems(retroItems.map(item => {
      if (item.id === itemId) {
        if (item.authorEmail === user.email) {
          return item;
        }

        const hasVoted = item.votes.includes(user.email);
        const newVotes = hasVoted 
          ? item.votes.filter(email => email !== user.email)
          : [...item.votes, user.email];
        
        return { ...item, votes: newVotes };
      }
      return item;
    }));
  };

  const handleDeleteItem = (itemId: number): void => {
    setRetroItems(retroItems.filter(item => item.id !== itemId));
  };

  const handleAddComment = (itemId: number): void => {
    const commentText = commentTexts[itemId]?.trim();
    if (!commentText || !user) return;

    const newComment: RetroComment = {
      id: `${Date.now()}_${Math.random()}`,
      text: commentText,
      author: user.displayName || user.email || 'Current User',
      authorEmail: user.email || '',
      createdAt: new Date().toISOString(),
      likes: []
    };

    setRetroItems(retroItems.map(item => 
      item.id === itemId 
        ? { ...item, comments: [...item.comments, newComment] }
        : item
    ));

    setCommentTexts({ ...commentTexts, [itemId]: '' });
  };

  const handleLikeComment = (itemId: number, commentId: string): void => {
    if (!user?.email) return;

    setRetroItems(retroItems.map(item => {
      if (item.id === itemId) {
        const updatedComments = item.comments.map(comment => {
          if (comment.id === commentId) {
            if (comment.authorEmail === user.email) {
              return comment;
            }

            const hasLiked = comment.likes.includes(user.email);
            const newLikes = hasLiked
              ? comment.likes.filter(email => email !== user.email)
              : [...comment.likes, user.email];
            
            return { ...comment, likes: newLikes };
          }
          return comment;
        });
        return { ...item, comments: updatedComments };
      }
      return item;
    }));
  };

  // Enhanced render mentions in content with clickable tasks
  const renderContentWithMentions = (content: string) => {
    const parts = content.split(/(@\w+|#\w+)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        const username = part.slice(1);
        const user = mentionUsers.find(u => u.name === username);
        return (
          <span key={index} className="bg-blue-100 text-blue-700 px-1 rounded font-medium" title={user?.email}>
            {part}
          </span>
        );
      } else if (part.startsWith('#')) {
        const taskRef = part.slice(1);
        const task = tasks.find(t => t.id.slice(-6) === taskRef);
        return (
          <button
            key={index}
            onClick={() => {
              if (task) {
                setSelectedTask(task);
                setShowTaskModal(true);
              }
            }}
            className="bg-green-100 text-green-700 px-1 rounded font-medium hover:bg-green-200 transition-colors cursor-pointer"
            title={task?.title || `Task ${taskRef}`}
          >
            {part}
          </button>
        );
      }
      return part;
    });
  };

  const getItemsByType = (type: 'went-well' | 'improve' | 'action'): EnhancedRetroItem[] => 
    retroItems.filter(item => item.type === type).sort((a, b) => b.votes.length - a.votes.length);

  const columnConfig = {
    'went-well': {
      title: "What Went Well",
      description: "Celebrate successes and positive outcomes",
      color: "green",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      textColor: "text-green-800",
      buttonColor: "bg-green-600 hover:bg-green-700",
      icon: ThumbsUp
    },
    'improve': {
      title: "What Didn't Go Well",
      description: "Identify challenges and areas for improvement",
      color: "red", 
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      textColor: "text-red-800",
      buttonColor: "bg-red-600 hover:bg-red-700",
      icon: ThumbsDown
    },
    'action': {
      title: "Actionable Items",
      description: "Concrete actions to improve next sprint",
      color: "blue",
      bgColor: "bg-blue-50", 
      borderColor: "border-blue-200",
      textColor: "text-blue-800",
      buttonColor: "bg-blue-600 hover:bg-blue-700",
      icon: Target
    }
  } as const;

  if (!sprint) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Sprint Not Found</h2>
          <p className="text-slate-600">Sprint {sprintNo} doesn't exist for this board.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sprint Summary Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{sprint.name} Retrospective</h2>
            <p className="text-slate-600 mt-1">Reflect on what happened and plan improvements for the next sprint</p>
            <div className="mt-2 text-sm text-slate-500">
              Facilitator: {user?.displayName || 'You'} •
              Last updated: {retroItems.length > 0 ? 'Recently' : 'Never'}
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${
              saveStatus === 'saving' ? 'bg-yellow-500 animate-pulse' :
              saveStatus === 'saved' ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className="text-slate-600">
              {saveStatus === 'saving' ? 'Saving...' :
               saveStatus === 'saved' ? 'Saved' : 'Error saving'}
            </span>
          </div>
        </div>

        {/* Sprint Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center bg-slate-50 rounded-lg p-3">
            <div className="text-xl font-bold text-slate-800">{sprintSummary.totalTasks}</div>
            <div className="text-sm text-slate-600">Total Tasks</div>
          </div>
          <div className="text-center bg-green-50 rounded-lg p-3">
            <div className="text-xl font-bold text-green-600">{sprintSummary.completedTasks}</div>
            <div className="text-sm text-slate-600">Completed</div>
          </div>
          <div className="text-center bg-blue-50 rounded-lg p-3">
            <div className="text-xl font-bold text-blue-600">{sprintSummary.velocity}</div>
            <div className="text-sm text-slate-600">Story Points</div>
          </div>
          <div className="text-center bg-yellow-50 rounded-lg p-3">
            <div className="text-xl font-bold text-purple-600">{sprintSummary.completionRate}%</div>
            <div className="text-sm text-slate-600">Completion</div>
          </div>
          <div className="text-center bg-orange-50 rounded-lg p-3">
            <div className="text-xl font-bold text-orange-600">{sprintSummary.teamSize}</div>
            <div className="text-sm text-slate-600">Team Size</div>
          </div>
        </div>
      </div>

      {/* Enhanced Mention Helper */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-4">
        <div className="flex items-start gap-4">
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <AtSign size={16} className="text-blue-600" />
              <span className="text-slate-700">Type <code className="bg-white px-1 rounded">@username</code> to mention team members</span>
            </div>
            <div className="flex items-center gap-2">
              <Hash size={16} className="text-green-600" />
              <span className="text-slate-700">Type <code className="bg-white px-1 rounded">#task</code> to reference tasks (clickable)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Retrospective Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {(Object.entries(columnConfig) as Array<[keyof typeof columnConfig, typeof columnConfig[keyof typeof columnConfig]]>).map(([type, config]) => {
          const IconComponent = config.icon;
          const items = getItemsByType(type);
          
          return (
            <div key={type} className={`${config.bgColor} rounded-xl ${config.borderColor} border-2 p-4 min-h-[500px]`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <IconComponent size={20} className={config.textColor} />
                    <h3 className={`font-semibold ${config.textColor}`}>{config.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full bg-white ${config.textColor} font-medium`}>
                      {items.length}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{config.description}</p>
                </div>
                <button
                  onClick={() => setShowAddForm({ ...showAddForm, [type]: !showAddForm[type] })}
                  className={`p-2 rounded-lg ${config.buttonColor} text-white transition-colors`}
                >
                  {showAddForm[type] ? <X size={16} /> : <Plus size={16} />}
                </button>
              </div>

              {/* Add Item Form */}
              {showAddForm[type] && (
                <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4">
                  <EnhancedRetroInput
                    value={newItem.content}
                    onChange={(value) => setNewItem({ ...newItem, content: value })}
                    onSubmit={() => handleAddItem(type)}
                    placeholder={`What ${type === 'went-well' ? 'went well' : type === 'improve' ? 'could be improved' : 'action should we take'}? Use @username or #task to mention.`}
                    users={mentionUsers}
                    tasks={mentionTasks}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
                    rows={3}
                  />
                  
                  {type === 'action' && (
                    <div className="mt-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={newItem.assignedTo}
                          onChange={(e) => setNewItem({ ...newItem, assignedTo: e.target.value })}
                          className="w-full p-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                        >
                          <option value="">Assign to...</option>
                          {board.collaborators.map((collab: Collaborator) => (
                            <option key={collab.email} value={collab.name}>{collab.name}</option>
                          ))}
                        </select>
                        <select
                          value={newItem.priority}
                          onChange={(e) => setNewItem({ ...newItem, priority: e.target.value as 'Low' | 'Medium' | 'High' })}
                          className="w-full p-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                        >
                          <option value="Low">Low Priority</option>
                          <option value="Medium">Medium Priority</option>
                          <option value="High">High Priority</option>
                        </select>
                      </div>
                      <input
                        type="date"
                        value={newItem.dueDate}
                        onChange={(e) => setNewItem({ ...newItem, dueDate: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  )}
                  
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleAddItem(type)}
                      className={`flex-1 ${config.buttonColor} text-white py-2 px-4 rounded-lg font-medium transition-colors text-sm`}
                    >
                      Add Item
                    </button>
                    <button
                      onClick={() => setShowAddForm({ ...showAddForm, [type]: false })}
                      className="flex-1 bg-slate-300 text-slate-700 py-2 px-4 rounded-lg font-medium hover:bg-slate-400 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-3">
                {items.map(item => (
                  <div key={item.id} className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                    <div className="text-slate-800 mb-3 leading-relaxed">
                      {renderContentWithMentions(item.content)}
                    </div>
                    
                    {item.type === 'action' && (
                      <div className="mb-3 space-y-1">
                        {item.assignedTo && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Users size={14} />
                            <span>Assigned to: <strong>{item.assignedTo}</strong></span>
                          </div>
                        )}
                        {item.dueDate && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Calendar size={14} />
                            <span>Due: <strong>{new Date(item.dueDate).toLocaleDateString()}</strong></span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.priority === 'High' ? 'bg-red-100 text-red-700' :
                            item.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {item.priority} Priority
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleVote(item.id)}
                          disabled={item.authorEmail === user?.email}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
                            item.authorEmail === user?.email 
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                              : item.votes.includes(user?.email || '') 
                                ? 'bg-blue-500 text-white' 
                                : 'bg-slate-100 hover:bg-slate-200'
                          }`}
                        >
                          <span className="text-sm">👍</span>
                          <span className="text-sm font-medium">{item.votes.length}</span>
                        </button>
                        <button
                          onClick={() => setShowComments({ ...showComments, [item.id]: !showComments[item.id] })}
                          className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          <MessageCircle size={14} />
                          <span className="text-sm font-medium">{item.comments.length}</span>
                        </button>
                        <span className="text-xs text-slate-500">
                          by {item.author} • {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {item.authorEmail === user?.email && (
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {/* Comments Section */}
                    {showComments[item.id] && (
                      <div className="border-t border-slate-200 pt-3 mt-3">
                        {/* Existing Comments */}
                        {item.comments.length > 0 && (
                          <div className="space-y-2 mb-3">
                            {item.comments.map(comment => (
                              <div key={comment.id} className="bg-slate-50 rounded-lg p-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="text-sm text-slate-700 mb-1">
                                      {renderContentWithMentions(comment.text)}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                      <span>{comment.author}</span>
                                      <span>•</span>
                                      <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleLikeComment(item.id, comment.id)}
                                    disabled={comment.authorEmail === user?.email}
                                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                                      comment.authorEmail === user?.email 
                                        ? 'text-slate-400 cursor-not-allowed' 
                                        : comment.likes.includes(user?.email || '') 
                                          ? 'text-red-600 bg-red-100' 
                                          : 'text-slate-500 hover:text-red-600 hover:bg-red-100'
                                    }`}
                                  >
                                    ❤️ {comment.likes.length}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add Comment with Enhanced Input */}
                        <div className="flex gap-2">
                          <EnhancedCommentInput
                            value={commentTexts[item.id] || ''}
                            onChange={(value) => setCommentTexts({ ...commentTexts, [item.id]: value })}
                            onSubmit={() => handleAddComment(item.id)}
                            placeholder="Add a comment... Use @ to mention users or # for tasks"
                            users={mentionUsers}
                            tasks={mentionTasks}
                          />
                          <button
                            onClick={() => handleAddComment(item.id)}
                            disabled={!commentTexts[item.id]?.trim()}
                            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                          >
                            <Send size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {items.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <IconComponent size={32} className="mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-medium">No items yet</p>
                    <p className="text-xs text-slate-400">Click "Add" to contribute your thoughts</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Items Summary */}
      {getItemsByType('action').length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Action Items Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-red-50 rounded-lg border border-red-200 p-4">
              <h4 className="font-medium text-red-800 mb-2">High Priority</h4>
              <div className="text-2xl font-bold text-red-900">
                {getItemsByType('action').filter(item => item.priority === 'High').length}
              </div>
              <div className="text-sm text-red-600">Urgent actions needed</div>
            </div>
            <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
              <h4 className="font-medium text-yellow-800 mb-2">Medium Priority</h4>
              <div className="text-2xl font-bold text-yellow-900">
                {getItemsByType('action').filter(item => item.priority === 'Medium').length}
              </div>
              <div className="text-sm text-yellow-600">Important improvements</div>
            </div>
            <div className="bg-green-50 rounded-lg border border-green-200 p-4">
              <h4 className="font-medium text-green-800 mb-2">Low Priority</h4>
              <div className="text-2xl font-bold text-green-900">
                {getItemsByType('action').filter(item => item.priority === 'Low').length}
              </div>
              <div className="text-sm text-green-600">Nice to have</div>
            </div>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {selectedTask && showTaskModal && (
        <TaskModal
          task={selectedTask}
          onClose={() => {
            setSelectedTask(null);
            setShowTaskModal(false);
          }}
        />
      )}
    </div>
  );
};

export default EnhancedRetrospectiveTab;