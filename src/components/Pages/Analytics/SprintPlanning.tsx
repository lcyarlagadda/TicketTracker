// components/Analytics/SprintPlanning.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Target, Plus, ArrowLeft, Play, Square, CheckCircle, BarChart3, MessageSquare, BookOpen, AlertTriangle, X, Save } from 'lucide-react';
import { useAppSelector } from '../../../hooks/redux';
import { useTasksSync } from '../../../hooks/useFirebaseSync';
import { Sprint, CreateSprintForm } from '../../../store/types/types';
import { sprintService } from '../../../services/sprintService';
import { useNavigate } from 'react-router-dom';

interface SprintPlanningProps {
  boardId: string;
}

type ViewMode = 'list' | 'create' | 'edit';

const SprintPlanning: React.FC<SprintPlanningProps> = ({ boardId }) => {
  const { user } = useAppSelector(state => state.auth);
  const navigate = useNavigate();
  const tasks = useTasksSync(boardId);
  
  // Component state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Form state
  const [sprintForm, setSprintForm] = useState<CreateSprintForm>({
    sprintNumber: 1,
    name: '',
    goals: [],
    keyFeatures: [],
    bottlenecks: [],
    duration: 14,
    estimatedWorkHoursPerWeek: 40,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    holidays: []
  });

  const [newGoal, setNewGoal] = useState('');
  const [newFeature, setNewFeature] = useState('');
  const [newBottleneck, setNewBottleneck] = useState('');
  const [newHoliday, setNewHoliday] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

  // Fetch sprints on component mount
  useEffect(() => {
    const fetchSprints = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        const boardSprints = await sprintService.fetchBoardSprints(user.uid, boardId);
        setSprints(boardSprints);
        
        // Get next sprint number for new sprints
        const nextSprintNumber = boardSprints.length > 0 
          ? Math.max(...boardSprints.map(s => s.sprintNumber)) + 1 
          : 1;
        setSprintForm(prev => ({ ...prev, sprintNumber: nextSprintNumber }));
      } catch (error) {
        console.error('Error fetching sprints:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSprints();
  }, [user, boardId]);

  // Calculate team size from tasks assignees (since we don't have board collaborators)
  const teamSize = useMemo(() => {
    const assignees = new Set(tasks.map(t => t.assignedTo).filter(Boolean));
    return Math.max(assignees.size, 1); // At least 1 person
  }, [tasks]);

  // Get current active sprint
  const activeSprint = sprints.find(s => s.status === 'active');

  // Get unassigned tasks
  const unassignedTasks = tasks.filter(task => !task.sprintId);

  // Sprint form handlers
  const handleFormChange = (field: keyof CreateSprintForm, value: any) => {
    setSprintForm(prev => ({ ...prev, [field]: value }));
  };

  const addToArray = (field: 'goals' | 'keyFeatures' | 'bottlenecks' | 'holidays', value: string) => {
    if (!value.trim()) return;
    
    setSprintForm(prev => ({
      ...prev,
      [field]: [...prev[field], value.trim()]
    }));

    // Clear input
    if (field === 'goals') setNewGoal('');
    if (field === 'keyFeatures') setNewFeature('');
    if (field === 'bottlenecks') setNewBottleneck('');
    if (field === 'holidays') setNewHoliday('');
  };

  const removeFromArray = (field: 'goals' | 'keyFeatures' | 'bottlenecks' | 'holidays', index: number) => {
    setSprintForm(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  // Calculate capacity for new sprint
  const formCapacity = useMemo(() => {
    const selectedTasksPoints = tasks
      .filter(task => selectedTasks.includes(task.id))
      .reduce((sum, task) => sum + (task.points || 0), 0);

    // Simple capacity calculation: duration * work hours * team size
    const estimatedCapacity = sprintForm.duration * (sprintForm.estimatedWorkHoursPerWeek / 7) * teamSize;
    const holidayDays = sprintForm.holidays.length;
    const finalizedCapacity = Math.max(0, estimatedCapacity - (holidayDays * (sprintForm.estimatedWorkHoursPerWeek / 7) * teamSize));
    
    const utilizationPercentage = finalizedCapacity > 0 
      ? (selectedTasksPoints * 6) / finalizedCapacity * 100 // Assuming 6 hours per story point
      : 0;

    return {
      estimatedCapacity: Math.round(estimatedCapacity),
      finalizedCapacity: Math.round(finalizedCapacity),
      selectedTasksPoints,
      capacityUtilization: Math.round(utilizationPercentage * 10) / 10
    };
  }, [sprintForm, teamSize, selectedTasks, tasks]);

  // Sprint actions
  const handleCreateSprint = async () => {
    if (!user) return;
    
    setSaveStatus('saving');
    try {
      const sprintData: Omit<Sprint, 'id'> = {
        sprintNumber: sprintForm.sprintNumber,
        name: sprintForm.name || `Sprint ${sprintForm.sprintNumber}`,
        goals: sprintForm.goals,
        keyFeatures: sprintForm.keyFeatures,
        bottlenecks: sprintForm.bottlenecks,
        duration: sprintForm.duration,
        estimatedWorkHoursPerWeek: sprintForm.estimatedWorkHoursPerWeek,
        teamSize: teamSize,
        holidays: sprintForm.holidays,
        startDate: sprintForm.startDate,
        endDate: sprintForm.endDate,
        status: 'planning',
        boardId: boardId,
        createdBy: {
          uid: user.uid,
          email: user.email || '',
          name: user.displayName || user.email || '',
        },
        createdAt: new Date(),
        totalStoryPoints: formCapacity.selectedTasksPoints,
        estimatedCapacity: formCapacity.estimatedCapacity,
        finalizedCapacity: formCapacity.finalizedCapacity,
        capacityUtilization: formCapacity.capacityUtilization,
        taskIds: selectedTasks
      };

      const newSprint = await sprintService.createSprint(user.uid, boardId, sprintData);
      
      // Assign selected tasks to sprint
      if (selectedTasks.length > 0) {
        await sprintService.assignTasksToSprint(user.uid, boardId, newSprint.id, selectedTasks);
      }

      setSprints(prev => [newSprint, ...prev]);
      setSaveStatus('saved');
      setTimeout(() => {
        setSaveStatus('idle');
        setViewMode('list');
        resetForm();
      }, 1000);
    } catch (error) {
      console.error('Error creating sprint:', error);
      setSaveStatus('error');
    }
  };

  const resetForm = () => {
    const nextSprintNumber = sprints.length > 0 
      ? Math.max(...sprints.map(s => s.sprintNumber)) + 1 
      : 1;
    
    setSprintForm({
      sprintNumber: nextSprintNumber,
      name: '',
      goals: [],
      keyFeatures: [],
      bottlenecks: [],
      duration: 14,
      estimatedWorkHoursPerWeek: 40,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      holidays: []
    });
    setSelectedTasks([]);
    setNewGoal('');
    setNewFeature('');
    setNewBottleneck('');
    setNewHoliday('');
  };

  const startSprint = async (sprintId: string) => {
    if (!user) return;
    
    try {
      await sprintService.updateSprint(user.uid, boardId, sprintId, { status: 'active' });
      setSprints(prev => prev.map(s => 
        s.id === sprintId ? { ...s, status: 'active' as const } : 
        s.status === 'active' ? { ...s, status: 'completed' as const } : s
      ));
    } catch (error) {
      console.error('Error starting sprint:', error);
    }
  };

  const completeSprint = async (sprintId: string) => {
    if (!user) return;
    
    try {
      const completedSprint = await sprintService.completeActiveSprint(user.uid, boardId, sprintId);
      setSprints(prev => prev.map(s => s.id === sprintId ? completedSprint : s));
    } catch (error) {
      console.error('Error completing sprint:', error);
    }
  };

  // Navigation
  const navigateToSprintAnalytics = (sprintNumber: number) => {
    navigate(`/board/${boardId}/${sprintNumber}/analytics`);
  };

  const navigateToSprintRetro = (sprintNumber: number) => {
    navigate(`/board/${boardId}/${sprintNumber}/retro`);
  };

  const navigateToSprintReflection = (sprintNumber: number) => {
    navigate(`/board/${boardId}/${sprintNumber}/reflection`);
  };

  // Loading state
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

  // Render sprint list view
  if (viewMode === 'list') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Sprint Planning</h2>
              <p className="text-slate-600">Manage and track all sprints for this board</p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setViewMode('create');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
              Create Sprint
            </button>
          </div>

          {/* Active Sprint Overview */}
          {activeSprint && (
            <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-green-800">Active Sprint: {activeSprint.name}</h3>
                  <p className="text-sm text-green-600">
                    {new Date(activeSprint.startDate).toLocaleDateString()} - {new Date(activeSprint.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigateToSprintAnalytics(activeSprint.sprintNumber)}
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
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-700">{activeSprint.totalStoryPoints}</div>
                  <div className="text-sm text-green-600">Story Points</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-700">{activeSprint.duration}</div>
                  <div className="text-sm text-green-600">Days Duration</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-700">{activeSprint.teamSize}</div>
                  <div className="text-sm text-green-600">Team Members</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-700">
                    {Math.max(0, Math.ceil((new Date(activeSprint.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))}
                  </div>
                  <div className="text-sm text-green-600">Days Left</div>
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
            <div className="bg-yellow-50 rounded-lg border border-purple-200 p-4 text-center">
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
                    </div>
                    <div className="flex items-center gap-2">
                      {(sprint.status === 'active' || sprint.status === 'completed') && (
                        <>
                          <button
                            onClick={() => navigateToSprintAnalytics(sprint.sprintNumber)}
                            className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                          >
                            <BarChart3 size={14} />
                            Analytics
                          </button>
                          <button
                            onClick={() => navigateToSprintRetro(sprint.sprintNumber)}
                            className="flex items-center gap-1 px-3 py-1 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                          >
                            <MessageSquare size={14} />
                            Retro
                          </button>
                          <button
                            onClick={() => navigateToSprintReflection(sprint.sprintNumber)}
                            className="flex items-center gap-1 px-3 py-1 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
                          >
                            <BookOpen size={14} />
                            Reflection
                          </button>
                        </>
                      )}
                      {sprint.status === 'planning' && (
                        <button
                          onClick={() => startSprint(sprint.id)}
                          className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                          <Play size={14} />
                          Start Sprint
                        </button>
                      )}
                      {sprint.status === 'active' && (
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm text-slate-600">
                    <div>
                      <span className="font-medium">Points:</span> {sprint.totalStoryPoints}
                    </div>
                    <div>
                      <span className="font-medium">Duration:</span> {sprint.duration} days
                    </div>
                    <div>
                      <span className="font-medium">Team:</span> {sprint.teamSize} members
                    </div>
                    <div>
                      <span className="font-medium">Goals:</span> {sprint.goals.length}
                    </div>
                    <div>
                      <span className="font-medium">Tasks:</span> {sprint.taskIds.length}
                    </div>
                  </div>

                  {sprint.goals.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-100">
                      <p className="text-sm text-slate-600">
                        <span className="font-medium">Goals:</span> {sprint.goals.slice(0, 2).join(', ')}
                        {sprint.goals.length > 2 && ` +${sprint.goals.length - 2} more`}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <Target size={48} className="mx-auto mb-4 text-slate-300" />
              <h4 className="text-lg font-medium mb-2">No sprints created yet</h4>
              <p className="text-slate-400 mb-4">Create your first sprint to start planning and tracking work</p>
              <button
                onClick={() => {
                  resetForm();
                  setViewMode('create');
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create First Sprint
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render create/edit sprint form
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setViewMode('list')}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back to Sprint List</span>
            </button>
            <div className="h-6 w-px bg-slate-300"></div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                {viewMode === 'create' ? 'Create New Sprint' : 'Edit Sprint'}
              </h2>
              <p className="text-slate-600">Plan capacity and assign tasks</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${
              saveStatus === 'saving' ? 'bg-yellow-500 animate-pulse' :
              saveStatus === 'saved' ? 'bg-green-500' : 
              saveStatus === 'error' ? 'bg-red-500' : 'bg-slate-300'
            }`}></div>
            <span className="text-slate-600">
              {saveStatus === 'saving' ? 'Saving...' :
               saveStatus === 'saved' ? 'Saved' :
               saveStatus === 'error' ? 'Error' : 'Ready'}
            </span>
          </div>
        </div>

        {/* Capacity Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{formCapacity.estimatedCapacity}h</div>
            <div className="text-sm text-blue-700">Estimated Capacity</div>
          </div>
          <div className="bg-green-50 rounded-lg border border-green-200 p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{formCapacity.finalizedCapacity}h</div>
            <div className="text-sm text-green-700">After Holidays</div>
          </div>
          <div className="bg-yellow-50 rounded-lg border border-purple-200 p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{formCapacity.selectedTasksPoints}</div>
            <div className="text-sm text-purple-700">Selected Points</div>
          </div>
          <div className="bg-orange-50 rounded-lg border border-orange-200 p-4 text-center">
            <div className={`text-2xl font-bold ${
              formCapacity.capacityUtilization > 100 ? 'text-red-600' :
              formCapacity.capacityUtilization > 80 ? 'text-orange-600' : 'text-green-600'
            }`}>
              {formCapacity.capacityUtilization}%
            </div>
            <div className="text-sm text-orange-700">Utilization</div>
          </div>
        </div>

        {formCapacity.capacityUtilization > 100 && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle size={16} className="text-red-600" />
            <span className="text-sm text-red-700">Over capacity! Consider reducing scope or extending timeline.</span>
          </div>
        )}
      </div>

      {/* Sprint Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="space-y-6">
          {/* Basic Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Sprint Number</label>
              <input
                type="number"
                value={sprintForm.sprintNumber}
                onChange={(e) => handleFormChange('sprintNumber', parseInt(e.target.value) || 1)}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Sprint Name</label>
              <input
                type="text"
                value={sprintForm.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                placeholder={`Sprint ${sprintForm.sprintNumber}`}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Duration (days)</label>
              <input
                type="number"
                value={sprintForm.duration}
                onChange={(e) => handleFormChange('duration', parseInt(e.target.value) || 14)}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
                max="30"
              />
            </div>
          </div>

          {/* Sprint Goals */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Sprint Goals</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                placeholder="Add a sprint goal..."
                className="flex-1 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && addToArray('goals', newGoal)}
              />
              <button
                onClick={() => addToArray('goals', newGoal)}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
            </div>
            {sprintForm.goals.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {sprintForm.goals.map((goal, index) => (
                  <div key={index} className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    <span>{goal}</span>
                    <button
                      onClick={() => removeFromArray('goals', index)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dates and Capacity */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
              <input
                type="date"
                value={sprintForm.startDate}
                onChange={(e) => handleFormChange('startDate', e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
              <input
                type="date"
                value={sprintForm.endDate}
                onChange={(e) => handleFormChange('endDate', e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Work Hours/Week</label>
              <input
                type="number"
                value={sprintForm.estimatedWorkHoursPerWeek}
                onChange={(e) => handleFormChange('estimatedWorkHoursPerWeek', parseInt(e.target.value) || 40)}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
                max="60"
              />
            </div>
          </div>

          {/* Task Assignment */}
          {unassignedTasks.length > 0 && (
            <div>
              <h4 className="text-md font-semibold text-slate-800 mb-4">Assign Tasks ({selectedTasks.length} selected)</h4>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {unassignedTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg">
                    <input
                      type="checkbox"
                      checked={selectedTasks.includes(task.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTasks(prev => [...prev, task.id]);
                        } else {
                          setSelectedTasks(prev => prev.filter(id => id !== task.id));
                        }
                      }}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-slate-800">{task.title}</div>
                      <div className="text-sm text-slate-600">
                        {task.points || 0} points • {task.priority} • {task.assignedTo || 'Unassigned'}
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      task.priority === 'High' ? 'bg-red-100 text-red-700' :
                      task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
            <button
              onClick={() => setViewMode('list')}
              className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateSprint}
              disabled={sprintForm.goals.length === 0}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save size={16} />
              Create Sprint
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SprintPlanning;