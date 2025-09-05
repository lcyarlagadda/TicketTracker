
// store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { authSlice } from './slices/authSlice';
import { boardsSlice } from './slices/boardSlice';
import { tasksSlice } from './slices/taskSlice';
import { sprintSlice } from './slices/sprintSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    boards: boardsSlice.reducer,
    tasks: tasksSlice.reducer,
    sprints: sprintSlice.reducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['boards/setCurrentBoard', 'tasks/setTasks'],
        ignoredPaths: ['boards.currentBoard.createdAt', 'tasks.tasks'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;