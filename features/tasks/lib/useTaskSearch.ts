import { useCallback, useState } from 'react';
import { Keyboard } from 'react-native';
import { useFocusEffect } from 'expo-router';

export function useTaskSearch() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const hasSearch = searchQuery.trim().length > 0;

  const toggleSearch = useCallback(() => setSearchOpen((prev) => !prev), []);
  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    Keyboard.dismiss();
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => closeSearch();
    }, [closeSearch])
  );

  return {
    searchOpen,
    searchQuery,
    setSearchQuery,
    hasSearch,
    toggleSearch,
    closeSearch,
  };
}
