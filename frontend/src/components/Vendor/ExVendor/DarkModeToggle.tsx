import {useState, useEffect} from 'react';
import {BiMoon, BiSun} from 'react-icons/bi';

const DarkModeToggle: React.FC = () => {
  const [darkMode, setDarkMode] = useState<boolean>(
    localStorage.getItem('color-theme') === 'dark',
  );

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('color-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode((prevMode) => !prevMode);
  };

  return (
    <button
      onClick={toggleDarkMode}
      className="fixed bottom-5 left-5 flex h-16 w-16 items-center justify-center rounded-full bg-white text-white shadow-lg transition duration-300 dark:bg-graydark dark:text-yellow-400"
      aria-label="Toggle Dark Mode"
    >
      {darkMode ? (
        <BiMoon className="text-xl text-white" />
      ) : (
        <BiSun className="text-xl text-black" />
      )}
    </button>
  );
};
export default DarkModeToggle;
