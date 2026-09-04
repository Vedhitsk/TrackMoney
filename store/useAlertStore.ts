import { create } from "zustand";

export type AppAlertButton = {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
};

type AlertState = {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AppAlertButton[];
  show: (title: string, message?: string, buttons?: AppAlertButton[]) => void;
  hide: () => void;
};

export const useAlertStore = create<AlertState>((set) => ({
  visible: false,
  title: "",
  message: undefined,
  buttons: [{ text: "OK" }],
  show: (title, message, buttons) =>
    set({ visible: true, title, message, buttons: buttons && buttons.length > 0 ? buttons : [{ text: "OK" }] }),
  hide: () => set({ visible: false }),
}));

/** Drop-in replacement for React Native's `Alert.alert`, styled to match the app. */
export function showAppAlert(title: string, message?: string, buttons?: AppAlertButton[]) {
  useAlertStore.getState().show(title, message, buttons);
}
