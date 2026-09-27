/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { MainDashboard } from './components/MainDashboard';
import { JarvisPopup } from './components/JarvisPopup';

export default function App() {
  // Check if opened as detached companion window (?mode=companion)
  const [isCompanionMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.location.search.includes('mode=companion');
    }
    return false;
  });

  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | undefined>(undefined);

  // Global keyboard shortcut: Ctrl+J or Cmd+J toggles the JARVIS popup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        if (!isPopupOpen) {
          setIsPopupOpen(true);
          setIsMinimized(false);
        } else if (isMinimized) {
          setIsMinimized(false);
        } else {
          setIsPopupOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPopupOpen, isMinimized]);

  // Open with specific prompt (from feature cards)
  const handleOpenWithPrompt = useCallback((prompt?: string) => {
    if (prompt) {
      setPendingPrompt(prompt);
    }
    setIsPopupOpen(true);
    setIsMinimized(false);
  }, []);

  // Standard open (always ensures unminimized window)
  const handleOpen = useCallback(() => {
    setIsPopupOpen(true);
    setIsMinimized(false);
  }, []);

  // Close completely
  const handleClose = useCallback(() => {
    setIsPopupOpen(false);
    setIsMinimized(false);
  }, []);

  // Minimize to JARVIS orb
  const handleMinimize = useCallback(() => {
    setIsMinimized(true);
  }, []);

  // Restore from JARVIS orb
  const handleRestore = useCallback(() => {
    setIsPopupOpen(true);
    setIsMinimized(false);
  }, []);

  const handlePromptConsumed = useCallback(() => {
    setPendingPrompt(undefined);
  }, []);

  // If this window was opened as a dedicated companion window (PiP / external companion)
  if (isCompanionMode) {
    return (
      <div className="w-screen h-screen bg-zinc-950 overflow-hidden">
        <JarvisPopup
          isOpen={true}
          isMinimized={false}
          onClose={() => window.close()}
          onOpen={() => {}}
          onMinimize={() => {}}
          onRestore={() => {}}
          isCompanionMode={true}
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-zinc-950">
      {/* Background Dashboard & Workspace */}
      <MainDashboard
        onOpenAssistant={handleOpenWithPrompt}
        isPopupOpen={isPopupOpen && !isMinimized}
      />

      {/* Floating / Pop-up Assistant Window */}
      <JarvisPopup
        isOpen={isPopupOpen}
        isMinimized={isMinimized}
        onClose={handleClose}
        onOpen={handleOpen}
        onMinimize={handleMinimize}
        onRestore={handleRestore}
        initialPrompt={pendingPrompt}
        onPromptConsumed={handlePromptConsumed}
      />
    </div>
  );
}
