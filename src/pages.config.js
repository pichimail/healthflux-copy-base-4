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
import EmergencyProfile from './pages/EmergencyProfile';
import AdminUsers from './pages/AdminUsers';
import AdminPackages from './pages/AdminPackages';
import AdminNotifications from './pages/AdminNotifications';
import AdminRoles from './pages/AdminRoles';
import Settings from './pages/Settings';
import WellnessInsights from './pages/WellnessInsights';
import SymptomChecker from './pages/SymptomChecker';
import HealthTrends from './pages/HealthTrends';
import MealLogging from './pages/MealLogging';
import Analytics from './pages/Analytics';
import FamilySharing from './pages/FamilySharing';
import Wearables from './pages/Wearables';
import FamilyProfiles from './pages/FamilyProfiles';
import Insurance from './pages/Insurance';
import OnboardingDocUpload from './pages/OnboardingDocUpload';
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
    "EmergencyProfile": EmergencyProfile,
    "AdminUsers": AdminUsers,
    "AdminPackages": AdminPackages,
    "AdminNotifications": AdminNotifications,
    "AdminRoles": AdminRoles,
    "Settings": Settings,
    "WellnessInsights": WellnessInsights,
    "SymptomChecker": SymptomChecker,
    "HealthTrends": HealthTrends,
    "MealLogging": MealLogging,
    "Analytics": Analytics,
    "FamilySharing": FamilySharing,
    "Wearables": Wearables,
    "FamilyProfiles": FamilyProfiles,
    "Insurance": Insurance,
    "OnboardingDocUpload": OnboardingDocUpload,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};