import { StorySpace } from './models';

export type ViewState = 'DASHBOARD' | 'SPACE_DETAIL' | 'SETTINGS' | 'MEMORIES';

export interface AppState {
  view: ViewState;
  activeSpaceId: string | null;
  spaces: StorySpace[];
  showCreateModal: boolean;
}

