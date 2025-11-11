import SimpleLogin from './components/SimpleLogin';

export const routes = {
  '/login': SimpleLogin,
  '/': SimpleLogin, // Show login on home page too
  '/dashboard': () => import('./components/Dashboard'), // Your main app
};
