import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OverviewMetrics {
  totalLeads: number;
  connectedAccountsCount: number;
  activeAccountsCount: number;
  campaignsCount: number;
  sentCount: number;
  acceptedCount: number;
  repliedCount: number;
  meetingsBooked: number;
  acceptRate: number;
  replyRate: number;
  dailyCap: number;
}

export interface OverviewTask {
  id: string;
  name: string;
  title: string;
  company: string;
  photo: string;
  profileUrl: string;
  message: string;
  done: boolean;
}

export interface WorkspaceMemberPayload {
  id: string;
  name: string;
  email: string;
  image: string | null;
  jobTitle: string;
  role: "Owner" | "Admin" | "Member" | "Viewer";
  status: "Active" | "Joined" | "Pending";
  isOwner: boolean;
  isCurrentUser: boolean;
  invitedAt: string;
  connectedAccountsCount: number;
  totalAccountsCount: number;
}

export interface WorkspaceSettingsPayload {
  workspaceName?: string;
  defaultDailyCap?: number;
  timezone?: string;
  workingHours?: string;
  workspaces?: Array<{
    id: string;
    name: string;
    plan: string;
    leads: string;
    isCurrent?: boolean;
  }>;
  profile?: Partial<{
    fullName: string;
    email: string;
    image: string | null;
    jobTitle: string;
    companyName: string;
    companyWebsite: string;
    offer: string;
  }>;
  members?: WorkspaceMemberPayload[];
  stats?: Partial<{
    totalLeads: number;
    totalCampaigns: number;
    connectedAccounts: number;
    activeAccounts: number;
  }>;
}

export interface RawLeadPayload {
  id: string;
  _id?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  name?: string;
  jobTitle?: string;
  title?: string;
  company?: string;
  location?: string;
  industry?: string;
  group?: string;
  tags?: string[];
  email?: string;
  linkedinUrl?: string;
  icpScore?: number;
  source?: string;
  status?: string;
  campaign?: string;
  notes?: string;
}

export interface LeadListItem extends RawLeadPayload {
  pipeline?: string;
  campaigns?: Array<{ campaignId: string; state: string }>;
}

export interface CampaignPayload {
  id: string;
  name: string;
  status: "Active" | "Paused" | "Draft";
  sender: string;
  leadsCount: number;
  sentCount: number;
  acceptRate: number;
  replyRate: number;
  variantA: number;
  variantB: number;
}

export interface CampaignDetailPayload {
  id: string;
  name: string;
  status: string;
  dailyCap: number;
  sentToday: number;
  remainingToday: number;
  failedCount?: number;
  steps?: { type: "connect" | "wait" | "message"; delayDays: number; template: string }[];
  funnel: { stage: string; count: number }[];
}

export interface ConnectedAccountPayload {
  id: string;
  name: string;
  headline: string;
  type: string;
  photo: string;
  status: "Active" | "Expired" | "Disconnected";
  connectedDate: string;
  usedToday: number;
  dailyCap: number;
  warmupStage: number;
}

interface SafeConnectionApiItem {
  id: string;
  linkedinName: string;
  linkedinAvatar: string;
  status: "active" | "expired" | "revoked";
  lastVerifiedAt: string | null;
}

export interface DatabaseState {
  overview: {
    loaded: boolean;
    loading: boolean;
    metrics: OverviewMetrics;
    tasks: OverviewTask[];
  };
  settings: {
    loaded: boolean;
    loading: boolean;
    data: WorkspaceSettingsPayload | null;
  };
  leads: {
    loaded: boolean;
    loading: boolean;
    items: RawLeadPayload[];
  };
  campaigns: {
    loaded: boolean;
    loading: boolean;
    items: CampaignPayload[];
    availableLeadsCount: number;
    availableAccountsCount: number;
    detailsById: Record<string, CampaignDetailPayload>;
  };
  accounts: {
    loaded: boolean;
    loading: boolean;
    items: ConnectedAccountPayload[];
  };
}

const DEFAULT_METRICS: OverviewMetrics = {
  totalLeads: 0,
  connectedAccountsCount: 0,
  activeAccountsCount: 0,
  campaignsCount: 0,
  sentCount: 0,
  acceptedCount: 0,
  repliedCount: 0,
  meetingsBooked: 0,
  acceptRate: 0,
  replyRate: 0,
  dailyCap: 25,
};

