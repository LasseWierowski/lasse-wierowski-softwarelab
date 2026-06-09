import { configureStore } from '@reduxjs/toolkit';
import undoable, { excludeAction } from 'redux-undo';
import appReducer from './appSlice';

export const store = configureStore({
  reducer: undoable(appReducer, {
    filter: excludeAction('app/updateCameraPose'),
  }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;