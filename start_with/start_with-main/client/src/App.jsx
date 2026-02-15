import { Route, Routes } from 'react-router-dom'

import RegisterOwner from './components/hr/RegisterHr.jsx'
import ProfileHr from './components/hr/ProfileHr.jsx';
import GIntegrationSuccess from './components/hr/GIntegrationSuccess.jsx';
import { LoginHr } from './components/hr/LoginHr.jsx';
import MainPage from './components/MainPage/MainPage.jsx';
import UpdatedProfile from './components/hr/UpdatedProfile.jsx';
import Schedule from './components/Schedule/Schedule.jsx';
import SessionsHistory from './components/hr/SessionsHistory.jsx';


function App() {

    return (
        <Routes>
            <Route path="*" element={<><h1 className='flex justify-center'>404 Not Found</h1></>} />

            <Route path="/r/o" element={<RegisterOwner />} />
            <Route path="/l/o" element={<LoginHr />} />
            <Route path="/p/o/:id" element={<ProfileHr />} />
            {/* <Route path="/p/:id" element={<UpdatedProfile />} /> */}
            <Route path="/integrations" element={<GIntegrationSuccess />} />
            {/* <Route path="/" element={<MainPage />} /> */}
            <Route path="/" element={<MainPage_divert />} />
            <Route path="/schedule" element={<Schedule />} />
            {/* <Route path="/sessions-history/:id" element={<SessionsHistory />} /> */}
        </Routes>
    );
}

const MainPage_divert = () => {
    const divert_to_main = () => {
        if (window.location.pathname === '/') {
            window.location.href = 'https://startwith.co';
        }
    }
    divert_to_main();
    return null;
}

export default App
