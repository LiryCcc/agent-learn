import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';
import { combineReducers } from 'redux';

type ColorThemeState = 'dark' | 'light';

type ConversationState = {
  activeConversationId: string | null;
};

const createInitialColorTheme = (): ColorThemeState => {
  return 'light';
};

const createInitialConversationState = (): ConversationState => {
  return {
    activeConversationId: null
  };
};

const colorThemeSlice = createSlice({
  name: 'colorTheme',
  initialState: createInitialColorTheme(),
  reducers: {
    colorThemeSet: (_state, action: PayloadAction<ColorThemeState>) => {
      return action.payload;
    }
  }
});

const conversationSlice = createSlice({
  name: 'conversation',
  initialState: createInitialConversationState(),
  reducers: {
    conversationSelected: (state, action: PayloadAction<string | null>) => {
      state.activeConversationId = action.payload;
    }
  }
});

export const { colorThemeSet } = colorThemeSlice.actions;
export const { conversationSelected } = conversationSlice.actions;

export const store = configureStore({
  reducer: combineReducers({
    colorTheme: colorThemeSlice.reducer,
    conversation: conversationSlice.reducer
  })
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppSelector = useSelector.withTypes<RootState>();
