// store/slices/boardsSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Board, BoardsState } from '../types/types';
import { boardService } from '../../services/boardService';
import { serializeFirebaseData } from '../../utils/serialization';

const initialState: BoardsState = {
  boards: [],
  currentBoard: null,
  loading: false,
  error: null,
};

export const fetchBoards = createAsyncThunk(
  'boards/fetchBoards',
  async ({ userId, userEmail }: { userId: string; userEmail?: string }) => {
    const boards = await boardService.fetchUserBoards(userId, userEmail);
    return serializeFirebaseData(boards);
  }
);

export const createBoard = createAsyncThunk(
  'boards/createBoard',
  async ({ userId, boardData }: { userId: string; boardData: Omit<Board, 'id'> }) => {
    const board = await boardService.createBoard(userId, boardData);
    return serializeFirebaseData(board);
  }
);

export const fetchBoard = createAsyncThunk(
  'boards/fetchBoard',
  async ({ userId, boardId }: { userId: string; boardId: string }) => {
    const board = await boardService.fetchBoard(userId, boardId);
    return serializeFirebaseData(board);
  }
);

export const updateBoard = createAsyncThunk(
  'boards/updateBoard',
  async ({ userId, boardId, updates }: { 
    userId: string; 
    boardId: string; 
    updates: Partial<Board> 
  }) => {
    await boardService.updateBoard(userId, boardId, updates);
    return { boardId, updates: serializeFirebaseData(updates) };
  }
);

export const deleteBoard = createAsyncThunk(
  'boards/deleteBoard',
  async ({ userId, boardId }: { userId: string; boardId: string }) => {
    await boardService.deleteBoard(userId, boardId);
    return boardId;
  }
);

export const boardsSlice = createSlice({
  name: 'boards',
  initialState,
  reducers: {
    setCurrentBoard: (state, action: PayloadAction<Board | null>) => {
      state.currentBoard = action.payload ? serializeFirebaseData(action.payload) : null;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateCurrentBoardStatuses: (state, action: PayloadAction<string[]>) => {
      if (state.currentBoard) {
        state.currentBoard.statuses = action.payload;
      }
    },
    updateCurrentBoardCollaborators: (state, action: PayloadAction<any[]>) => {
      if (state.currentBoard) {
        state.currentBoard.collaborators = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBoards.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBoards.fulfilled, (state, action) => {
        state.loading = false;
        state.boards = action.payload;
      })
      .addCase(fetchBoards.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch boards';
      })
      .addCase(createBoard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createBoard.fulfilled, (state, action) => {
        state.loading = false;
        state.boards.push(action.payload);
      })
      .addCase(createBoard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create board';
      })
      .addCase(fetchBoard.fulfilled, (state, action) => {
        state.currentBoard = action.payload;
      })
      .addCase(updateBoard.fulfilled, (state, action) => {
        const { boardId, updates } = action.payload;
        const boardIndex = state.boards.findIndex(b => b.id === boardId);
        if (boardIndex !== -1) {
          state.boards[boardIndex] = { ...state.boards[boardIndex], ...updates };
        }
        if (state.currentBoard?.id === boardId) {
          state.currentBoard = { ...state.currentBoard, ...updates };
        }
      })
      .addCase(deleteBoard.fulfilled, (state, action) => {
        state.boards = state.boards.filter(b => b.id !== action.payload);
        if (state.currentBoard?.id === action.payload) {
          state.currentBoard = null;
        }
      });
  },
});

export const { 
  setCurrentBoard, 
  clearError, 
  updateCurrentBoardStatuses, 
  updateCurrentBoardCollaborators 
} = boardsSlice.actions;
