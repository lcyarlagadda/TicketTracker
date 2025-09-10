// components/Analytics/EnhancedReflection.tsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  BookOpen,
  Users,
  Lightbulb,
  Target,
  Plus,
  X,
  Trash2,
  User,
  Crown,
  Star,
  MessageCircle,
  Heart,
  Send,
  Hash,
  AtSign,
  Shield,
  Edit3,
} from "lucide-react";
import { useAppSelector } from "../../../hooks/redux";
import { notificationService } from "../../../services/notificationService";
import {
  Task,
  Board,
  Sprint,
  SprintReflectionData,
  PrivateReflectionData,
  NewReflectionForm,
  TabKey,
  TabConfig,
  EnhancedReflectionItem,
  ReflectionComment,
  MentionTask,
  MentionUser,
} from "../../../store/types/types";
import { useParams } from "react-router-dom";
import { sprintService } from "../../../services/sprintService";
import { privateReflectionService } from "../../../services/privateReflectionService";
import { SmartCommentInput } from "../../Atoms/TaskSelectionModal";
import TaskModal from "../TaskModal";

interface EnhancedReflectionTabProps {
  board: Board;
  tasks: Task[];
}

// Enhanced SmartReflectionInput component with user and task mentions
interface EnhancedSmartReflectionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  tasks: MentionTask[];
  users: MentionUser[];
  className?: string;
  rows?: number;
  isTextarea?: boolean;
}