const initialState: DatabaseState = {
  overview: {
    loaded: false,
    loading: false,
    metrics: DEFAULT_METRICS,
    tasks: [],
  },
  settings: {
    loaded: false,
    loading: false,
    data: null,
  },
  leads: {
    loaded: false,
    loading: false,
    items: [],
  },
  campaigns: {
    loaded: false,
    loading: false,
    items: [],
    availableLeadsCount: 0,
    availableAccountsCount: 0,
    detailsById: {},
  },
  accounts: {
    loaded: false,
    loading: false,
    items: [],
  },
};

// ─── Helper Mapper ──────────────────────────────────────────────────────────

export function mapSafeAccountToConnected(account: SafeConnectionApiItem): ConnectedAccountPayload {
  return {
    id: account.id,
    name: account.linkedinName,
    headline: "LinkedIn profile",
    type: "LinkedIn Session",
    photo: account.linkedinAvatar,
    status:
      account.status === "active"
        ? "Active"
        : account.status === "expired"
        ? "Expired"
        : "Disconnected",
    connectedDate: account.lastVerifiedAt
      ? new Date(account.lastVerifiedAt).toLocaleDateString()
      : "Not verified",
    usedToday: 0,
    dailyCap: 25,
    warmupStage: 1,
  };
}

// ─── Async Thunks (Only call DB if not yet loaded or force=true) ────────────

export const fetchOverviewIfNeeded = createAsyncThunk<
  { metrics: OverviewMetrics; tasks: OverviewTask[] },
  { force?: boolean } | void
>(
  "database/fetchOverview",
  async () => {
    const res = await fetch("/api/dashboard/overview");
    const data = await res.json();
    if (!res.ok || !data?.success) {
      throw new Error(data?.error || "Failed to fetch dashboard overview");
    }
    return {
      metrics: (data.metrics || DEFAULT_METRICS) as OverviewMetrics,
      tasks: (Array.isArray(data.tasks) ? data.tasks : []) as OverviewTask[],
    };
  },
  {
    condition: (arg, { getState }) => {
      const { database } = getState() as { database: DatabaseState };
      if (arg && arg.force) return true;
      if (database.overview.loaded || database.overview.loading) return false;
      return true;
    },
  }
);

export const fetchWorkspaceSettingsIfNeeded = createAsyncThunk<
  WorkspaceSettingsPayload,
  { force?: boolean } | void
>(
  "database/fetchWorkspaceSettings",
  async () => {
    const res = await fetch("/api/workspace/settings");
    const data = await res.json();
    if (!res.ok || !data?.success || !data.settings) {
      throw new Error(data?.error || "Failed to load workspace settings");
    }
    return data.settings as WorkspaceSettingsPayload;
  },
  {
    condition: (arg, { getState }) => {
      const { database } = getState() as { database: DatabaseState };
      if (arg && arg.force) return true;
      if (database.settings.loaded || database.settings.loading) return false;
      return true;
    },
  }
);

export const fetchLeadsIfNeeded = createAsyncThunk<
  RawLeadPayload[],
  { force?: boolean } | void
>(
  "database/fetchLeads",
  async () => {
    const res = await fetch("/api/leads");
    const data = await res.json();
    if (!res.ok || !data?.success) {
      throw new Error(data?.error || "Failed to load leads");
    }
    const items: RawLeadPayload[] = Array.isArray(data.leads) ? data.leads : [];
    return items;
  },
  {
    condition: (arg, { getState }) => {
      const { database } = getState() as { database: DatabaseState };
      if (arg && arg.force) return true;
      if (database.leads.loaded || database.leads.loading) return false;
      return true;
    },
  }
);

export const fetchCampaignsIfNeeded = createAsyncThunk<
  {
    campaigns: CampaignPayload[];
    availableLeadsCount: number;
    availableAccountsCount: number;
  },
  { force?: boolean } | void
