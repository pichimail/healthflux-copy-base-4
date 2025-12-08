import Dashboard from './pages/Dashboard';
import Onboarding from './pages/Onboarding';
import Profiles from './pages/Profiles';
import Documents from './pages/Documents';
import Vitals from './pages/Vitals';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Onboarding": Onboarding,
    "Profiles": Profiles,
    "Documents": Documents,
    "Vitals": Vitals,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};