import Dashboard from './pages/Dashboard';
import Onboarding from './pages/Onboarding';
import Profiles from './pages/Profiles';
import Documents from './pages/Documents';
import Vitals from './pages/Vitals';
import Medications from './pages/Medications';
import Trends from './pages/Trends';
import LabResults from './pages/LabResults';
import Insights from './pages/Insights';
import Share from './pages/Share';
import PublicShare from './pages/PublicShare';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import Demo from './pages/Demo';
import AIAssistant from './pages/AIAssistant';
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
    "Insights": Insights,
    "Share": Share,
    "PublicShare": PublicShare,
    "AdminLogin": AdminLogin,
    "AdminDashboard": AdminDashboard,
    "Demo": Demo,
    "AIAssistant": AIAssistant,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};