>(
  "database/fetchCampaigns",
  async () => {
    const res = await fetch("/api/campaigns");
    const data = await res.json();
    if (!res.ok || !data?.success) {
      throw new Error(data?.error || "Failed to load campaigns");
    }
    return {
      campaigns: (Array.isArray(data.campaigns) ? data.campaigns : []) as CampaignPayload[],
      availableLeadsCount:
        typeof data.availableLeadsCount === "number" ? data.availableLeadsCount : 0,
      availableAccountsCount:
        typeof data.availableAccountsCount === "number" ? data.availableAccountsCount : 0,
    };
  },
  {
    condition: (arg, { getState }) => {
      const { database } = getState() as { database: DatabaseState };
      if (arg && arg.force) return true;
      if (database.campaigns.loaded || database.campaigns.loading) return false;
      return true;
    },
  }
);

export const fetchAccountsIfNeeded = createAsyncThunk<
  ConnectedAccountPayload[],
  { force?: boolean } | void
>(
  "database/fetchAccounts",
  async () => {
    const res = await fetch("/api/linkedin/accounts");
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || "Failed to load LinkedIn accounts");
    }
    const accounts: SafeConnectionApiItem[] = Array.isArray(data?.accounts)
      ? data.accounts
      : [];
    return accounts.map(mapSafeAccountToConnected);
  },
  {
    condition: (arg, { getState }) => {
      const { database } = getState() as { database: DatabaseState };
      if (arg && arg.force) return true;
      if (database.accounts.loaded || database.accounts.loading) return false;
      return true;
    },
  }
);

// ─── Slice ──────────────────────────────────────────────────────────────────

