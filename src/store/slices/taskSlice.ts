// store/slices/tasksSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Task, TasksState } from '../types/types';
import { taskService } from '../../services/taskService';

const initialState: TasksState = {
  tasks: [],
  loading: false,
  error: null,
  selectedTask: null,
};

export const fetchTasks = createAsyncThunk(
  'tasks/fetchTasks',
  async ({ userId, boardId }: { userId: string; boardId: string }) => {
    return await taskService.fetchBoardTasks(userId, boardId);
  }
);

export const createTask = createAsyncThunk(
  'tasks/createTask',
  async ({ userId, boardId, taskData }: { 
    userId: string; 
    boardId: string; 
    taskData: Omit<Task, 'id' | 'boardId'> 
  }) => {
    return await taskService.createTask(userId, boardId, taskData);
  }
);

export const updateTask = createAsyncThunk(
  'tasks/updateTask',
  async ({ userId, boardId, taskId, updates }: { 
    userId: string; 
    boardId: string; 
    taskId: string; 
    updates: Partial<Task> 
  }) => {
    await taskService.updateTask(userId, boardId, taskId, updates);
    return { taskId, updates };
  }
);

export const deleteTask = createAsyncThunk(
  'tasks/deleteTask',
  async ({ userId, boardId, taskId }: { 
    userId: string; 
    boardId: string; 
    taskId: string 
  }) => {
    await taskService.deleteTask(userId, boardId, taskId);
    return taskId;
  }
);

export const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setTasks: (state, action: PayloadAction<Task[]>) => {
      state.tasks = action.payload;
    },
    setSelectedTask: (state, action: PayloadAction<Task | null>) => {
      state.selectedTask = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateTaskStatus: (state, action: PayloadAction<{ taskId: string; status: string }>) => {
      const { taskId, status } = action.payload;
      const taskIndex = state.tasks.findIndex(t => t.id === taskId);
      if (taskIndex !== -1) {
        state.tasks[taskIndex].status = status;
      }
      if (state.selectedTask?.id === taskId) {
        state.selectedTask.status = status;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks = action.payload;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch tasks';
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.tasks.push(action.payload);
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        const { taskId, updates } = action.payload;
        const taskIndex = state.tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
          state.tasks[taskIndex] = { ...state.tasks[taskIndex], ...updates };
        }
        if (state.selectedTask?.id === taskId) {
          state.selectedTask = { ...state.selectedTask, ...updates };
        }
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.tasks = state.tasks.filter(t => t.id !== action.payload);
        if (state.selectedTask?.id === action.payload) {
          state.selectedTask = null;
        }
      });
  },
});

export const { setTasks, setSelectedTask, clearError, updateTaskStatus } = tasksSlice.actions;