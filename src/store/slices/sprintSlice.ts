// store/slices/sprintSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Sprint } from '../types/types';
import { sprintService } from '../../services/sprintService';

interface SprintState {
  sprints: Sprint[];
  currentSprint: Sprint | null;
  loading: boolean;
  error: string | null;
}

const initialState: SprintState = {
  sprints: [],
  currentSprint: null,
  loading: false,
  error: null,
};

export const fetchSprints = createAsyncThunk(
  'sprints/fetchSprints',
  async ({ userId, boardId }: { userId: string; boardId: string }) => {
    return await sprintService.fetchBoardSprints(userId, boardId);
  }
);

export const createSprint = createAsyncThunk(
  'sprints/createSprint',
  async ({ userId, boardId, sprintData }: { 
    userId: string; 
    boardId: string; 
    sprintData: Omit<Sprint, 'id'> 
  }) => {
    return await sprintService.createSprint(userId, boardId, sprintData);
  }
);

export const updateSprint = createAsyncThunk(
  'sprints/updateSprint',
  async ({ userId, boardId, sprintId, updates }: { 
    userId: string; 
    boardId: string; 
    sprintId: string; 
    updates: Partial<Sprint> 
  }) => {
    await sprintService.updateSprint(userId, boardId, sprintId, updates);
    return { sprintId, updates };
  }
);

export const deleteSprint = createAsyncThunk(
  'sprints/deleteSprint',
  async ({ userId, boardId, sprintId }: { 
    userId: string; 
    boardId: string; 
    sprintId: string 
  }) => {
    await sprintService.deleteSprint(userId, boardId, sprintId);
    return sprintId;
  }
);

export const assignTasksToSprint = createAsyncThunk(
  'sprints/assignTasksToSprint',
  async ({ userId, boardId, sprintId, taskIds }: { 
    userId: string; 
    boardId: string; 
    sprintId: string; 
    taskIds: string[] 
  }) => {
    await sprintService.assignTasksToSprint(userId, boardId, sprintId, taskIds);
    return { sprintId, taskIds };
  }
);

export const completeActiveSprint = createAsyncThunk(
  'sprints/completeActiveSprint',
  async ({ userId, boardId, sprintId }: { 
    userId: string; 
    boardId: string; 
    sprintId: string 
  }) => {
    return await sprintService.completeActiveSprint(userId, boardId, sprintId);
  }
);

export const sprintSlice = createSlice({
  name: 'sprints',
  initialState,
  reducers: {
    setSprints: (state, action: PayloadAction<Sprint[]>) => {
      state.sprints = action.payload;
    },
    setCurrentSprint: (state, action: PayloadAction<Sprint | null>) => {
      state.currentSprint = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearSprints: (state) => {
      state.sprints = [];
      state.currentSprint = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Sprints
      .addCase(fetchSprints.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSprints.fulfilled, (state, action) => {
        state.loading = false;
        state.sprints = action.payload;
        // Set current sprint to active one if exists
        const activeSprint = action.payload.find(s => s.status === 'active');
        if (activeSprint) {
          state.currentSprint = activeSprint;
        }
      })
      .addCase(fetchSprints.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch sprints';
      })

      // Create Sprint
      .addCase(createSprint.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createSprint.fulfilled, (state, action) => {
        state.loading = false;
        state.sprints.unshift(action.payload);
      })
      .addCase(createSprint.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create sprint';
      })

      // Update Sprint
      .addCase(updateSprint.fulfilled, (state, action) => {
        const { sprintId, updates } = action.payload;
        const sprintIndex = state.sprints.findIndex(s => s.id === sprintId);
        if (sprintIndex !== -1) {
          state.sprints[sprintIndex] = { ...state.sprints[sprintIndex], ...updates };
        }
        if (state.currentSprint?.id === sprintId) {
          state.currentSprint = { ...state.currentSprint, ...updates };
        }
      })

      // Delete Sprint
      .addCase(deleteSprint.fulfilled, (state, action) => {
        state.sprints = state.sprints.filter(s => s.id !== action.payload);
        if (state.currentSprint?.id === action.payload) {
          state.currentSprint = null;
        }
      })

      // Assign Tasks to Sprint
      .addCase(assignTasksToSprint.fulfilled, (state, action) => {
        const { sprintId, taskIds } = action.payload;
        const sprintIndex = state.sprints.findIndex(s => s.id === sprintId);
        if (sprintIndex !== -1) {
          state.sprints[sprintIndex].taskIds = taskIds;
        }
        if (state.currentSprint?.id === sprintId) {
          state.currentSprint.taskIds = taskIds;
        }
      })

      // Complete Active Sprint
      .addCase(completeActiveSprint.fulfilled, (state, action) => {
        const completedSprint = action.payload;
        const sprintIndex = state.sprints.findIndex(s => s.id === completedSprint.id);
        if (sprintIndex !== -1) {
          state.sprints[sprintIndex] = completedSprint;
        }
        // Clear current sprint since it's completed
        state.currentSprint = null;
      });
  },
});

export const { setSprints, setCurrentSprint, clearError, clearSprints } = sprintSlice.actions;

export default sprintSlice.reducer;