const databaseSlice = createSlice({
  name: "database",
  initialState,
  reducers: {
    // Overview mutations
    setOverviewTasks(state, action: PayloadAction<OverviewTask[]>) {
      state.overview.tasks = action.payload;
    },
    toggleOverviewTaskDone(state, action: PayloadAction<string>) {
      state.overview.tasks = state.overview.tasks.map((t) =>
        t.id === action.payload ? { ...t, done: !t.done } : t
      );
    },

    // Workspace & Settings mutations
    setWorkspaceSettingsData(state, action: PayloadAction<WorkspaceSettingsPayload>) {
      state.settings.data = action.payload;
      state.settings.loaded = true;
      if (typeof action.payload.defaultDailyCap === "number") {
        state.overview.metrics.dailyCap = action.payload.defaultDailyCap;
      }
    },

    // Leads mutations
    setLeadsState(state, action: PayloadAction<RawLeadPayload[]>) {
      state.leads.items = action.payload;
      state.leads.loaded = true;
      state.overview.metrics.totalLeads = action.payload.length;
      state.campaigns.availableLeadsCount = action.payload.length;
      if (state.settings.data?.stats) {
        state.settings.data.stats.totalLeads = action.payload.length;
      }
    },
    clearLeadsState(state) {
      state.leads.items = [];
      state.leads.loaded = true;
      state.overview.metrics.totalLeads = 0;
      state.overview.tasks = [];
      state.campaigns.availableLeadsCount = 0;
      if (state.settings.data?.stats) {
        state.settings.data.stats.totalLeads = 0;
      }
    },
    invalidateLeadsCache(state) {
      state.leads.loaded = false;
      state.overview.loaded = false;
    },

    // Campaigns mutations
    updateCampaignStatusState(
      state,
      action: PayloadAction<{ id: string; status: "Active" | "Paused" | "Draft" }>
    ) {
      state.campaigns.items = state.campaigns.items.map((c) =>
        c.id === action.payload.id ? { ...c, status: action.payload.status } : c
      );
      const activeCount = state.campaigns.items.filter((c) => c.status === "Active").length;
      state.overview.metrics.campaignsCount = activeCount;
    },
    setCampaignDetailState(state, action: PayloadAction<CampaignDetailPayload>) {
      state.campaigns.detailsById[action.payload.id] = action.payload;
    },
    invalidateCampaignsCache(state) {
      state.campaigns.loaded = false;
      state.overview.loaded = false;
    },

    // LinkedIn Accounts mutations
    setAccountsState(state, action: PayloadAction<ConnectedAccountPayload[]>) {
      state.accounts.items = action.payload;
      state.accounts.loaded = true;
      state.overview.metrics.connectedAccountsCount = action.payload.length;
      state.overview.metrics.activeAccountsCount = action.payload.filter(
        (a) => a.status === "Active"
      ).length;
      if (state.settings.data?.stats) {
        state.settings.data.stats.connectedAccounts = action.payload.length;
        state.settings.data.stats.activeAccounts = action.payload.filter(
          (a) => a.status === "Active"
        ).length;
      }
    },
    upsertAccountState(state, action: PayloadAction<ConnectedAccountPayload>) {
      const idx = state.accounts.items.findIndex((a) => a.id === action.payload.id);
      if (idx >= 0) {
        state.accounts.items[idx] = action.payload;
      } else {
        state.accounts.items.unshift(action.payload);
      }
      state.overview.metrics.connectedAccountsCount = state.accounts.items.length;
      state.overview.metrics.activeAccountsCount = state.accounts.items.filter(
        (a) => a.status === "Active"
      ).length;
    },
    removeAccountState(state, action: PayloadAction<string>) {
      state.accounts.items = state.accounts.items.filter((a) => a.id !== action.payload);
      state.overview.metrics.connectedAccountsCount = state.accounts.items.length;
      state.overview.metrics.activeAccountsCount = state.accounts.items.filter(
        (a) => a.status === "Active"
      ).length;
    },
  },
  extraReducers: (builder) => {
    // Overview
    builder
      .addCase(fetchOverviewIfNeeded.pending, (state) => {
        state.overview.loading = true;
      })
      .addCase(fetchOverviewIfNeeded.fulfilled, (state, action) => {
        state.overview.loading = false;
        state.overview.loaded = true;
        state.overview.metrics = action.payload.metrics;
        state.overview.tasks = action.payload.tasks;
      })
      .addCase(fetchOverviewIfNeeded.rejected, (state) => {
        state.overview.loading = false;
      });

    // Settings
    builder
      .addCase(fetchWorkspaceSettingsIfNeeded.pending, (state) => {
        state.settings.loading = true;
      })
      .addCase(fetchWorkspaceSettingsIfNeeded.fulfilled, (state, action) => {
        state.settings.loading = false;
        state.settings.loaded = true;
        state.settings.data = action.payload;
      })
      .addCase(fetchWorkspaceSettingsIfNeeded.rejected, (state) => {
        state.settings.loading = false;
      });

    // Leads
    builder
      .addCase(fetchLeadsIfNeeded.pending, (state) => {
        state.leads.loading = true;
      })
      .addCase(fetchLeadsIfNeeded.fulfilled, (state, action) => {
        state.leads.loading = false;
        state.leads.loaded = true;
        state.leads.items = action.payload;
        state.overview.metrics.totalLeads = action.payload.length;
      })
      .addCase(fetchLeadsIfNeeded.rejected, (state) => {
        state.leads.loading = false;
      });

    // Campaigns
    builder
      .addCase(fetchCampaignsIfNeeded.pending, (state) => {
        state.campaigns.loading = true;
      })
      .addCase(fetchCampaignsIfNeeded.fulfilled, (state, action) => {
        state.campaigns.loading = false;
        state.campaigns.loaded = true;
        state.campaigns.items = action.payload.campaigns;
        state.campaigns.availableLeadsCount = action.payload.availableLeadsCount;
        state.campaigns.availableAccountsCount = action.payload.availableAccountsCount;
      })
      .addCase(fetchCampaignsIfNeeded.rejected, (state) => {
        state.campaigns.loading = false;
      });

    // Accounts
    builder
      .addCase(fetchAccountsIfNeeded.pending, (state) => {
        state.accounts.loading = true;
      })
      .addCase(fetchAccountsIfNeeded.fulfilled, (state, action) => {
        state.accounts.loading = false;
        state.accounts.loaded = true;
        state.accounts.items = action.payload;
        state.overview.metrics.connectedAccountsCount = action.payload.length;
      })
      .addCase(fetchAccountsIfNeeded.rejected, (state) => {
        state.accounts.loading = false;
      });
  },
});

export const {
  setOverviewTasks,
  toggleOverviewTaskDone,
  setWorkspaceSettingsData,
  setLeadsState,
  clearLeadsState,
  invalidateLeadsCache,
  updateCampaignStatusState,
  setCampaignDetailState,
  invalidateCampaignsCache,
  setAccountsState,
  upsertAccountState,
  removeAccountState,
} = databaseSlice.actions;

export default databaseSlice.reducer;