const EnhancedSmartReflectionInput: React.FC<EnhancedSmartReflectionInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder,
  tasks,
  users,
  className = "",
  rows = 1,
  isTextarea = false
}) => {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
    } else if (e.key === 'Enter' && !e.shiftKey && !isTextarea && !mentionState.isOpen) {
      e.preventDefault();
      onSubmit();
    } else if (e.key === 'Escape') {
      setMentionState(prev => ({ ...prev, isOpen: false }));
    }
  };

  const getTextWidth = (text: string, element: HTMLInputElement | HTMLTextAreaElement): number => {
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

  const InputComponent = isTextarea ? 'textarea' : 'input';

  return (
    <>
      <InputComponent
        ref={inputRef as any}
        type={isTextarea ? undefined : "text"}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyPress}
        placeholder={placeholder}
        className={className}
        rows={isTextarea ? rows : undefined}
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

      {/* Task Selection Modal - Convert to simple task reference modal */}
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

const EnhancedReflectionTab: React.FC<EnhancedReflectionTabProps> = ({
  board,
  tasks,
}) => {
  const { user } = useAppSelector((state) => state.auth);
  const { sprintNo } = useParams();

  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [reflectionData, setReflectionData] = useState<PrivateReflectionData>({
    sprintId: "",
    sprintNumber: 0,
    userId: "",
    userEmail: "",
    userName: "",
    personalGrowth: [],
    teamInsights: [],
    lessonsLearned: [],
    futureGoals: [],
    managerFeedback: [],
    lastUpdated: "",
    isPrivate: true,
  });
  const [userRole, setUserRole] = useState<'admin' | 'manager' | 'user'>('user');
  const [selectedTeamMember, setSelectedTeamMember] = useState<string>('');
  const [teamReflections, setTeamReflections] = useState<{[userId: string]: PrivateReflectionData}>({});
  const [viewMode, setViewMode] = useState<'self' | 'manager'>('self'); // New state for view mode

  const [activeTab, setActiveTab] = useState<TabKey>("personal");
  const [newReflection, setNewReflection] = useState<NewReflectionForm>({
    content: "",
    category: "",
    priority: "Medium",
    reviewType: "self",
    rating: 3,
  });
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  // Removed reviewFilter as it's replaced by viewMode
  const [commentTexts, setCommentTexts] = useState<{ [key: number]: string }>(
    {}
  );
  const [showComments, setShowComments] = useState<{ [key: number]: boolean }>(
    {}
  );
  const [editingReflection, setEditingReflection] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{
    content: string;
    priority: "Low" | "Medium" | "High";
    rating: number;
  }>({
    content: "",
    priority: "Medium",
    rating: 3,
  });

  // Task modal state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);

  // Prepare tasks and users for mentions
  const mentionTasks = useMemo(() => {
    return tasks.map((task) => ({
      id: task.id,
      name: task.title,
    }));
  }, [tasks]);

  const mentionUsers = useMemo(() => {
    return board.collaborators.map(collab => ({
      id: collab.email,
      name: collab.name,
      email: collab.email
    }));
  }, [board.collaborators]);

  // Helper function to extract mentions from text
  const extractMentions = (text: string): MentionUser[] => {
    const mentionMatches = text.match(/@(\w+)/g);
    if (!mentionMatches) return [];
    
    return mentionMatches
      .map(match => match.slice(1)) // Remove @ symbol
      .map(username => mentionUsers.find(user => user.name === username))
      .filter((user): user is MentionUser => user !== undefined);
  };

  // Fetch team reflections for managers
  const fetchTeamReflections = async (sprintId: string) => {
    if (!user || !board.id || (userRole !== 'manager' && userRole !== 'admin')) return;

    try {
      const teamReflectionsData: {[userId: string]: PrivateReflectionData} = {};
      
      // Fetch reflections for all team members
      for (const collaborator of board.collaborators) {
        if (collaborator.email !== user.email) {
          try {
            const reflection = await privateReflectionService.getPrivateReflection(
              collaborator.email, // Using email as userId for now
              board.id,
              sprintId,
              user.uid // Pass the requesting user (manager) UID
            );
            if (reflection) {
              teamReflectionsData[collaborator.email] = reflection;
            }
          } catch (error) {
            // No reflection found for this collaborator
          }
        }
      }
      
      setTeamReflections(teamReflectionsData);
    } catch (error) {
      // Error fetching team reflections
    }
  };

  // Fetch sprint data and user role
  useEffect(() => {
    const fetchSprintData = async () => {
      if (!user || !board.id || !sprintNo) return;

      try {
        // Get user's role in the board
        const userCollaborator = board.collaborators.find(c => c.email === user.email);
        if (userCollaborator) {
          setUserRole(userCollaborator.role);
        }

        const sprints = await sprintService.fetchBoardSprints(
          user.uid,
          board.id
        );
        const targetSprint = sprints.find(
          (s) => s.sprintNumber === parseInt(sprintNo)
        );
        
        if (targetSprint) {
          setSprint(targetSprint);

          // Fetch private reflection data
          const privateReflection = await privateReflectionService.getPrivateReflection(
            user.uid,
            board.id,
            targetSprint.id
          );

          if (privateReflection) {
            setReflectionData(privateReflection);
          } else {
            // Initialize new private reflection
            setReflectionData({
              sprintId: targetSprint.id,
              sprintNumber: targetSprint.sprintNumber,
              userId: user.uid,
              userEmail: user.email || "",
              userName: user.displayName || user.email || "Current User",
              personalGrowth: [],
              teamInsights: [],
              lessonsLearned: [],
              futureGoals: [],
              managerFeedback: [],
              lastUpdated: "",
              isPrivate: true,
            });
          }

          // Fetch team reflections if user is manager/admin
          if (userRole === 'manager' || userRole === 'admin') {
            await fetchTeamReflections(targetSprint.id);
          }
        }
      } catch (error) {
        // Error fetching sprint data
      }
    };

    fetchSprintData();
  }, [user, board.id, sprintNo, board, userRole]);

  // Auto-save reflection data
  const saveReflectionData = async (): Promise<void> => {
    if (!user || !board.id || !sprint) return;

    try {
      await privateReflectionService.savePrivateReflection(
        user.uid,
        user.email || "",
        user.displayName || user.email || "Current User",
        board.id,
        sprint.id,
        sprint.sprintNumber,
        reflectionData
      );
    } catch (error) {
      // Error saving reflection data
    }
  };

  useEffect(() => {
    if (
      Object.values(reflectionData).some(
        (arr) => Array.isArray(arr) && arr.length > 0
      ) &&
      sprint
    ) {
      const timeoutId = setTimeout(saveReflectionData, 1000);
      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [reflectionData, sprint]);

  const handleAddReflection = (): void => {
    if (!newReflection.content.trim() || !user) return;
    
    // Prevent non-managers from adding manager reviews
    if (viewMode === 'manager' && userRole !== 'manager') {
      return;
    }
    
    // Prevent managers from adding self reviews
    if (userRole === 'manager' && viewMode === 'self' && !selectedTeamMember) {
      return;
    }

    const reflection: EnhancedReflectionItem = {
      id: Date.now(),
      content: newReflection.content.trim(),
      category: newReflection.category,
      priority: newReflection.priority,
      author: user.displayName || user.email || "Current User",
      authorEmail: user.email || "",
      createdAt: new Date().toISOString(),
      tags: [],
      reviewType: selectedTeamMember ? "manager" : (userRole === 'manager' ? "manager" : (viewMode === 'manager' ? "manager" : newReflection.reviewType)),
      rating: newReflection.rating,
      comments: [],
      likes: [],
    };

    const category =
      activeTab === "personal"
        ? "personalGrowth"
        : activeTab === "team"
        ? "teamInsights"
        : activeTab === "lessons"
        ? "lessonsLearned"
        : activeTab === "goals"
        ? "futureGoals"
        : "managerFeedback";

    // If viewing team member reflections, save to their data
    if (selectedTeamMember && (userRole === 'manager' || userRole === 'admin')) {
      const teamMemberData = teamReflections[selectedTeamMember];
      if (teamMemberData) {
        const updatedTeamMemberData = {
          ...teamMemberData,
          [category]: [...(teamMemberData[category] || []), reflection],
        };
        setTeamReflections({
          ...teamReflections,
          [selectedTeamMember]: updatedTeamMemberData
        });
        
        // Save to the team member's reflection data
        privateReflectionService.savePrivateReflection(
          selectedTeamMember,
          teamMemberData.userEmail,
          teamMemberData.userName,
          board.id,
          sprint?.id || "",
          sprint?.sprintNumber || 0,
          updatedTeamMemberData
        );
      }
    } else {
      // Save to current user's reflection data
      setReflectionData({
        ...reflectionData,
        [category]: [...(reflectionData[category] || []), reflection],
      });
    }

    setNewReflection({
      content: "",
      category: "",
      priority: "Medium",
      reviewType: "self",
      rating: 3,
    });
    setShowAddForm(false);

    // Send notifications for mentions in background
    const mentionedUsers = extractMentions(newReflection.content.trim());
    if (mentionedUsers.length > 0) {
      const boardUrl = `${window.location.origin}/board/${board.id}`;
      mentionedUsers.forEach((mentionedUser) => {
        notificationService.notifyMentioned({
          mentionedEmail: mentionedUser.email,
          mentionedName: mentionedUser.name,
          mentionedBy: user.displayName || user.email || 'Unknown User',
          boardName: board.name,
          context: 'reflection',
          message: `${user.displayName || user.email} mentioned you in a reflection: "${newReflection.content.trim()}"`,
          boardUrl,
        });
      });
      // Reflection mention notifications queued
    }
  };

  const handleDeleteReflection = (
    category: keyof Omit<
      SprintReflectionData,
      "sprintId" | "sprintNumber" | "lastUpdated"
    >,
    id: number
  ): void => {
    setReflectionData({
      ...reflectionData,
      [category]: (reflectionData[category] as EnhancedReflectionItem[]).filter(
        (item) => item.id !== id
      ),
    });
  };

  const handleLikeReflection = (
    category: keyof Omit<
      SprintReflectionData,
      "sprintId" | "sprintNumber" | "lastUpdated"
    >,
    id: number
  ): void => {
    if (!user?.email) return;

    setReflectionData({
      ...reflectionData,
      [category]: (reflectionData[category] as EnhancedReflectionItem[]).map(
        (item) => {
          if (item.id === id) {
            if (item.authorEmail === user.email) {
              return item;
            }

            const hasLiked = item.likes.includes(user.email);
            const newLikes = hasLiked
              ? item.likes.filter((email) => email !== user.email)
              : [...item.likes, user.email];

            return { ...item, likes: newLikes };
          }
          return item;
        }
      ),
    });
  };

  const handleAddComment = (
    category: keyof Omit<
      SprintReflectionData,
      "sprintId" | "sprintNumber" | "lastUpdated"
    >,
    itemId: number
  ): void => {
    const commentText = commentTexts[itemId]?.trim();
    if (!commentText || !user) return;

    const newComment: ReflectionComment = {
      id: `${Date.now()}_${Math.random()}`,
      text: commentText,
      author: user.displayName || user.email || "Current User",
      authorEmail: user.email || "",
      createdAt: new Date().toISOString(),
      likes: [],
    };

    setReflectionData({
      ...reflectionData,
      [category]: (reflectionData[category] as EnhancedReflectionItem[]).map(
        (item) =>
          item.id === itemId
            ? { ...item, comments: [...item.comments, newComment] }
            : item
      ),
    });

    setCommentTexts({ ...commentTexts, [itemId]: "" });

    // Send notifications for mentions in comments in background
    const mentionedUsers = extractMentions(commentText);
    if (mentionedUsers.length > 0) {
      const boardUrl = `${window.location.origin}/board/${board.id}`;
      mentionedUsers.forEach((mentionedUser) => {
        notificationService.notifyMentioned({
          mentionedEmail: mentionedUser.email,
          mentionedName: mentionedUser.name,
          mentionedBy: user.displayName || user.email || 'Unknown User',
          boardName: board.name,
          context: 'reflection',
          message: `${user.displayName || user.email} mentioned you in a reflection comment: "${commentText}"`,
          boardUrl,
        });
      });
      // Reflection comment mention notifications queued
    }
  };

  const handleLikeComment = (
    category: keyof Omit<
      SprintReflectionData,
      "sprintId" | "sprintNumber" | "lastUpdated"
    >,
    itemId: number,
    commentId: string
  ): void => {
    if (!user?.email) return;

    setReflectionData({
      ...reflectionData,
      [category]: (reflectionData[category] as EnhancedReflectionItem[]).map(
        (item) => {
          if (item.id === itemId) {
            const updatedComments = item.comments.map((comment) => {
              if (comment.id === commentId) {
                if (comment.authorEmail === user.email) {
                  return comment;
                }

                const hasLiked = comment.likes.includes(user.email);
                const newLikes = hasLiked
                  ? comment.likes.filter((email) => email !== user.email)
                  : [...comment.likes, user.email];

                return { ...comment, likes: newLikes };
              }
              return comment;
            });
            return { ...item, comments: updatedComments };
          }
          return item;
        }
      ),
    });
  };

  const handleEditReflection = (reflection: EnhancedReflectionItem): void => {
    setEditingReflection(reflection.id);
    setEditForm({
      content: reflection.content,
      priority: reflection.priority,
      rating: reflection.rating || 3,
    });
  };

  const handleSaveEdit = (): void => {
    if (!editingReflection || !editForm.content.trim()) return;

    const category = getCurrentCategoryKey();
    const updatedReflections = (reflectionData[category] as EnhancedReflectionItem[]).map(
      (item) =>
        item.id === editingReflection
          ? {
              ...item,
              content: editForm.content.trim(),
              priority: editForm.priority,
              rating: editForm.rating,
              lastUpdated: new Date().toISOString(),
            }
          : item
    );

    setReflectionData({
      ...reflectionData,
      [category]: updatedReflections,
    });

    setEditingReflection(null);
    setEditForm({
      content: "",
      priority: "Medium",
      rating: 3,
    });
  };

  const handleCancelEdit = (): void => {
    setEditingReflection(null);
    setEditForm({
      content: "",
      priority: "Medium",
      rating: 3,
    });
  };

  // Enhanced render content with clickable task mentions
  const renderContentWithMentions = (content: string) => {
    const parts = content.split(/(@\w+|#\w+)/g);

    return parts.map((part, index) => {
      if (part.startsWith("@")) {
        const username = part.slice(1);
        const user = mentionUsers.find(u => u.name === username);
        return (
          <span
            key={index}
            className="bg-blue-100 text-blue-700 px-1 rounded font-medium"
            title={user?.email}
          >
            {part}
          </span>
        );
      } else if (part.startsWith("#")) {
        const taskRef = part.slice(1);
        const task = tasks.find((t) => t.id.slice(-6) === taskRef);
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

  const tabs: TabConfig[] = [
    {
      key: "personal",
      label: "Personal Growth",
      icon: User,
      color: "blue",
      description:
        "Your individual development, skills gained, and personal achievements",
    },
    {
      key: "team",
      label: "Team Insights",
      icon: Users,
      color: "green",
      description:
        "Observations about team dynamics, collaboration, and collective achievements",
    },
    {
      key: "lessons",
      label: "Lessons Learned",
      icon: Lightbulb,
      color: "yellow",
      description:
        "Key takeaways, insights, and knowledge gained from experiences",
    },
    {
      key: "goals",
      label: "Future Goals",
      icon: Target,
      color: "orange",
      description:
        "Objectives, aspirations, and plans for upcoming sprints and beyond",
    }
  ];

  const getCurrentCategoryData = (): EnhancedReflectionItem[] => {
    // For managers, show selected team member's data or current user's data
    const currentData = (userRole === 'manager' || userRole === 'admin') && selectedTeamMember 
      ? teamReflections[selectedTeamMember] 
      : reflectionData;

    const data = (() => {
      switch (activeTab) {
        case "personal":
          return currentData?.personalGrowth || [];
        case "team":
          return currentData?.teamInsights || [];
        case "lessons":
          return currentData?.lessonsLearned || [];
        case "goals":
          return currentData?.futureGoals || [];
        case "feedback":
          return currentData?.managerFeedback || [];
        default:
          return [];
      }
    })();

    // For managers viewing team members, show only self-reviews (so they can comment/feedback)
    // For managers viewing their own data, show only manager reviews (they don't have self-reviews)
    // For regular users, filter by view mode
    if (userRole === 'manager' && selectedTeamMember) {
      return data.filter((item) => item.reviewType === 'self'); // Only self-reviews for team members
    } else if (userRole === 'manager' && !selectedTeamMember) {
      return data.filter((item) => item.reviewType === 'manager'); // Only manager reviews for self
    } else {
      return data.filter((item) => item.reviewType === viewMode);
    }
  };

  const getCurrentCategoryKey = (): keyof Omit<
    SprintReflectionData,
    "sprintId" | "sprintNumber" | "lastUpdated"
  > => {
    switch (activeTab) {
      case "personal":
        return "personalGrowth";
      case "team":
        return "teamInsights";
      case "lessons":
        return "lessonsLearned";
      case "goals":
        return "futureGoals";
      default:
        return "personalGrowth";
    }
  };

  const getColorClasses = (color: string, isActive: boolean): string => {
    if (isActive) {
      switch (color) {
        case "blue":
          return "bg-blue-600 text-white shadow-lg";
        case "green":
          return "bg-green-600 text-white shadow-lg";
        case "yellow":
          return "bg-yellow-600 text-white shadow-lg";
        case "orange":
          return "bg-orange-600 text-white shadow-lg";
        default:
          return "bg-blue-600 text-white shadow-lg";
      }
    }
    return "text-slate-600 hover:bg-slate-100";
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={16}
        className={
          i < rating ? "text-yellow-400 fill-current" : "text-gray-300"
        }
      />
    ));
  };

  // Calculate summary statistics for current data being viewed
  const getCurrentData = () => {
    return (userRole === 'manager' || userRole === 'admin') && selectedTeamMember 
      ? teamReflections[selectedTeamMember] 
      : reflectionData;
  };

  const currentData = getCurrentData();
  
  const summaryStats = {
    totalReflections: Object.values(currentData || {}).reduce(
      (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
      0
    ),
    selfReviews: Object.values(currentData || {}).reduce(
      (sum, arr) =>
        sum +
        (Array.isArray(arr)
          ? arr.filter((item) => item.reviewType === "self").length
          : 0),
      0
    ),
    managerReviews: Object.values(currentData || {}).reduce(
      (sum, arr) =>
        sum +
        (Array.isArray(arr)
          ? arr.filter((item) => item.reviewType === "manager").length
          : 0),
      0
    ),
    avgRating: (() => {
      const allItems: EnhancedReflectionItem[] = [
        ...(currentData?.personalGrowth || []),
        ...(currentData?.teamInsights || []),
        ...(currentData?.lessonsLearned || []),
        ...(currentData?.futureGoals || []),
      ];
      // Filter items based on view mode
      const filteredItems = viewMode === 'self' 
        ? allItems.filter((item) => item.reviewType === "self")
        : allItems.filter((item) => item.reviewType === "manager");
      const ratedItems = filteredItems.filter((item) => item.rating);
      return ratedItems.length > 0
        ? (
            ratedItems.reduce((sum, item) => sum + (item.rating || 0), 0) /
            ratedItems.length
          ).toFixed(1)
        : "0";
    })(),
  };

  if (!sprint) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <BookOpen size={48} className="mx-auto mb-4 text-slate-400" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            Sprint Not Found
          </h2>
          <p className="text-slate-600">
            Sprint {sprintNo} doesn't exist for this board.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 tablet:p-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 tablet:p-6">
        <div className="flex flex-col tablet:flex-row tablet:items-center gap-3 mb-4">
          <BookOpen size={24} className="text-blue-600" />
          <div className="flex-1">
            <h2 className="text-xl tablet:text-2xl font-bold text-slate-800">
              {sprint.name} - Reflection
              {(userRole === 'manager' || userRole === 'admin') && selectedTeamMember && (
                <span className="text-lg font-normal text-slate-600 ml-2">
                  - {board.collaborators.find(c => c.email === selectedTeamMember)?.name}
                </span>
              )}
            </h2>
            <p className="text-sm tablet:text-base text-slate-600">
              {selectedTeamMember 
                ? `Viewing ${board.collaborators.find(c => c.email === selectedTeamMember)?.name}'s reflections`
                : "Comprehensive self and manager review covering personal growth, team insights, and future planning"
              }
            </p>
          </div>
        </div>

        {/* Team Member Selector for Managers */}
        {(userRole === 'manager' || userRole === 'admin') && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <Crown className="w-5 h-5 text-purple-600" />
              <h3 className="text-sm font-semibold text-purple-800">
                Manager View
              </h3>
            </div>
            <div className="flex flex-col tablet:flex-row tablet:items-center gap-3 tablet:gap-4 mb-3">
              <label className="text-sm font-medium text-purple-700">
                View reflections for:
              </label>
              <select
                value={selectedTeamMember}
                onChange={(e) => setSelectedTeamMember(e.target.value)}
                className="px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm bg-white w-full tablet:w-auto"
              >
                <option value="">My Reflections</option>
                {board.collaborators
                  .filter(collab => collab.email !== user?.email)
                  .map(collab => (
                    <option key={collab.email} value={collab.email}>
                      {collab.name} ({collab.email})
                    </option>
                  ))}
              </select>
            </div>
            {!selectedTeamMember && (
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-purple-700">
                  View Mode:
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode('self')}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      viewMode === 'self'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-purple-600 border border-purple-300 hover:bg-purple-50'
                    }`}
                  >
                    Self Reviews
                  </button>
                  <button
                    onClick={() => setViewMode('manager')}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      viewMode === 'manager'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-purple-600 border border-purple-300 hover:bg-purple-50'
                    }`}
                  >
                    Manager Reviews
                  </button>
                </div>
              </div>
            )}
            <p className="text-xs text-purple-600 mt-2">
              {selectedTeamMember 
                ? `Viewing ${board.collaborators.find(c => c.email === selectedTeamMember)?.name}'s self-reviews - comment to provide feedback`
                : "Viewing your manager reviews"
              }
            </p>
          </div>
        )}

        {/* Privacy Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-blue-800 mb-1">
                Private Reflection
              </h3>
              <p className="text-sm text-blue-700">
                {userRole === 'manager'
                  ? "As a manager, you can view team member self-reviews and provide feedback by commenting on them. You can also add manager reviews for team members. You do not create self-reviews."
                  : userRole === 'admin'
                  ? "As an admin, you can view team member reflections and manager feedback, but only managers can add manager reviews."
                  : "Your reflections are private and only visible to you and your manager. You can see manager reviews given to you, but only managers can add them."
                }
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {summaryStats.totalReflections}
            </div>
            <div className="text-sm text-blue-700">Total Reflections</div>
          </div>
          <div className="bg-green-50 rounded-lg border border-green-200 p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {summaryStats.selfReviews}
            </div>
            <div className="text-sm text-green-700">Self Reviews</div>
          </div>
          <div className="bg-purple-50 rounded-lg border border-purple-200 p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {summaryStats.managerReviews}
            </div>
            <div className="text-sm text-purple-700">Manager Reviews</div>
          </div>
          <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              {renderStars(Math.round(parseFloat(summaryStats.avgRating)))}
            </div>
            <div className="text-sm text-yellow-700">
              Avg Rating: {summaryStats.avgRating}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-slate-200 p-1">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-1">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${getColorClasses(
                  tab.color,
                  isActive
                )}`}
              >
                <IconComponent size={18} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">
              {tabs.find((t) => t.key === activeTab)?.label}
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              {tabs.find((t) => t.key === activeTab)?.description}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              disabled={
                (!!selectedTeamMember && (userRole !== 'manager' && userRole !== 'admin')) ||
                (viewMode === 'manager' && userRole !== 'manager') ||
                (userRole === 'manager' && viewMode === 'self' && !selectedTeamMember)
              }
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
            >
              {showAddForm ? <X size={16} /> : <Plus size={16} />}
              {showAddForm ? "Cancel" : selectedTeamMember ? "Add Manager Review" : (userRole === 'manager' ? "Add Manager Review" : (viewMode === 'self' ? "Add Self Review" : "Add Manager Review"))}
            </button>
          </div>
        </div>

        {/* Add Reflection Form */}
        {showAddForm && (
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 mb-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Review Type
                  </label>
                  <select
                    value={selectedTeamMember ? "manager" : (userRole === 'manager' ? "manager" : (viewMode === 'manager' ? "manager" : newReflection.reviewType))}
                    onChange={(e) =>
                      setNewReflection({
                        ...newReflection,
                        reviewType: e.target.value as "self" | "manager",
                      })
                    }
                    disabled={!!selectedTeamMember || (userRole !== 'manager' && viewMode === 'manager') || (userRole === 'manager' && !selectedTeamMember && viewMode === 'self')}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
                  >
                    {userRole !== 'manager' && (
                      <option value="self">Self Review</option>
                    )}
                    {userRole === 'manager' && (
                      <option value="manager">Manager Review</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={newReflection.priority}
                    onChange={(e) =>
                      setNewReflection({
                        ...newReflection,
                        priority: e.target.value as "Low" | "Medium" | "High",
                      })
                    }
                    className="w-full p-3 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Low">Low Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Rating (1-5 stars)
                </label>
                <div className="flex items-center gap-2">
                  {Array.from({ length: 5 }, (_, i) => (
                    <button
                      key={i}
                      onClick={() =>
                        setNewReflection({ ...newReflection, rating: i + 1 })
                      }
                      className="focus:outline-none"
                    >
                      <Star
                        size={24}
                        className={
                          i < newReflection.rating
                            ? "text-yellow-400 fill-current"
                            : "text-gray-300 hover:text-yellow-300"
                        }
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-slate-600">
                    {newReflection.rating}/5
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Reflection Content
                </label>
                <EnhancedSmartReflectionInput
                  value={newReflection.content}
                  onChange={(value) =>
                    setNewReflection({ ...newReflection, content: value })
                  }
                  onSubmit={() => {}}
                  placeholder={`Share your thoughts about ${tabs
                    .find((t) => t.key === activeTab)
                    ?.label.toLowerCase()}... Use @username to mention team members and #task to reference tasks.`}
                  tasks={mentionTasks}
                  users={mentionUsers}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
                  rows={4}
                  isTextarea={true}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleAddReflection}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {userRole === 'manager' ? "Add Manager Review" : (viewMode === 'self' ? "Add Self Review" : "Add Manager Review")}
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-6 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reflections List */}
        <div className="space-y-4">
          {getCurrentCategoryData().length > 0 ? (
            getCurrentCategoryData().map((reflection) => (
              <div
                key={reflection.id}
                className="border border-slate-200 rounded-lg p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        reflection.reviewType === "self"
                          ? "bg-blue-100"
                          : "bg-purple-100"
                      }`}
                    >
                      {reflection.reviewType === "self" ? (
                        <User size={16} className="text-blue-600" />
                      ) : (
                        <Crown size={16} className="text-purple-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            reflection.reviewType === "self"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          {reflection.reviewType === "self"
                            ? "Self Review"
                            : "Manager Review"}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            reflection.priority === "High"
                              ? "bg-red-100 text-red-700"
                              : reflection.priority === "Medium"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {reflection.priority} Priority
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        by {reflection.author} •{" "}
                        {new Date(reflection.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {reflection.rating && (
                      <div className="flex items-center gap-1">
                        {renderStars(reflection.rating)}
                      </div>
                    )}
                    {reflection.authorEmail === user?.email && (
                      <>
                        <button
                          onClick={() => handleEditReflection(reflection)}
                          className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1 rounded transition-colors"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteReflection(
                              getCurrentCategoryKey(),
                              reflection.id
                            )
                          }
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {editingReflection === reflection.id ? (
                  <div className="bg-slate-50 rounded-lg p-4 mb-4">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Content
                        </label>
                        <textarea
                          value={editForm.content}
                          onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                          className="w-full p-3 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
                          rows={4}
                          placeholder="Enter your reflection..."
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Priority
                          </label>
                          <select
                            value={editForm.priority}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                priority: e.target.value as "Low" | "Medium" | "High",
                              })
                            }
                            className="w-full p-3 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                          >
                            <option value="Low">Low Priority</option>
                            <option value="Medium">Medium Priority</option>
                            <option value="High">High Priority</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Rating (1-5 stars)
                          </label>
                          <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => setEditForm({ ...editForm, rating: star })}
                                className={`text-2xl transition-colors ${
                                  star <= editForm.rating
                                    ? "text-yellow-400"
                                    : "text-slate-300 hover:text-yellow-300"
                                }`}
                              >
                                <Star size={20} fill="currentColor" />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={handleSaveEdit}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-4 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-700 leading-relaxed mb-4">
                    {renderContentWithMentions(reflection.content)}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        handleLikeReflection(
                          getCurrentCategoryKey(),
                          reflection.id
                        )
                      }
                      disabled={reflection.authorEmail === user?.email}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
                        reflection.authorEmail === user?.email
                          ? "text-slate-400 cursor-not-allowed"
                          : reflection.likes.includes(user?.email || "")
                          ? "text-red-600 bg-red-100"
                          : "text-slate-500 hover:text-red-600 hover:bg-red-100"
                      }`}
                    >
                      <Heart size={14} />
                      <span className="text-sm font-medium">
                        {reflection.likes.length}
                      </span>
                    </button>
                    <button
                      onClick={() =>
                        setShowComments({
                          ...showComments,
                          [reflection.id]: !showComments[reflection.id],
                        })
                      }
                      className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      <MessageCircle size={14} />
                      <span className="text-sm font-medium">
                        {reflection.comments.length}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Comments Section */}
                {showComments[reflection.id] && (
                  <div className="border-t border-slate-200 pt-4 mt-4">
                    {/* Existing Comments */}
                    {reflection.comments.length > 0 && (
                      <div className="space-y-3 mb-4">
                        {reflection.comments.map((comment) => (
                          <div
                            key={comment.id}
                            className="bg-slate-50 rounded-lg p-3"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="text-sm text-slate-700 mb-1">
                                  {renderContentWithMentions(comment.text)}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <span>{comment.author}</span>
                                  <span>•</span>
                                  <span>
                                    {new Date(
                                      comment.createdAt
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() =>
                                  handleLikeComment(
                                    getCurrentCategoryKey(),
                                    reflection.id,
                                    comment.id
                                  )
                                }
                                disabled={comment.authorEmail === user?.email}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                                  comment.authorEmail === user?.email
                                    ? "text-slate-400 cursor-not-allowed"
                                    : comment.likes.includes(user?.email || "")
                                    ? "text-red-600 bg-red-100"
                                    : "text-slate-500 hover:text-red-600 hover:bg-red-100"
                                }`}
                              >
                                <Heart size={12} /> {comment.likes.length}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Comment */}
                    <div className="space-y-2">
                      {reflection.reviewType === 'manager' && viewMode === 'manager' && (
                        <div className="flex items-center gap-2 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-lg">
                          <Crown size={12} />
                          <span>Replying to manager review</span>
                        </div>
                      )}
                      {reflection.reviewType === 'self' && userRole === 'manager' && (
                        <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                          <User size={12} />
                          <span>Providing feedback on self-review</span>
                        </div>
                      )}
                      <div className="flex gap-2">
                      <SmartCommentInput
                        value={commentTexts[reflection.id] || ""}
                        onChange={(value) =>
                          setCommentTexts({
                            ...commentTexts,
                            [reflection.id]: value,
                          })
                        }
                        onSubmit={() =>
                          handleAddComment(
                            getCurrentCategoryKey(),
                            reflection.id
                          )
                        }
                        placeholder={
                          reflection.reviewType === 'manager' 
                            ? "Reply to manager review... Use @username to mention users or #task for tasks"
                            : userRole === 'manager' && reflection.reviewType === 'self'
                            ? "Provide feedback on this self-review... Use @username to mention users or #task for tasks"
                            : "Add a comment... Use @username to mention users or #task for tasks"
                        }
                        users={mentionUsers}
                        tasks={tasks}
                      />
                      <button
                        onClick={() =>
                          handleAddComment(
                            getCurrentCategoryKey(),
                            reflection.id
                          )
                        }
                        disabled={!commentTexts[reflection.id]?.trim()}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                      >
                        <Send size={14} />
                      </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-slate-500">
              <div className="flex justify-center mb-4">
                {tabs.find((t) => t.key === activeTab)?.icon &&
                  React.createElement(
                    tabs.find((t) => t.key === activeTab)!.icon,
                    {
                      size: 48,
                      className: "text-slate-300",
                    }
                  )}
              </div>
              <h4 className="text-lg font-medium mb-2">No reflections yet</h4>
              <p className="text-sm text-slate-400 mb-4">
                Start documenting your thoughts and insights about{" "}
                {tabs.find((t) => t.key === activeTab)?.label.toLowerCase()}
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Your First Reflection
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Add Templates */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Quick Reflection Templates
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium text-slate-700">Self Review Prompts:</h4>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• What skill did I develop or improve this sprint?</li>
              <li>• What challenge helped me grow the most?</li>
              <li>• How did I contribute to team success?</li>
              <li>• What would I do differently next time?</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-slate-700">
              Manager Review Prompts:
            </h4>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• How did the team member exceed expectations?</li>
              <li>• What development areas should they focus on?</li>
              <li>• How did they impact team dynamics?</li>
              <li>• What support do they need for growth?</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Task Modal */}
      {selectedTask && showTaskModal && (
        <TaskModal
          task={selectedTask}
          onClose={() => {
            setSelectedTask(null);
            setShowTaskModal(false);
          }}
          existingTasks={tasks}
        />
      )}
    </div>
  );
};

export default EnhancedReflectionTab;