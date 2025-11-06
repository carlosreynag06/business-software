// app/state-provider.tsx
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
  isSidebarOpen: boolean;
  // We can add more global state here later
};

// --- Actions ---
type Action = { type: 'TOGGLE_SIDEBAR' };

// --- Initial State ---
const initialState: AppState = {
  // Per the design doc, the sidebar is visible on desktop by default
  // but collapsed on tablet. We'll default to 'true' for desktop-first.
  isSidebarOpen: true,
};

// --- Reducer ---
const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'TOGGLE_SIDEBAR':
      return { ...state, isSidebarOpen: !state.isSidebarOpen };
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