export const getTimeBasedGreeting = (date = new Date()) => {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) {
    return {
      greeting: 'Good Morning',
      logoutMessage: 'Good bye, have a good day!'
    };
  }
  if (hour >= 12 && hour < 18) {
    return {
      greeting: 'Good Afternoon',
      logoutMessage: 'Good bye, have a good afternoon!'
    };
  }
  return {
    greeting: 'Good Evening',
    logoutMessage: 'Good bye, rest well!'
  };
};
