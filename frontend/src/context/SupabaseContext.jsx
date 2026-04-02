// src/context/SupabaseContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const SupabaseContext = createContext(null);

export const SupabaseProvider = ({ children }) => {
  const [supabase, setSupabase] = useState(null);

  useEffect(() => {
    // Initialize Supabase.
    // The keys are public safe.
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (url && key) {
      const client = createClient(url, key);
      setSupabase(client);
    }
  }, []);

  return (
    <SupabaseContext.Provider value={supabase}>
      {children}
    </SupabaseContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSupabase = () => useContext(SupabaseContext);
