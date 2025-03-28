import { useState, useEffect } from 'react';

export function useLocalStorageState(initialState, key) {
  const [value, setValue] = useState(function () {
    const storedWatched = JSON.parse(localStorage.getItem(key));
    return storedWatched ? storedWatched : initialState;
  });

  useEffect(
    function () {
      localStorage.setItem(key, JSON.stringify(value));
    },
    [value, key]
  );

  return [value, setValue];
}
