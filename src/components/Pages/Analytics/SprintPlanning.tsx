// components/Analytics/SprintPlanningWithModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Target, Plus, ArrowLeft, Play, Square, CheckCircle, BarChart3, MessageSquare, BookOpen, AlertTriangle, X, Save, Edit3, EyeIcon, RefreshCw } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../../hooks/redux';
import { useTasksSync } from '../../../hooks/useFirebaseSync';
import { Sprint } from '../../../store/types/types';
import { sprintService } from '../../../services/sprintService';
import { fetchBoard } from '../../../store/slices/boardSlice';
import { useNavigate } from 'react-router-dom';
import SprintModal from '../../Forms/CreateSprintForm';
import { hasPermissionLegacy } from '../../../utils/permissions';

interface SprintPlanningProps {
  boardId: string;
}

const SprintPlanningWithModal: React.FC<SprintPlanningProps> = ({ boardId }) => {
  const { user } = useAppSelector(state => state.auth);
  const { currentBoard } = useAppSelector(state => state.boards);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const tasks = useTasksSync(boardId);
  
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [canManageSprints, setCanManageSprints] = useState(false);

  // Calculate team size based on board collaborators (for new sprints)
  const teamSize = useMemo(() => {
    if (currentBoard && currentBoard.collaborators) {
      return Math.max(currentBoard.collaborators.length, 1);
    }
    // Fallback to task assignees if board data not available
    const assignees = new Set(tasks.map(t => t.assignedTo?.name).filter(Boolean));
    return Math.max(assignees.size, 1);
  }, [currentBoard, tasks]);

  // Fetch board data if not already loaded
  useEffect(() => {
    if (user && boardId && (!currentBoard || currentBoard.id !== boardId)) {
      dispatch(fetchBoard({ userId: user.uid, boardId }));
    }
  }, [user, boardId, currentBoard, dispatch]);

  // Check sprint management permissions
  useEffect(() => {
    if (currentBoard && user) {
      const hasPermission = hasPermissionLegacy(currentBoard, user.email || '', 'canManageSprints');
      console.log('Sprint Planning Permission Check:', {
        userEmail: user.email,
        boardCollaborators: currentBoard.collaborators,
        hasPermission,
        currentBoard: currentBoard
      });
      setCanManageSprints(hasPermission);
    }
  }, [currentBoard, user]);

  // Fetch sprints
  useEffect(() => {
    const fetchSprints = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        const boardSprints = await sprintService.fetchBoardSprints(user.uid, boardId);
        setSprints(boardSprints.sort((a, b) => b.sprintNumber - a.sprintNumber));
      } catch (error) {
        // Error('Error fetching sprints:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSprints();
  }, [user, boardId]);

  // Get current active sprint
  const activeSprint = sprints.find(s => s.status === 'active');
  const unassignedTasks = tasks.filter(task => task.assignedTo === null && task.type !== 'subtask');
  
  // Get tasks for active sprint and calculate task type breakdown
  const activeSprintTasks = activeSprint ? tasks.filter(task => task.sprintId === activeSprint.id) : [];
  
  // Helper function to get task points (handles null values)
  const getTaskPoints = (task: any): number => {
    if (task.points !== null && task.points !== undefined) {
      return task.points;
    }
    // Fallback to priority-based points if no explicit points set
    return task.priority === 'High' ? 8 : task.priority === 'Medium' ? 5 : 3;
  };
  
  // Calculate real-time story points for active sprint
  const realTimeStoryPoints = useMemo(() => {
    return activeSprintTasks.reduce((sum, task) => sum + getTaskPoints(task), 0);
  }, [activeSprintTasks]);
  
  const taskTypeBreakdown = useMemo(() => {
    const breakdown = {
      epic: 0,
      feature: 0,
      story: 0,
      bug: 0,
      enhancement: 0,
      poc: 0
    };
    
    activeSprintTasks.forEach(task => {
      if (task.type && task.type !== 'subtask' && breakdown.hasOwnProperty(task.type)) {
        breakdown[task.type as keyof typeof breakdown]++;
      }
    });
    
    return breakdown;
  }, [activeSprintTasks]);

  // Calculate real-time values for all sprints
  const sprintRealTimeData = useMemo(() => {
    return sprints.map(sprint => {
      const sprintTasks = tasks.filter(task => task.sprintId === sprint.id);
      const realTimeStoryPoints = sprintTasks.reduce((sum, task) => sum + getTaskPoints(task), 0);
      const taskCount = sprintTasks.length;
      
      return {
        sprintId: sprint.id,
        realTimeStoryPoints,
        taskCount,
        hasChanges: sprint.totalStoryPoints !== realTimeStoryPoints || sprint.taskIds.length !== taskCount
      };
    });
  }, [sprints, tasks]);

  const handleBackToBoard = () => {
    navigate(`/board/${boardId}`);
  };

  // Sprint actions
  const startSprint = async (sprintId: string) => {
    console.log('Start Sprint clicked:', { sprintId, user: user?.email, canManageSprints });
    if (!user || !currentBoard) return;
    
    try {
      await sprintService.updateSprint(user.uid, boardId, sprintId, { status: 'active' }, currentBoard, user.email || '');
      setSprints(prev => prev.map(s => 
        s.id === sprintId ? { ...s, status: 'active' as const } : 
        s.status === 'active' ? { ...s, status: 'completed' as const } : s
      ));
    } catch (error) {
      console.error('Error starting sprint:', error);
    }
  };

  const completeSprint = async (sprintId: string) => {
    console.log('Complete Sprint clicked:', { sprintId, user: user?.email, canManageSprints });
    if (!user || !currentBoard) return;
    
    try {
      const completedSprint = await sprintService.completeActiveSprint(user.uid, boardId, sprintId, currentBoard, user.email || '');
      setSprints(prev => prev.map(s => s.id === sprintId ? completedSprint : s));
      
      // Show success message or notification
      // Sprint completed successfully with metrics
    } catch (error) {
      console.error('Error completing sprint:', error);
    }
  };

  const handleEditSprint = (sprint: Sprint) => {
    setEditingSprint(sprint);
    setModalOpen(true);
  };

  const handleCreateSprint = () => {
    setEditingSprint(null);
    setModalOpen(true);
  };

  const handleSprintSaved = (savedSprint: Sprint) => {
    if (editingSprint) {
      setSprints(prev => prev.map(s => s.id === savedSprint.id ? savedSprint : s));
    } else {
      setSprints(prev => [savedSprint, ...prev]);
    }
    setModalOpen(false);
    setEditingSprint(null);
  };

  const canStartSprint = (sprint: Sprint) => {
    if (sprint.status !== 'planning') return false;
    if (activeSprint) return false;
    
    const today = new Date();
    const sprintStartDate = new Date(sprint.startDate);
    const daysDifference = Math.abs((sprintStartDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysDifference <= 7;
  };

  const navigateToSprintAnalytics = (sprintNumber: number) => {
    // Navigating to analytics for sprint
    navigate(`/board/${boardId}/${sprintNumber}/analytics`);
  };

  const navigateToSprintRetro = (sprintNumber: number) => {
    // Navigating to retro for sprint
    navigate(`/board/${boardId}/${sprintNumber}/retro`);
  };

  const navigateToSprintReflection = (sprintNumber: number) => {
    // Navigating to reflection for sprint
    navigate(`/board/${boardId}/${sprintNumber}/reflection`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading sprint planning...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 tablet:p-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 tablet:p-6">
        <div className="flex flex-col tablet:flex-row tablet:items-center tablet:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl tablet:text-2xl font-bold text-slate-800">Sprint Planning</h2>
            <p className="text-sm tablet:text-base text-slate-600">Manage and track all sprints for this board</p>
          </div>
            <div className="flex flex-col tablet:flex-row items-stretch tablet:items-center gap-3">
            <button
              onClick={handleBackToBoard}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors group"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
              <span className="font-medium">Back to Board</span>
            </button>
            {canManageSprints && (
              <button
                onClick={handleCreateSprint}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} />
                Create Sprint
              </button>
            )}
            </div>
        </div>

        {/* Active Sprint Overview */}
        {activeSprint && (
          <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex flex-col tablet:flex-row tablet:items-center tablet:justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-green-800">Active Sprint: {activeSprint.name}</h3>
                <p className="text-sm text-green-600">
                  {new Date(activeSprint.startDate).toLocaleDateString()} - {new Date(activeSprint.endDate).toLocaleDateString()}
                </p>
              </div>
              <div className="flex flex-col tablet:flex-row gap-2">
                {canManageSprints && (
                  <button
                    onClick={() => handleEditSprint(activeSprint)}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Edit3 size={14} />
                    Edit
                  </button>
                )}
                <button
                  onClick={() => {
                    // Active sprint analytics button clicked
                    navigateToSprintAnalytics(activeSprint.sprintNumber);
                  }}
                  className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  <BarChart3 size={14} />
                  Analytics
                </button>
                <button
                  onClick={() => completeSprint(activeSprint.id)}
                  className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  <CheckCircle size={14} />
                  Complete
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-700">{realTimeStoryPoints}</div>
                <div className="text-sm text-green-600">Current Story Points</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-700">{activeSprint.duration}</div>
                <div className="text-sm text-green-600">Days Duration</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-700">
                  {currentBoard?.collaborators?.length || 1}
                </div>
                <div className="text-sm text-green-600">Team Members</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-700">
                  {(() => {
                    const teamSize = currentBoard?.collaborators?.length || 1;
                    const workHoursPerWeek = (activeSprint as any).estimatedWorkHoursPerWeek || 40;
                    return teamSize * workHoursPerWeek;
                  })()}
                </div>
                <div className="text-sm text-green-600">Capacity/Week</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-700">
                  {Math.max(0, Math.ceil((new Date(activeSprint.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))}
                </div>
                <div className="text-sm text-green-600">Days Left</div>
              </div>
            </div>
            
            {/* Task Type Breakdown */}
            <div className="mt-4 pt-4 border-t border-green-200">
              <h4 className="text-sm font-semibold text-green-800 mb-3">Task Type Breakdown</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {Object.entries(taskTypeBreakdown).map(([type, count]) => {
                  const typeConfig = {
                    epic: { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200', label: 'Epic' },
                    feature: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', label: 'Feature' },
                    story: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', label: 'Story' },
                    bug: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', label: 'Bug' },
                    enhancement: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', label: 'Enhancement' },
                    poc: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', label: 'POC' }
                  };
                  
                  const config = typeConfig[type as keyof typeof typeConfig];
                  
                  return (
                    <div key={type} className={`${config.bg} ${config.border} border rounded-lg p-3 text-center`}>
                      <div className={`text-lg font-bold ${config.text}`}>{count}</div>
                      <div className={`text-xs ${config.text} font-medium`}>{config.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Sprint Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{sprints.length}</div>
            <div className="text-sm text-blue-700">Total Sprints</div>
          </div>
          <div className="bg-green-50 rounded-lg border border-green-200 p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {sprints.filter(s => s.status === 'active').length}
            </div>
            <div className="text-sm text-green-700">Active Sprints</div>
          </div>
          <div className="bg-purple-50 rounded-lg border border-purple-200 p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {sprints.filter(s => s.status === 'completed').length}
            </div>
            <div className="text-sm text-purple-700">Completed Sprints</div>
          </div>
          <div className="bg-orange-50 rounded-lg border border-orange-200 p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{unassignedTasks.length}</div>
            <div className="text-sm text-orange-700">Unassigned Tasks</div>
          </div>
        </div>
      </div>

      {/* Sprint List */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">All Sprints</h3>
        
        {sprints.length > 0 ? (
          <div className="space-y-4">
            {sprints.map(sprint => (
              <div key={sprint.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h4 className="font-semibold text-slate-800">{sprint.name}</h4>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      sprint.status === 'active' ? 'bg-green-100 text-green-700' :
                      sprint.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                      sprint.status === 'planning' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {sprint.status}
                    </span>
                    {(sprint as any).risks && (sprint as any).risks.length > 0 && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                        {(sprint as any).risks.length} Risk{(sprint as any).risks.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {canManageSprints ? (
                      <button
                        onClick={() => handleEditSprint(sprint)}
                        className="flex items-center gap-1 px-3 py-1 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm"
                      >
                        
                        {sprint.status === 'completed' ? (
                          <>
                            <EyeIcon size={14} /> View
                          </>
                        ) : (
                          <>
                            <Edit3 size={14} /> Edit
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEditSprint(sprint)}
                        className="flex items-center gap-1 px-3 py-1 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm"
                      >
                        <EyeIcon size={14} /> View
                      </button>
                    )}
                    {(sprint.status === 'active' || sprint.status === 'completed') && (
                      <>
                        <button
                          onClick={() => {
                            // Analytics button clicked for sprint
                            navigateToSprintAnalytics(sprint.sprintNumber);
                          }}
                          className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                          <BarChart3 size={14} />
                          Analytics
                        </button>
                        <button
                          onClick={() => {
                            // Retro button clicked for sprint
                            navigateToSprintRetro(sprint.sprintNumber);
                          }}
                          className="flex items-center gap-1 px-3 py-1 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                        >
                          <MessageSquare size={14} />
                          Retro
                        </button>
                        <button
                          onClick={() => {
                            // Reflection button clicked for sprint
                            navigateToSprintReflection(sprint.sprintNumber);
                          }}
                          className="flex items-center gap-1 px-3 py-1 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
                        >
                          <BookOpen size={14} />
                          Reflection
                        </button>
                      </>
                    )}
                    {sprint.status === 'planning' && canStartSprint(sprint) && canManageSprints && (
                      <button
                        onClick={() => startSprint(sprint.id)}
                        className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                      >
                        <Play size={14} />
                        Start Sprint
                      </button>
                    )}
                    {sprint.status === 'active' && canManageSprints && (
                      <button
                        onClick={() => completeSprint(sprint.id)}
                        className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                      >
                        <Square size={14} />
                        Complete
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 text-sm text-slate-600">
                  <div>
                    <span className="font-medium">
                      {sprint.status === 'completed' ? 'Initial Points:' : 'Current Points:'}
                    </span> {
                      (() => {
                        if (sprint.status === 'completed') {
                          // For completed sprints, show initial expectations
                          return sprint.initialStoryPoints || sprint.totalStoryPoints || 0;
                        } else {
                          // For active/planning sprints, show current real-time points
                          const realTimeData = sprintRealTimeData.find(data => data.sprintId === sprint.id);
                          return realTimeData ? realTimeData.realTimeStoryPoints : 0;
                        }
                      })()
                    }
                  </div>
                  <div>
                    <span className="font-medium">Duration:</span> {sprint.duration} days
                  </div>
                  <div>
                    <span className="font-medium">Team:</span> {
                      currentBoard?.collaborators?.length || 1
                    } members
                  </div>
                  <div>
                    <span className="font-medium">Capacity:</span> {
                      (() => {
                        const teamSize = currentBoard?.collaborators?.length || 1;
                        const workHoursPerWeek = (sprint as any).estimatedWorkHoursPerWeek || 40;
                        return teamSize * workHoursPerWeek;
                      })()
                    }/wk
                  </div>
                  <div>
                    <span className="font-medium">Goals:</span> {sprint.goals.length}
                  </div>
                  <div>
                    <span className="font-medium">Tasks:</span> {
                      (() => {
                        const realTimeData = sprintRealTimeData.find(data => data.sprintId === sprint.id);
                        return realTimeData ? realTimeData.taskCount : 0;
                      })()
                    }
                  </div>
                </div>

                {/* Completion Metrics for Completed Sprints */}
                {sprint.status === 'completed' && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <h5 className="text-sm font-semibold text-slate-700 mb-2">Sprint Completion Summary</h5>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                        <div className="text-green-800 font-medium">Initial Expectations</div>
                        <div className="text-green-600 text-lg font-bold">
                          {sprint.initialStoryPoints || sprint.totalStoryPoints || 0} pts
                        </div>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <div className="text-blue-800 font-medium">Completed</div>
                        <div className="text-blue-600 text-lg font-bold">
                          {sprint.completedStoryPoints || 0} pts
                        </div>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                        <div className="text-orange-800 font-medium">Spillover</div>
                        <div className="text-orange-600 text-lg font-bold">
                          {sprint.spilloverStoryPoints || 0} pts
                        </div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                        <div className="text-purple-800 font-medium">Completion Rate</div>
                        <div className="text-purple-600 text-lg font-bold">
                          {sprint.completionRate || 0}%
                        </div>
                      </div>
                    </div>
                    {sprint.completedAt && (
                      <div className="mt-2 text-xs text-slate-500">
                        Completed on: {new Date(sprint.completedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                )}

                {(sprint.goals.length > 0 || ((sprint as any).risks && (sprint as any).risks.length > 0)) && (
                  <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                    {sprint.goals.length > 0 && (
                      <p className="text-sm text-slate-600">
                        <span className="font-medium">Goals:</span> {sprint.goals.slice(0, 2).join(', ')}
                        {sprint.goals.length > 2 && ` +${sprint.goals.length - 2} more`}
                      </p>
                    )}
                    {(sprint as any).risks && (sprint as any).risks.length > 0 && (
                      <p className="text-sm text-red-600">
                        <span className="font-medium">Risks:</span> {(sprint as any).risks.slice(0, 2).join(', ')}
                        {(sprint as any).risks.length > 2 && ` +${(sprint as any).risks.length - 2} more`}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <Target size={48} className="mx-auto mb-4 text-slate-300" />
            <h4 className="text-lg font-medium mb-2">No sprints created yet</h4>
            <p className="text-slate-400 mb-4">
              {canManageSprints 
                ? "Create your first sprint to start planning and tracking work"
                : "Only managers and admins can create sprints. Contact your manager to get started."
              }
            </p>
            {canManageSprints && (
              <button
                onClick={handleCreateSprint}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create First Sprint
              </button>
            )}
          </div>
        )}
      </div>

      {/* Sprint Modal */}
      <SprintModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingSprint(null);
        }}
        sprint={editingSprint}
        boardId={boardId}
        onSprintSaved={handleSprintSaved}
        tasks={tasks}
        teamSize={teamSize}
        currentBoard={currentBoard}
      />
    </div>
  );
};

export default SprintPlanningWithModal;