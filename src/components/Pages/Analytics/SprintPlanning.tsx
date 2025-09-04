// components/Analytics/SprintPlanning.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Target, Clock, Users, Plus, Save, Edit3, X, CheckCircle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../../hooks/redux';
import { updateBoard } from '../../../store/slices/boardSlice';
import { Task, Board, SprintPlanningData } from '../../../store/types/types';

interface SprintPlanningProps {
  board: Board & { sprintPlanningData?: SprintPlanningData };
  tasks: Task[];
}

const SprintPlanning: React.FC<SprintPlanningProps> = ({ board, tasks }) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  
  const [planningData, setPlanningData] = useState<SprintPlanningData>(
    board.sprintPlanningData || {
      goals: [],
      features: [],
      totalStoryPoints: 0,
      estimatedWorkingHours: 0,
      sprintDuration: 0,
      teamCapacity: 0,
      sprintStartDate: new Date().toISOString().split('T')[0],
      sprintEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      sprintObjective: '',
      riskAssessment: '',
      lastUpdated: new Date().toISOString()
    }
  );

  const [newGoal, setNewGoal] = useState('');
  const [newFeature, setNewFeature] = useState('');
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showFeatureForm, setShowFeatureForm] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Calculate metrics from tasks
  const sprintMetrics = useMemo(() => {
    const getTaskPoints = (task: Task): number => {
      if ((task as any).points) return (task as any).points;
      return task.priority === 'High' ? 8 : task.priority === 'Medium' ? 5 : 3;
    };

    const totalStoryPoints = tasks.reduce((sum, task) => sum + getTaskPoints(task), 0);
    const completedTasks = tasks.filter(t => t.status === 'Done' || t.status === 'done');
    const completedPoints = completedTasks.reduce((sum, task) => sum + getTaskPoints(task), 0);
    
    const estimatedHoursPerPoint = 6;
    const totalEstimatedHours = totalStoryPoints * estimatedHoursPerPoint;
    
    const teamMembers = [...new Set(tasks.map(t => t.assignedTo).filter(Boolean))];
    
    return {
      totalStoryPoints,
      completedPoints,
      totalEstimatedHours,
      teamMembers: teamMembers.length,
      averagePointsPerTask: tasks.length > 0 ? (totalStoryPoints / tasks.length).toFixed(1) : '0',
      completionPercentage: totalStoryPoints > 0 ? ((completedPoints / totalStoryPoints) * 100).toFixed(1) : '0'
    };
  }, [tasks]);

  // Auto-save planning data
  const savePlanningData = async () => {
    if (!user || !board.id) return;
    
    setSaveStatus('saving');
    try {
      await dispatch(updateBoard({
        userId: user.uid,
        boardId: board.id,
        updates: {
          sprintPlanningData: {
            ...planningData,
            totalStoryPoints: sprintMetrics.totalStoryPoints,
            estimatedWorkingHours: sprintMetrics.totalEstimatedHours,
            lastUpdated: new Date().toISOString()
          }
        }
      })).unwrap();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
      console.error('Error saving sprint planning data:', error);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (planningData.goals.length > 0 || planningData.features.length > 0 || planningData.sprintObjective) {
        savePlanningData();
      }
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [planningData]);

  const addGoal = () => {
    if (newGoal.trim()) {
      setPlanningData(prev => ({
        ...prev,
        goals: [...prev.goals, newGoal.trim()]
      }));
      setNewGoal('');
      setShowGoalForm(false);
    }
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setPlanningData(prev => ({
        ...prev,
        features: [...prev.features, newFeature.trim()]
      }));
      setNewFeature('');
      setShowFeatureForm(false);
    }
  };

  const removeGoal = (index: number) => {
    setPlanningData(prev => ({
      ...prev,
      goals: prev.goals.filter((_, i) => i !== index)
    }));
  };

  const removeFeature = (index: number) => {
    setPlanningData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-6">
      {/* Sprint Overview */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Sprint Planning</h2>
            <p className="text-slate-600">Plan and organize your sprint goals, features, and capacity</p>
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
               saveStatus === 'error' ? 'Error' : 'Auto-save enabled'}
            </span>
          </div>
        </div>

        {/* Sprint Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
            <div className="flex items-center gap-3">
              <Target size={20} className="text-blue-600" />
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Story Points</p>
                <p className="text-2xl font-bold text-blue-800">{sprintMetrics.totalStoryPoints}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg border border-green-200 p-4">
            <div className="flex items-center gap-3">
              <Clock size={20} className="text-green-600" />
              <div>
                <p className="text-sm text-green-600 font-medium">Estimated Hours</p>
                <p className="text-2xl font-bold text-green-800">{sprintMetrics.totalEstimatedHours}h</p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 rounded-lg border border-purple-200 p-4">
            <div className="flex items-center gap-3">
              <Users size={20} className="text-purple-600" />
              <div>
                <p className="text-sm text-purple-600 font-medium">Team Members</p>
                <p className="text-2xl font-bold text-purple-800">{sprintMetrics.teamMembers}</p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg border border-orange-200 p-4">
            <div className="flex items-center gap-3">
              <CheckCircle size={20} className="text-orange-600" />
              <div>
                <p className="text-sm text-orange-600 font-medium">Progress</p>
                <p className="text-2xl font-bold text-orange-800">{sprintMetrics.completionPercentage}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sprint Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sprint Details */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Sprint Configuration</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Sprint Objective</label>
              <textarea
                value={planningData.sprintObjective}
                onChange={(e) => setPlanningData(prev => ({ ...prev, sprintObjective: e.target.value }))}
                placeholder="What is the main objective for this sprint?"
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={planningData.sprintStartDate}
                  onChange={(e) => setPlanningData(prev => ({ ...prev, sprintStartDate: e.target.value }))}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={planningData.sprintEndDate}
                  onChange={(e) => setPlanningData(prev => ({ ...prev, sprintEndDate: e.target.value }))}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Sprint Duration (days)</label>
                <input
                  type="number"
                  value={planningData.sprintDuration}
                  onChange={(e) => setPlanningData(prev => ({ ...prev, sprintDuration: parseInt(e.target.value) || 14 }))}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                  max="30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Team Capacity (hours/week)</label>
                <input
                  type="number"
                  value={planningData.teamCapacity}
                  onChange={(e) => setPlanningData(prev => ({ ...prev, teamCapacity: parseInt(e.target.value) || 40 }))}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Risk Assessment */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Risk Assessment</h3>
          
          <textarea
            value={planningData.riskAssessment}
            onChange={(e) => setPlanningData(prev => ({ ...prev, riskAssessment: e.target.value }))}
            placeholder="Identify potential risks, dependencies, and mitigation strategies..."
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            rows={8}
          />
          
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Consider:</strong> External dependencies, team availability, technical challenges, 
              unclear requirements, third-party integrations, and resource constraints.
            </p>
          </div>
        </div>
      </div>

      {/* Goals and Features */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sprint Goals */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Sprint Goals</h3>
            <button
              onClick={() => setShowGoalForm(!showGoalForm)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {showGoalForm ? <X size={16} /> : <Plus size={16} />}
              {showGoalForm ? 'Cancel' : 'Add Goal'}
            </button>
          </div>

          {showGoalForm && (
            <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <input
                type="text"
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                placeholder="Enter a sprint goal..."
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-3"
                onKeyPress={(e) => e.key === 'Enter' && addGoal()}
              />
              <div className="flex gap-2">
                <button
                  onClick={addGoal}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Goal
                </button>
                <button
                  onClick={() => setShowGoalForm(false)}
                  className="px-4 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {planningData.goals.length > 0 ? (
              planningData.goals.map((goal, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-3">
                    <Target size={16} className="text-blue-600" />
                    <span className="text-slate-800">{goal}</span>
                  </div>
                  <button
                    onClick={() => removeGoal(index)}
                    className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Target size={32} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm">No goals defined yet</p>
                <p className="text-xs text-slate-400">Add your first sprint goal</p>
              </div>
            )}
          </div>
        </div>

        {/* Key Features */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Key Features</h3>
            <button
              onClick={() => setShowFeatureForm(!showFeatureForm)}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              {showFeatureForm ? <X size={16} /> : <Plus size={16} />}
              {showFeatureForm ? 'Cancel' : 'Add Feature'}
            </button>
          </div>

          {showFeatureForm && (
            <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <input
                type="text"
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                placeholder="Enter a key feature..."
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-3"
                onKeyPress={(e) => e.key === 'Enter' && addFeature()}
              />
              <div className="flex gap-2">
                <button
                  onClick={addFeature}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Add Feature
                </button>
                <button
                  onClick={() => setShowFeatureForm(false)}
                  className="px-4 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {planningData.features.length > 0 ? (
              planningData.features.map((feature, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-3">
                    <CheckCircle size={16} className="text-green-600" />
                    <span className="text-slate-800">{feature}</span>
                  </div>
                  <button
                    onClick={() => removeFeature(index)}
                    className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500">
                <CheckCircle size={32} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm">No features defined yet</p>
                <p className="text-xs text-slate-400">Add your first key feature</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Capacity Planning */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Capacity Planning</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
            <h4 className="font-medium text-blue-800 mb-2">Total Commitment</h4>
            <div className="text-2xl font-bold text-blue-900">{sprintMetrics.totalStoryPoints} points</div>
            <div className="text-sm text-blue-600">{sprintMetrics.totalEstimatedHours} estimated hours</div>
          </div>
          
          <div className="bg-green-50 rounded-lg border border-green-200 p-4">
            <h4 className="font-medium text-green-800 mb-2">Team Capacity</h4>
            <div className="text-2xl font-bold text-green-900">{planningData.teamCapacity * sprintMetrics.teamMembers}h</div>
            <div className="text-sm text-green-600">{planningData.teamCapacity}h/week × {sprintMetrics.teamMembers} members</div>
          </div>
          
          <div className="bg-orange-50 rounded-lg border border-orange-200 p-4">
            <h4 className="font-medium text-orange-800 mb-2">Capacity Utilization</h4>
            <div className="text-2xl font-bold text-orange-900">
              {((sprintMetrics.totalEstimatedHours / (planningData.teamCapacity * sprintMetrics.teamMembers)) * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-orange-600">
              {sprintMetrics.totalEstimatedHours > planningData.teamCapacity * sprintMetrics.teamMembers ? 'Over capacity' : 'Within capacity'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SprintPlanning;