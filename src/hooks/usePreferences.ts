import { useState, useCallback, useEffect } from 'react';

interface Preferences {
  name?: string;
  username?: string;
  profile_picture?: string;
  theme?: string;
}

const PREFERENCES_KEY = 'corner_preferences';

const defaultPreferences: Preferences = {
  name: '',
  username: '',
  profile_picture: '',
  theme: 'system'
};

const getStoredPreferences = (): Preferences => {
  try {
    const storedPreferences = localStorage.getItem(PREFERENCES_KEY);
    if (storedPreferences) {
      return JSON.parse(storedPreferences);
    }
  } catch (error) {
    console.error('Failed to load preferences:', error);
  }
  return defaultPreferences;
};

// Add event listener for storage changes
const preferenceChangeListeners = new Set<() => void>();

window.addEventListener('storage', (event) => {
  if (event.key === PREFERENCES_KEY) {
    preferenceChangeListeners.forEach(listener => listener());
  }
});

export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences>(getStoredPreferences);

  // Listen for changes in other tabs/windows
  useEffect(() => {
    const updateFromStorage = () => {
      const newPreferences = getStoredPreferences();
      setPreferences(newPreferences);
    };

    preferenceChangeListeners.add(updateFromStorage);
    return () => {
      preferenceChangeListeners.delete(updateFromStorage);
    };
  }, []);

  const updatePreferences = useCallback(async (updates: Partial<Preferences>): Promise<boolean> => {
    try {
      const currentPreferences = getStoredPreferences();
      const newPreferences = {
        ...currentPreferences,
        ...updates
      };
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(newPreferences));
      setPreferences(newPreferences);
      return true;
    } catch (error) {
      console.error('Failed to update preferences:', error);
      return false;
    }
  }, []);

  return {
    preferences,
    updatePreferences
  };
}
