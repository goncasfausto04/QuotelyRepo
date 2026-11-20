// Shared form styles for the Analyze tab.
export const fieldCls =
  "w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500";

export const primaryBtn = (disabled) =>
  `w-full py-3 px-4 rounded-lg font-semibold transition ${
    disabled ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"
  }`;
