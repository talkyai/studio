import { create } from 'zustand';
import { createSettingsSlice, SettingsSlice } from './slices/settingsSlice';
import { createServerSlice, ServerSlice } from './slices/serverSlice';
import { createChatSlice, ChatSlice } from './slices/chatSlice';
import { createProjectsSlice, ProjectsSlice } from './slices/projectsSlice';

export type ChatState = SettingsSlice & ServerSlice & ChatSlice & ProjectsSlice;

export const useChatStore = create<ChatState>()((set, get) => ({
  ...createSettingsSlice(set, get),
  ...createServerSlice(set, get),
  ...createChatSlice(set, get),
  ...createProjectsSlice(set, get),
}));