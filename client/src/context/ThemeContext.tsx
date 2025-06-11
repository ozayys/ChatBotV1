import React from 'react';

// Theme context type
interface ThemeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

// Creating context with default values
export const ThemeContext = React.createContext<ThemeContextType>({
  darkMode: false,
  toggleDarkMode: () => {}
}); 