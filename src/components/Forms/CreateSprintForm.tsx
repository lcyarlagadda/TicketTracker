// components/Analytics/SprintPlanningWithModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, X, Save } from 'lucide-react';
import { useAppSelector } from '../../hooks/redux';
import { Sprint, CreateSprintForm } from '../../store/types/types';
import { sprintService } from '../../services/sprintService';
import { useNavigate } from 'react-router-dom';

interface SprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  sprint?: Sprint | null;
  boardId: string;
  onSprintSaved: (sprint: Sprint) => void;
  tasks: any[];
  teamSize: number;
}

const SprintModal: React.FC<SprintModalProps> = ({
  isOpen,
  onClose,
  sprint,
  boardId,
  onSprintSaved,
  tasks,
  teamSize
}) => {
  const { user } = useAppSelector(state => state.auth);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  const isEditing = !!sprint;
  const isActiveSprint = sprint?.status === 'active';
  const isCompletedSprint = sprint?.status === 'completed';

  // Form state with enhanced fields
  const [sprintForm, setSprintForm] = useState<CreateSprintForm & { risks: string[] }>({
    sprintNumber: 1,
    name: '',
    goals: [],
    keyFeatures: [],
    risks: [],
    bottlenecks: [],
    duration: 14,
    estimatedWorkHoursPerWeek: 40,
    teamCapacityPerWeek: 200,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    holidays: []
  });

  const [newGoal, setNewGoal] = useState('');
  const [newFeature, setNewFeature] = useState('');
  const [newRisk, setNewRisk] = useState('');
  const [newBottleneck, setNewBottleneck] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const navigate = useNavigate();

  // Load sprint data when editing
  useEffect(() => {
    if (sprint) {
      setSprintForm({
        sprintNumber: sprint.sprintNumber,
        name: sprint.name,
        goals: sprint.goals,
        keyFeatures: sprint.keyFeatures,
        risks: (sprint as any).risks || [],
        bottlenecks: sprint.bottlenecks,
        duration: sprint.duration,
        estimatedWorkHoursPerWeek: sprint.estimatedWorkHoursPerWeek,
        teamCapacityPerWeek: (sprint as any).teamCapacityPerWeek || 200,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        holidays: sprint.holidays
      });
      setSelectedTasks(sprint.taskIds || []);
    }
  }, [sprint]);

  // Get unassigned tasks (only for new sprints or planning sprints)
  const unassignedTasks = tasks.filter(task => 
    !task.sprintId || (isEditing && task.sprintId === sprint?.id)
  );

  // Helper functions
  const handleFormChange = (field: keyof (CreateSprintForm & { risks: string[] }), value: any) => {
    setSprintForm(prev => ({ ...prev, [field]: value }));
  };

  const addToArray = (field: 'goals' | 'keyFeatures' | 'risks' | 'bottlenecks' | 'holidays', value: string) => {
    if (!value.trim()) return;
    
    setSprintForm(prev => ({
      ...prev,
      [field]: [...prev[field], value.trim()]
    }));

    // Clear input
    if (field === 'goals') setNewGoal('');
    if (field === 'keyFeatures') setNewFeature('');
    if (field === 'risks') setNewRisk('');
    if (field === 'bottlenecks') setNewBottleneck('');
  };

  const removeFromArray = (field: 'goals' | 'keyFeatures' | 'risks' | 'bottlenecks' | 'holidays', index: number) => {
    setSprintForm(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  // Calculate capacity
  const formCapacity = useMemo(() => {
    const selectedTasksPoints = tasks
      .filter(task => selectedTasks.includes(task.id))
      .reduce((sum, task) => sum + (task.points || 0), 0);

    const totalCapacity = sprintForm.teamCapacityPerWeek * (sprintForm.duration / 7);
    const holidayDays = sprintForm.holidays.length;
    const finalizedCapacity = Math.max(0, totalCapacity - (holidayDays * (sprintForm.teamCapacityPerWeek / 7)));
    
    const utilizationPercentage = finalizedCapacity > 0 
      ? (selectedTasksPoints * 6) / finalizedCapacity * 100
      : 0;

    return {
      estimatedCapacity: Math.round(totalCapacity),
      finalizedCapacity: Math.round(finalizedCapacity),
      selectedTasksPoints,
      capacityUtilization: Math.round(utilizationPercentage * 10) / 10
    };
  }, [sprintForm, selectedTasks, tasks]);

  // Save function
  const handleSave = async () => {
    if (!user) return;
    
    setSaveStatus('saving');
    try {
      if (isEditing && sprint) {
        // Update existing sprint
        const updates = {
          name: sprintForm.name,
          goals: sprintForm.goals,
          keyFeatures: sprintForm.keyFeatures,
          risks: sprintForm.risks,
          bottlenecks: sprintForm.bottlenecks,
          duration: sprintForm.duration,
          estimatedWorkHoursPerWeek: sprintForm.estimatedWorkHoursPerWeek,
          teamCapacityPerWeek: sprintForm.teamCapacityPerWeek,
          startDate: sprintForm.startDate,
          endDate: sprintForm.endDate,
          holidays: sprintForm.holidays,
          totalStoryPoints: formCapacity.selectedTasksPoints,
          estimatedCapacity: formCapacity.estimatedCapacity,
          finalizedCapacity: formCapacity.finalizedCapacity,
          capacityUtilization: formCapacity.capacityUtilization,
          taskIds: selectedTasks
        };

        await sprintService.updateSprint(user.uid, boardId, sprint.id, updates);
        
        if (selectedTasks.length > 0) {
          await sprintService.assignTasksToSprint(user.uid, boardId, sprint.id, selectedTasks);
        }

        onSprintSaved({ ...sprint, ...updates });
      } else {
        // Create new sprint
        const sprintData: Omit<Sprint, 'id'> = {
          sprintNumber: sprintForm.sprintNumber,
          name: sprintForm.name || `Sprint ${sprintForm.sprintNumber}`,
          goals: sprintForm.goals,
          keyFeatures: sprintForm.keyFeatures,
          risks: sprintForm.risks,
          bottlenecks: sprintForm.bottlenecks,
          duration: sprintForm.duration,
          estimatedWorkHoursPerWeek: sprintForm.estimatedWorkHoursPerWeek,
          teamCapacityPerWeek: sprintForm.teamCapacityPerWeek,
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
        
        if (selectedTasks.length > 0) {
          await sprintService.assignTasksToSprint(user.uid, boardId, newSprint.id, selectedTasks);
        }

        onSprintSaved(newSprint);
      }
      
      setSaveStatus('saved');
      setTimeout(() => {
        onClose();
        setSaveStatus('idle');
      }, 1000);
    } catch (error) {
      console.error('Error saving sprint:', error);
      setSaveStatus('error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                {isEditing ? `Edit ${sprint?.name}` : 'Create New Sprint'}
              </h2>
              <p className="text-slate-600">
                {isActiveSprint ? 'Edit active sprint (limited fields)' : 
                 isCompletedSprint ? 'View completed sprint (read-only)' : 
                 'Plan capacity and assign tasks'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                saveStatus === 'saving' ? 'bg-yellow-500 animate-pulse' :
                saveStatus === 'saved' ? 'bg-green-500' : 
                saveStatus === 'error' ? 'bg-red-500' : 'bg-slate-300'
              }`}></div>
              <span className="text-sm text-slate-600">
                {saveStatus === 'saving' ? 'Saving...' :
                 saveStatus === 'saved' ? 'Saved' :
                 saveStatus === 'error' ? 'Error' : 'Ready'}
              </span>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Capacity Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-3 text-center">
              <div className="text-xl font-bold text-blue-600">{formCapacity.estimatedCapacity}h</div>
              <div className="text-xs text-blue-700">Estimated Capacity</div>
            </div>
            <div className="bg-green-50 rounded-lg border border-green-200 p-3 text-center">
              <div className="text-xl font-bold text-green-600">{formCapacity.finalizedCapacity}h</div>
              <div className="text-xs text-green-700">After Holidays</div>
            </div>
            <div className="bg-purple-50 rounded-lg border border-purple-200 p-3 text-center">
              <div className="text-xl font-bold text-purple-600">{formCapacity.selectedTasksPoints}</div>
              <div className="text-xs text-purple-700">Selected Points</div>
            </div>
            <div className="bg-orange-50 rounded-lg border border-orange-200 p-3 text-center">
              <div className={`text-xl font-bold ${
                formCapacity.capacityUtilization > 100 ? 'text-red-600' :
                formCapacity.capacityUtilization > 80 ? 'text-orange-600' : 'text-green-600'
              }`}>
                {formCapacity.capacityUtilization}%
              </div>
              <div className="text-xs text-orange-700">Utilization</div>
            </div>
          </div>

          {formCapacity.capacityUtilization > 100 && (
            <div className="mt-3 flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle size={14} className="text-red-600" />
              <span className="text-sm text-red-700">Over capacity! Consider reducing scope or extending timeline.</span>
            </div>
          )}
        </div>

        {/* Form Content */}
        <div className="p-6 space-y-6">
          {/* Basic Details */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Basic Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Sprint Number</label>
                <input
                  type="number"
                  value={sprintForm.sprintNumber}
                  onChange={(e) => handleFormChange('sprintNumber', parseInt(e.target.value) || 1)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                  disabled={isEditing}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Sprint Name</label>
                <input
                  type="text"
                  value={sprintForm.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  placeholder={`Sprint ${sprintForm.sprintNumber}`}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isCompletedSprint}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Duration (days)</label>
                <input
                  type="number"
                  value={sprintForm.duration}
                  onChange={(e) => handleFormChange('duration', parseInt(e.target.value) || 14)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                  max="30"
                  disabled={isActiveSprint || isCompletedSprint}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Team Capacity/Week (hrs)</label>
                <input
                  type="number"
                  value={sprintForm.teamCapacityPerWeek}
                  onChange={(e) => handleFormChange('teamCapacityPerWeek', parseInt(e.target.value) || 200)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                  disabled={isCompletedSprint}
                />
              </div>
            </div>
          </div>

          {/* Planning Sections */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Sprint Planning</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sprint Goals */}
              <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                <h4 className="font-semibold text-blue-800 mb-3">Sprint Goals</h4>
                {!isCompletedSprint && (
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={newGoal}
                      onChange={(e) => setNewGoal(e.target.value)}
                      placeholder="Add a sprint goal..."
                      className="flex-1 p-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      onKeyPress={(e) => e.key === 'Enter' && addToArray('goals', newGoal)}
                    />
                    <button
                      onClick={() => addToArray('goals', newGoal)}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      Add
                    </button>
                  </div>
                )}
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {sprintForm.goals.map((goal, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                      <span className="text-sm">{goal}</span>
                      {!isCompletedSprint && (
                        <button
                          onClick={() => removeFromArray('goals', index)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Sprint Risks */}
              <div className="bg-red-50 rounded-lg border border-red-200 p-4">
                <h4 className="font-semibold text-red-800 mb-3">Sprint Risks</h4>
                {!isCompletedSprint && (
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={newRisk}
                      onChange={(e) => setNewRisk(e.target.value)}
                      placeholder="Identify potential risks..."
                      className="flex-1 p-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                      onKeyPress={(e) => e.key === 'Enter' && addToArray('risks', newRisk)}
                    />
                    <button
                      onClick={() => addToArray('risks', newRisk)}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                    >
                      Add
                    </button>
                  </div>
                )}
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {sprintForm.risks.map((risk, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                      <span className="text-sm">{risk}</span>
                      {!isCompletedSprint && (
                        <button
                          onClick={() => removeFromArray('risks', index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Main Features */}
              <div className="bg-green-50 rounded-lg border border-green-200 p-4">
                <h4 className="font-semibold text-green-800 mb-3">Main Features</h4>
                {!isCompletedSprint && (
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      placeholder="Key features to deliver..."
                      className="flex-1 p-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                      onKeyPress={(e) => e.key === 'Enter' && addToArray('keyFeatures', newFeature)}
                    />
                    <button
                      onClick={() => addToArray('keyFeatures', newFeature)}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      Add
                    </button>
                  </div>
                )}
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {sprintForm.keyFeatures.map((feature, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                      <span className="text-sm">{feature}</span>
                      {!isCompletedSprint && (
                        <button
                          onClick={() => removeFromArray('keyFeatures', index)}
                          className="text-green-600 hover:text-green-800"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 p-6 rounded-b-xl">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {isCompletedSprint ? 'Close' : 'Cancel'}
            </button>
            {!isCompletedSprint && (
              <button
                onClick={handleSave}
                disabled={sprintForm.goals.length === 0 || saveStatus === 'saving'}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save size={16} />
                {saveStatus === 'saving' ? 'Saving...' : isEditing ? 'Update Sprint' : 'Create Sprint'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SprintModal;