import { configureStore } from "@reduxjs/toolkit";
import databaseReducer from "./slices/databaseSlice";

export const store = configureStore({
  reducer: {
    database: databaseReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
