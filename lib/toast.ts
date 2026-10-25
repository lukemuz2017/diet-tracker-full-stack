"use client";

import { useSyncExternalStore } from "react";

// One message at a time ("Added banana · Undo"), shown by <Toast /> in the
// layout so it survives moving from Add food to Today.

export interface ToastMessage {
  id: number;
  text: string;
  undo?: () => void;
}

let current: ToastMessage | null = null;
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function showToast(text: string, undo?: () => void) {
  current = { id: nextId++, text, undo };
  emit();
}

export function dismissToast(id: number) {
  if (current?.id === id) {
    current = null;
    emit();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useToast(): ToastMessage | null {
  return useSyncExternalStore(subscribe, () => current, () => null);
}

// Open modal pop-ups. While one is open, the page behind it is covered and
// inert, so the message shows inside the pop-up instead (components/Toast.tsx).
let modals = 0;
const modalListeners = new Set<() => void>();

export function modalShown(change: 1 | -1) {
  modals = Math.max(0, modals + change);
  for (const listener of modalListeners) listener();
}

function subscribeModals(listener: () => void) {
  modalListeners.add(listener);
  return () => modalListeners.delete(listener);
}

export function useModalOpen(): boolean {
  return useSyncExternalStore(subscribeModals, () => modals > 0, () => false);
}
