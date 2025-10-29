import { Route, BrowserRouter as Router, Routes } from 'react-router-dom'

import RegisterOwner from './components/hr/RegisterHr.jsx'
import ProfileHr from './components/hr/ProfileHr.jsx';
import GIntegrationSuccess from './components/hr/GIntegrationSuccess.jsx';
import { LoginHr } from './components/hr/LoginHr.jsx';

function App() {

    return (
        <Router>
            <Routes>
                <Route path="*" element={<><h1 className='flex justify-center'>404 Not Found</h1></>} />

                <Route path="/r/o" element={<RegisterOwner />} />
                <Route path="/l/o" element={<LoginHr />} />
                <Route path="/p/o/:id" element={<ProfileHr />} />
                <Route path="/integrations" element={<GIntegrationSuccess />} />

            </Routes>
        </Router>
    );
}


export default App
