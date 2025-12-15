'use client';

import React, {
  createContext,
  useContext,
  useReducer,
  useMemo,
  PropsWithChildren,
} from 'react';

// --- App State ---
type AppState = {
  // Business / Shared
  isSidebarOpen: boolean;
  isAIAssistantOpen: boolean;
  searchQuery: string;
  
  // Personal: Budget only (Shopping/Checklist removed)
  isAddExpenseModalOpen: boolean;
};

// --- Actions ---
type Action =
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'TOGGLE_AI_ASSISTANT' }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_EXPENSE_MODAL'; payload: boolean };

// --- Initial State ---
const initialState: AppState = {
  isSidebarOpen: true, // Desktop default
  isAIAssistantOpen: false,
  searchQuery: '',
  isAddExpenseModalOpen: false,
};

// --- Reducer ---
const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'TOGGLE_SIDEBAR':
      return { ...state, isSidebarOpen: !state.isSidebarOpen };
    case 'TOGGLE_AI_ASSISTANT':
      return { ...state, isAIAssistantOpen: !state.isAIAssistantOpen };
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    case 'SET_EXPENSE_MODAL':
      return { ...state, isAddExpenseModalOpen: action.payload };
    default:
      return state;
  }
};

// --- Context & Provider ---
const AppStateContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function AppStateProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

// --- Custom Hook ---
export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}