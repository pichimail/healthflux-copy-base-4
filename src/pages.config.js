import Dashboard from './pages/Dashboard';
import Onboarding from './pages/Onboarding';
import Profiles from './pages/Profiles';
import Documents from './pages/Documents';
import Vitals from './pages/Vitals';
import Medications from './pages/Medications';
import Trends from './pages/Trends';
import LabResults from './pages/LabResults';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Onboarding": Onboarding,
    "Profiles": Profiles,
    "Documents": Documents,
    "Vitals": Vitals,
    "Medications": Medications,
    "Trends": Trends,
    "LabResults": LabResults,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};