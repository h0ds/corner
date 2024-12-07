import { useState, useCallback, useEffect } from 'react';

interface Preferences {
  name: string | null;
  profile_picture: string | null;
  theme: string | null;
}

const PREFERENCES_KEY = 'corner_preferences';

const getStoredPreferences = (): Preferences => {
  try {
    const storedPreferences = localStorage.getItem(PREFERENCES_KEY);
    if (storedPreferences) {
      return JSON.parse(storedPreferences);
    }
  } catch (error) {
    console.error('Failed to load preferences:', error);
  }
  return {
    name: null,
    profile_picture: null,
    theme: null
  };
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

  const updatePreferences = useCallback(async (newPreferences: Partial<Preferences>) => {
    try {
      const updatedPreferences = { ...preferences, ...newPreferences };
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(updatedPreferences));
      setPreferences(updatedPreferences);
      
      // Dispatch storage event to notify other components
      window.dispatchEvent(new StorageEvent('storage', {
        key: PREFERENCES_KEY,
        newValue: JSON.stringify(updatedPreferences),
        storageArea: localStorage
      }));
      
      return true;
    } catch (error) {
      console.error('Failed to update preferences:', error);
      return false;
    }
  }, [preferences]);

  return {
    preferences,
    updatePreferences,
  };
}
