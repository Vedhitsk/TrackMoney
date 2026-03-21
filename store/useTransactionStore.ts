import { create } from "zustand";

import type { Account, Category, Transaction, TransactionDraft } from "@/types";

type TransactionStoreState = {
  categories: Category[];
  loadingCategories: boolean;

  accounts: Account[];
  loadingAccounts: boolean;

  pendingTransactions: Transaction[];
  loadingPendingTransactions: boolean;

  allTransactions: Transaction[];
  loadingAllTransactions: boolean;

  currentTransaction: Transaction | null;
  loadingCurrentTransaction: boolean;

  draft: TransactionDraft | null;

  loadCategories: () => Promise<void>;
  loadAccounts: () => Promise<void>;
  refreshPendingTransactions: () => Promise<void>;
  refreshAllTransactions: () => Promise<void>;
  loadTransactionById: (id: number) => Promise<void>;

  createDraft: (input: Omit<TransactionDraft, "id">) => void;
  setDraftField: <K extends keyof TransactionDraft>(key: K, value: TransactionDraft[K]) => void;
  setDraft: (draft: TransactionDraft | null) => void;
};

export const useTransactionStore = create<TransactionStoreState>((set, get) => ({
  categories: [],
  loadingCategories: false,

  accounts: [],
  loadingAccounts: false,

  pendingTransactions: [],
  loadingPendingTransactions: false,

  allTransactions: [],
  loadingAllTransactions: false,

  currentTransaction: null,
  loadingCurrentTransaction: false,

  draft: null,

  loadCategories: async () => {
    const { listCategories } = await import("@/db/queries/categories");
    set({ loadingCategories: true });
    try {
      const categories = await listCategories();
      set({ categories });
    } finally {
      set({ loadingCategories: false });
    }
  },

  loadAccounts: async () => {
    const { listAccounts } = await import("@/db/queries/accounts");
    set({ loadingAccounts: true });
    try {
      const accounts = await listAccounts();
      set({ accounts });
    } finally {
      set({ loadingAccounts: false });
    }
  },

  refreshPendingTransactions: async () => {
    const { listPendingTransactions } = await import("@/db/queries/transactions");
    set({ loadingPendingTransactions: true });
    try {
      const pendingTransactions = await listPendingTransactions();
      set({ pendingTransactions });
    } finally {
      set({ loadingPendingTransactions: false });
    }
  },

  refreshAllTransactions: async () => {
    const { listAllTransactions } = await import("@/db/queries/transactions");
    set({ loadingAllTransactions: true });
    try {
      const allTransactions = await listAllTransactions();
      set({ allTransactions });
    } finally {
      set({ loadingAllTransactions: false });
    }
  },

  loadTransactionById: async (id) => {
    const { getTransactionById } = await import("@/db/queries/transactions");
    set({ loadingCurrentTransaction: true });
    try {
      const tx = await getTransactionById(id);
      set({ currentTransaction: tx });
      if (tx) {
        const draft: TransactionDraft = {
          id: tx.id,
          rawAmount: tx.rawAmount,
          actualAmount: tx.actualAmount,
          isShared: tx.isShared,
          type: tx.type,
          categoryId: tx.categoryId,
          accountId: tx.accountId,
          toAccountId: tx.toAccountId,
          merchant: tx.merchant,
          notes: tx.notes,
          date: tx.date,
          source: tx.source,
          isExcluded: tx.isExcluded,
        };
        set({ draft });
      } else {
        set({ draft: null });
      }
    } finally {
      set({ loadingCurrentTransaction: false });
    }
  },

  createDraft: (input) => {
    set({ draft: input });
  },

  setDraftField: (key, value) => {
    const current = get().draft;
    if (!current) return;
    set({ draft: { ...current, [key]: value } });
  },

  setDraft: (draft) => set({ draft }),
}));
