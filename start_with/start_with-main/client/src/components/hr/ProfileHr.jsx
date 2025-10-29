import { useEffect, useState } from 'react';
import API from '../../axios.config';
import { useContext } from "react";
import { SocketContext } from "../../socket/SocketProvider.jsx";
import { useNavigate } from 'react-router-dom';
import Switcher1 from '../ToggleButton.jsx';
import gemai from '../../assets/gemai.png';
import SparkleLoader from '../SparkleLoader.jsx';


const ProfileHr = () => {
    const [activePage, setActivePage] = useState('Home');
    const [profile, setProfile] = useState(null);
    const { isConnected } = useContext(SocketContext);
    const [socketConnected, setSocketConnected] = useState(false);
    const navigate = useNavigate()

    const [isChecked, setIsChecked] = useState(false)
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [sheetsNames, setSheetsName] = useState([])

    // This is a Job role for Content creator for Social media platform
    const [interviewForm, setInterviewForm] = useState({
        // company: '', // will be a dropdown, fetch all the companies of the owner and show them here
        recruiter: '', // will be a dropdown, fetch all the recruiters of the owner and show them here
        candidateSheetId: '', // will be a dynamic form, where owner can add multiple candidates
        jobPosition: '', // will be a text input
        jobDescription: '', // will be a text area
        duration: '', // will be a text input in minutes
        expiryDate: '', // will be a date picker
        minimumQualification: '', // will be a text input
        minimumSkillsRequired: '', // will be a text input
    })
    const [interviewQuestions, setInterviewQuestions] = useState(['']);

    const handleInterviewChange = (e) => {
        const { name, value } = e.target;
        setInterviewForm((prev) => ({ ...prev, [name]: value }));
    };

    const addotokendCandidate = () => {
        setInterviewForm((prev) => ({
            ...prev,
            otokendCandidates: [...(prev.otokendCandidates || []), { name: '', email: '', phone: '' }]
        }));
    };

    const removeotokendCandidate = (index) => {
        setInterviewForm((prev) => {
            const copy = [...(prev.otokendCandidates || [])];
            copy.splice(index, 1);
            return { ...prev, otokendCandidates: copy.length ? copy : [{ name: '', email: '', phone: '' }] };
        });
    };

    const handleotokendCandidateChange = (index, field, value) => {
        setInterviewForm((prev) => {
            const copy = [...(prev.otokendCandidates || [])];
            copy[index] = { ...copy[index], [field]: value };
            return { ...prev, otokendCandidates: copy };
        });
    };

    const createinterview = async () => {
        try {
            const payload = { ...interviewForm, questions: interviewQuestions };
            console.log('Create interview payload:', payload);

            const response = await API.post('/api/owner/create/interview', payload);
            console.log("interview created", response)
            console.log(response.data)
        } catch (error) {
            console.log("create interview error", error)
        }
    }

    const addInterviewQuestion = () => {
        setInterviewQuestions((prev) => [...prev, '']);
    };

    const removeInterviewQuestion = (index) => {
        setInterviewQuestions((prev) => {
            const copy = [...prev];
            copy.splice(index, 1);
            if (copy.length === 0) return [''];
            return copy;
        });
    };

    const handleInterviewQuestionChange = (index, value) => {
        setInterviewQuestions((prev) => {
            const copy = [...prev];
            copy[index] = value;
            return copy;
        });
    };

    async function connectGoogleSheets() {
        // const res = await fetch("/api/google/auth-url", { credentials: "include" });
        try {
            const res = await API.get("/api/google/auth-url");
            console.log("this is res", res)
            const json = await res.data;
            if (json.url) {
                // redirect the browser to Google consent page
                window.location.href = json.url;
                // console.log(json.url)
                // navigate(json.url)
            } else {
                alert("Failed to get Google auth url");
            }
        } catch (error) {
            console.log(error)
        }
    }

    async function enhanceWithAI() {
        try {
            if (interviewForm.jobDescription.trim() === '') {
                console.log("Job description is empty. Cannot enhance with AI.");
                return;
            }

            if (interviewForm.jobDescription.length < 20) {
                console.log("Job description is too short. Cannot enhance with AI.");
                return;
            }

            setIsEnhancing(true)

            const response = await API.post('/api/owner/enhance-job-description', {
                jobDescription: interviewForm.jobDescription

            });
            // console.log("Enhanced job description:", response.data.enhancedJobDescription)

            setInterviewForm((prev) => ({
                ...prev,
                jobDescription: response.data.enhancedJobDescription
            }));

            setIsEnhancing(false)
        } catch (error) {
            console.log("enhance with ai error: ", error)
        }
    }

    async function getSheetsNames() {
        try {
            const response = await API.get('/api/google/get-sheets-names');
            console.log(response.data);
            setSheetsName(response.data)
        } catch (error) {
            console.log("Error fetching Google Sheets names:", error);
        }
    }

    useEffect(() => {
        setSocketConnected(isConnected);
        console.log("Socket connection status changed:", isConnected);
    }, [isConnected]);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await API.get('/api/owner/profile');
                setProfile(response.data.owner);
                setIsChecked(response.data.owner.googleSheetsConnected);
                localStorage.setItem('umid', response.data.owner._id);
                // gsconn
                // const user_mongodb_id = localStorage.getItem('umid')
                const google_sheets_connected = localStorage.getItem('gsconn')
                if (google_sheets_connected == '1') {
                    setIsChecked(true)
                }
                // setCompanyList(response.data.owner.company)
                // setRecruiterList(response.data.owner.recrutier)
                console.log(response.data)
            } catch (error) {
                console.log("Error fetching profile:", error);
            }
        };
        fetchProfile();
    }, [])

    const [recruiterCreateWindow, setRecruiterCreateWindow] = useState(false);
    const [companyCreateWindow, setCompanyCreateWindow] = useState(false);
    const [interviewCreateWindow, setInterviewCreateWindow] = useState(false);

    const handleCheckboxChange = (e) => {
        setIsChecked(e.target.checked)
        // if the isChecked is false then only allow this\
        console.log(e.target.checked)
        if (e.target.checked) {
            connectGoogleSheets()
        }

    }

    return (
        <>
            {profile ? (
                <>
                    <div className='bg-gray-300 h-[100vh] w-full flex flex-col p-2 gap-2'>

                        <div className='navbar bg-white p-4 rounded-md shadow-md w-full h-fit flex justify-between items-center'>
                            <div className='font-bold text-xl pl-3 text-orange-500'>StartWith</div>
                            <div className='flex justify-center items-center'>
                                <div>
                                    <div className='px-3 py-2 rounded-md font-bold text-lg hover:scale-[98%] '>
                                        {socketConnected ? (<>
                                            <span onClick={connectGoogleSheets} className='flex items-center gap-2 bg-gray-300'>
                                                <div className='w-6 h-6 rounded-full bg-green-400'></div>
                                                Connected
                                            </span>
                                        </>) : (<>
                                            <span className='flex items-center gap-2'>
                                                <div className='w-6 h-6 rounded-full bg-red-400'></div>
                                                Disconnected
                                            </span>
                                        </>)}
                                    </div>
                                </div >
                                <div>

                                    <div
                                        onClick={() => {
                                            setInterviewCreateWindow(true);
                                            getSheetsNames();
                                        }}
                                        className='bg-orange-400 px-3 py-2 rounded-md text-white font-bold text-lg hover:scale-[98%] '>+ Create Interview</div>
                                </div >
                                <div className='w-10'><img src="https://www.reshot.com/preview-assets/icons/F3N5JXHBEG/user-F3N5JXHBEG.svg" alt="" /></div>
                            </div>
                        </div>


                        <div className=' w-full h-full flex gap-2'>
                            <div className='bg-white relative min-w-[200px] rounded-lg flex flex-col gap-1 p-1'>
                                <div onClick={() => setActivePage('Home')} className={`bg-orange-300/40 text-orange-500 px-4 py-3 text-lg rounded-md font-semibold cursor-pointer`}>Home</div>
                                <div onClick={() => setActivePage('Analytics')} className={`bg-orange-300/40 text-orange-500 px-4 py-3 text-lg rounded-md font-semibold cursor-pointer`}>Analytics</div>
                                <div onClick={() => setActivePage('Candidates')} className={`bg-orange-300/40 text-orange-500 px-4 py-3 text-lg rounded-md font-semibold cursor-pointer`}>Candidates</div>
                                <div onClick={() => setActivePage('Recruiters')} className={`bg-orange-300/40 text-orange-500 px-4 py-3 text-lg rounded-md font-semibold cursor-pointer`}>Recruiters</div>
                                <div onClick={() => setActivePage('Company')} className={`bg-orange-300/40 text-orange-500 px-4 py-3 text-lg rounded-md font-semibold cursor-pointer`}>Company</div>

                                <div className={`order left-0 w-[100%] p-1 border-black/30 absolute bottom-0 text-orange-500 text-lg font-normal`}>
                                    <div className='w-full rounded-md border-2  border-black/20'>
                                        <span className='text-black font-medium ml-1'>Connections</span>
                                        <hr className='border border-black/20' />
                                        <div className='bg p-2 text flex text-black justify-between'>
                                            <span >Google Sheet</span>
                                            <label className='flex cursor-pointer select-none items-center'>
                                                <div className='relative'>
                                                    <input
                                                        type='checkbox'
                                                        checked={isChecked}
                                                        onChange={handleCheckboxChange}
                                                        aria-checked={isChecked}
                                                        className='sr-only'
                                                    />

                                                    {/* track/background */}
                                                    <div className={`block h-6 w-10 rounded-full transition-colors duration-200 ${isChecked ? 'bg-orange-400' : 'bg-[#E5E7EB]'}`} />

                                                    {/* knob */}
                                                    <div
                                                        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 ${isChecked ? 'translate-x-6 ml-[-4px]' : 'translate-x-0 ml-1'}`}
                                                    />
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                    {/* Connect Google Sheet */}
                                </div>

                            </div>

                            <div className='bg-gray-100 w-full rounded-lg borer-2 border-orange-500'>


                                {/* home page start ------------------------------------------------------------------------ */}
                                {activePage == 'Home' &&
                                    <div className='HomePage h-full bg-re-500/60 p-3 rounded-lg flex flex-col gap-3'>
                                        <div className=''>
                                            <select className='bg-white border border-gray-300 rounded-md p-2 w-full'>
                                                <option>Select Interview</option>
                                                {/* map the interviews from a state */}
                                                {/* {interviews.map((interview) => (
                                                    <option key={interview.id} value={interview.id}>
                                                        {interview.title}
                                                    </option>
                                                ))} */}
                                            </select>
                                        </div>

                                        <div className='flex gap-3 flex-wrap'>
                                            <div className='relative min-w-[260px] flex justify-between w-fit text-b bg-gray-300 rounded-[5px] px-5 text-xl font-medium py-4 min-h-[120px] h-fit'>
                                                <div className='text-black/80 h-fit'>Links Opened</div>
                                                <div className='flex items-end pr-3 pb- text-3xl'>17%</div>
                                                <div className='absolute bottom-5 l-0 text-black/70 text-lg'>12/20</div>
                                            </div>
                                            <div className='min-w-[260px] flex justify-between w-fit text-b bg-gray-300 rounded-[5px] px-5 text-xl font-medium py-4 min-h-[120px] h-fit'>
                                                <div className='text-black/80'>Links Opened</div>
                                                <div className='bg-rd-200 flex items-end pr-3 pb-3 text-3xl'>17%</div>
                                            </div>
                                            <div className='min-w-[260px] flex justify-between w-fit text-b bg-gray-300 rounded-[5px] px-5 text-xl font-medium py-4 min-h-[120px] h-fit'>
                                                <div className='text-black/80'>Links Opened</div>
                                                <div className='bg-rd-200 flex items-end pr-3 pb-3 text-3xl'>17%</div>
                                            </div>
                                        </div>

                                    </div>
                                }
                                {/* home page end ------------------------------------------------------------------------ */}


                                {/* Analytics page start ------------------------------------------------------------------------ */}
                                {activePage == 'Analytics' &&
                                    <div className='AnalyticsPage h-full bg-re-500/60 p-3 rounded-lg flex flex-col gap-3'>
                                        <div className=''>
                                            <select className='bg-white border border-gray-300 rounded-md p-2 w-full'>
                                                <option>Select Interview</option>
                                                {/* map the interviews from a state */}
                                                {/* {interviews.map((interview) => (
                                                    <option key={interview.id} value={interview.id}>
                                                        {interview.title}
                                                    </option>
                                                ))} */}
                                            </select>
                                        </div>

                                        <div className='w-full bg-slate-200 p-6 h-full rounded-md flex flex-col gap-3'>
                                            {/* we will save this things in a state, and use map to show it */}
                                            {/* {current_leaderboard.map((interview) => (
                                                <div key={interview.id}>
                                                    <div className='text-black/90 text-xl'>{interview.id}.&nbsp;&nbsp;&nbsp;{interview.title}</div>
                                                    <div className='w-full border  border-black/10 '></div>
                                                </div>
                                            ))} */}
                                        </div>
                                    </div>
                                }
                                {/* Analytics page end ------------------------------------------------------------------------ */}


                                {/* Candidates page start ------------------------------------------------------------------------ */}
                                {activePage == 'Candidates' &&
                                    <div className='bg-slate-200 h-full w-full rounded-md p-1 flex gap-2'>
                                        <div className='min-w-[160px] h-full bg-rd-300'>
                                            <div className='bg-yello-300 flex justify-center p-3 text-xl font-semibold'>Interview List</div>
                                            <div
                                                style={{ scrollbarWidth: 'none' }}
                                                className='w-full h-fit bg-purple-300 flex flex-col g-1 p-1 overflow-y-scroll'>
                                                {/* {interviews.map((interview) => (
                                                    <div key={interview.id} className='border-b border-black/10 p-2 hover:bg-orange-300/40 cursor-pointer'>
                                                        {interview.title}
                                                    </div>
                                                ))} */}
                                            </div>
                                        </div>

                                        <div className='border border-black/20 my-3 rounded-full '></div> {/*seperation line*/}

                                        <div className='w-full h-full bg-geen-300 rounded-md p-3 flex flex-col gap-3'>
                                            <div className='text-2xl font-semibold text-black/80'>Candidates</div>
                                            <div className='w-full h-full bg-white rounded-md p-3 overflow-y-scroll flex flex-col gap-3'>
                                                {/* {candidates.map((candidate) => (
                                                    <div key={candidate.id} className='border-b border-black/10 p-2 hover:bg-orange-300/40 cursor-pointer flex justify-between'>
                                                        <div className='text-lg font-medium text-black/80'>{candidate.name}</div>
                                                        <div className='text-md text-black/60'>View Details</div>
                                                    </div>
                                                ))} */}
                                            </div>
                                        </div>

                                    </div>
                                }
                                {/* Candidates page end ------------------------------------------------------------------------ */}





                                {/* Recruiters page start ------------------------------------------------------------------------ */}
                                {activePage == 'Recruiters' &&
                                    <div className='bg-slate-200 h-full w-full rounded-md p-1 flex gap-2'>

                                        <div className='w-full h-full bg-geen-300 rounded-md p-3 flex flex-col gap-3'>
                                            <div className='text-2xl font-semibold text-black/80 flex justify-between items-center'>
                                                <div>Recrutiers</div>
                                                <div onClick={() => setRecruiterCreateWindow(true)} className='bg-orange-400 px-3 py-2 rounded-md text-white font-bold text-lg hover:scale-[98%] cursor-pointer'>+ Create Recrutier</div>
                                            </div>
                                            <div className='w-full h-full bg-white rounded-md p-3 overflow-y-scroll flex flex-col gap-3'>
                                                {/* {recruiterList && recruiterList.length > 0 ? (
                                                    recruiterList.map((candidate, idx) => (
                                                        <div key={idx} className='border-b border-black/10 p-2 hover:bg-orange-300/40 cursor-pointer flex justify-between'>
                                                            <div className='text-lg font-medium text-black/80'>{candidate.name}</div>
                                                            <div className='text-lg font-medium text-black/80'>{candidate.email}</div>
                                                            <div className='text-lg font-medium text-black/80'>{candidate.position}</div>
                                                            <div className='text-md text-black/60'>View Details</div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className='text-md text-black/40 text-center'>No recruiter yet</div>
                                                )} */}
                                            </div>
                                        </div>
                                    </div>
                                }
                                {/* Recruiters page end ------------------------------------------------------------------------ */}

                                {recruiterCreateWindow &&
                                    <div className='fixed inset-0 z-50 flex items-center justify-center'>
                                        <div onClick={() => setRecruiterCreateWindow(false)} className='absolute inset-0 bg-black/45 backdrop-blur-sm' />

                                        <div onClick={(e) => e.stopPropagation()} className='relative w-full max-w-2xl mx-4 bg-white rounded-xl shadow-2xl border border-orange-200 p-6'>
                                            <button aria-label='Close' onClick={() => setRecruiterCreateWindow(false)} className='absolute -top-3 -right-3 bg-white border border-gray-200 rounded-full p-2 shadow hover:scale-95'>
                                                <svg xmlns="http://www.w3.org/2000/svg" className='h-4 w-4 text-gray-700' viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                            </button>

                                            <div className='flex flex-col gap-4'>
                                                <div className='text-2xl font-semibold text-gray-800 mb-2'>Create Recruiter</div>
                                                <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                                                    <input name="name" value={recruiterForm.name} onChange={handleRecruiterChange} type="text" placeholder='Name' className='w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-orange-300' />
                                                    <input name="email" value={recruiterForm.email} onChange={handleRecruiterChange} type="email" placeholder='Email' className='w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-orange-300' />
                                                    <input name="phone" value={recruiterForm.phone} onChange={handleRecruiterChange} type="text" placeholder='Phone' className='w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-orange-300' />
                                                    <select
                                                        name="company"
                                                        value={recruiterForm.company}
                                                        onChange={handleRecruiterChange}
                                                        className='w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-orange-300'
                                                    >
                                                        <option value="">Select Company</option>
                                                        {companyList && companyList.length > 0 && companyList.map((company, idx) => (
                                                            <option key={company._id || company.id || idx} value={company._id || company.id}>{company.name}</option>
                                                        ))}
                                                    </select>
                                                    <input name="position" value={recruiterForm.position} onChange={handleRecruiterChange} type="text" placeholder='Position' className='w-full md:col-span-2 border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-orange-300' />
                                                </div>

                                                <div className='mt-5 flex items-center justify-end gap-3'>
                                                    <button type="button" onClick={createRecruiter} className='inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg font-semibold shadow'>
                                                        <svg xmlns="http://www.w3.org/2000/svg" className='h-4 w-4' viewBox="0 0 20 20" fill="currentColor">
                                                            <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" />
                                                        </svg>
                                                        Create
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                }


                                {activePage === 'Company' &&
                                    <div className='bg-slate-200 h-full w-full rounded-md p-1 flex gap-2'>
                                        <div className='w-full h-full bg-white rounded-md p-6 flex flex-col gap-4'>
                                            <div className='flex justify-between items-center mb-4'>
                                                <div className='text-2xl font-semibold text-black/80'>Companies</div>
                                                <button onClick={() => setCompanyCreateWindow(true)} className='bg-orange-400 px-4 py-2 rounded-md text-white font-bold text-lg hover:scale-[98%]'>
                                                    + Create Company
                                                </button>
                                            </div>
                                            <div className='flex flex-col gap-3'>
                                                {/* {companyList && companyList.length === 0 ? (
                                                    <div className='text-md text-black/40 text-center'>No companies yet</div>
                                                ) : (
                                                    companyList && companyList.map((company, idx) => (
                                                        <div key={idx} className='border-b border-black/10 p-3 hover:bg-orange-300/40 cursor-pointer flex justify-between'>
                                                            <div className='text-lg font-medium text-black/80'>{company.name}</div>
                                                            <div className='text-md text-black/60'>{company.location}</div>
                                                            <div className='text-md text-black/60'>View Details</div>
                                                        </div>
                                                    ))
                                                )} */}
                                            </div>
                                        </div>
                                    </div>
                                }

                                {companyCreateWindow &&
                                    <div className='fixed inset-0 z-50 flex items-center justify-center'>
                                        <div onClick={() => setCompanyCreateWindow(false)} className='absolute inset-0 bg-black/45 backdrop-blur-sm' />

                                        <div onClick={(e) => e.stopPropagation()} className='relative w-full max-w-2xl mx-4 bg-white rounded-xl shadow-2xl border border-orange-200 p-6'>
                                            <button aria-label='Close' onClick={() => setCompanyCreateWindow(false)} className='absolute -top-3 -right-3 bg-white border border-gray-200 rounded-full p-2 shadow hover:scale-95'>
                                                <svg xmlns="http://www.w3.org/2000/svg" className='h-4 w-4 text-gray-700' viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                            </button>

                                            <div className='flex flex-col gap-4'>
                                                <div className='text-2xl font-semibold text-gray-800 mb-2'>Create Company</div>
                                                <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                                                    <input
                                                        name="name"
                                                        value={companyForm.name}
                                                        onChange={handleCompanyChange}
                                                        type="text"
                                                        placeholder='Company Name'
                                                        className='w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-orange-300'
                                                    />
                                                    <input
                                                        name="location"
                                                        value={companyForm.location}
                                                        onChange={handleCompanyChange}
                                                        type="text"
                                                        placeholder='Location'
                                                        className='w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-orange-300'
                                                    />
                                                    <input
                                                        name="website"
                                                        value={companyForm.website}
                                                        onChange={handleCompanyChange}
                                                        type="text"
                                                        placeholder='Website'
                                                        className='w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-orange-300'
                                                    />
                                                    <input
                                                        name="size"
                                                        value={companyForm.size}
                                                        onChange={handleCompanyChange}
                                                        type="text"
                                                        placeholder='Company Size'
                                                        className='w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-orange-300'
                                                    />
                                                    <input
                                                        name="industry"
                                                        value={companyForm.industry}
                                                        onChange={handleCompanyChange}
                                                        type="text"
                                                        placeholder='Industry'
                                                        className='w-full md:col-span-2 border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-orange-300'
                                                    />
                                                </div>
                                                <div className='mt-5 flex items-center justify-end gap-3'>
                                                    <button type="button" onClick={createCompany} className='inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg font-semibold shadow'>
                                                        <svg xmlns="http://www.w3.org/2000/svg" className='h-4 w-4' viewBox="0 0 20 20" fill="currentColor">
                                                            <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" />
                                                        </svg>
                                                        Create
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                }

                                {interviewCreateWindow &&
                                    <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
                                        <div className='absolute inset-0 bg-black/45 backdrop-blur-sm' />

                                        <div className='relative w-full max-w-5xl bg-white rounded-xl shadow-2xl border border-orange-200 max-h-[90vh] overflow-hidden flex flex-col'>
                                            {/* Header */}
                                            <div className='flex items-center justify-between p-6 border-b border-gray-200'>
                                                <div>
                                                    <h2 className='text-2xl font-semibold text-gray-800'>Create Interview</h2>
                                                    <p className='text-sm text-gray-500 mt-1'>Fill in the details below to create a new interview</p>
                                                </div>
                                                <button aria-label='Close' className='bg-gray-100 hover:bg-gray-200 rounded-lg p-2 transition-colors'>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className='h-5 w-5 text-gray-600' viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                                {/* <Switcher1 /> */}

                                            </div>

                                            {/* Form Content */}
                                            <div className='flex-1 overflow-y-auto p-6'>
                                                <div className='space-y-6'>
                                                    {/* Basic Information */}
                                                    <div>
                                                        <h3 className='text-lg font-medium text-gray-900 mb-4'>Basic Information</h3>
                                                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                                            <div>
                                                                <label className='block text-sm font-medium text-gray-700 mb-2'>Company *</label>
                                                                <select name='company' value={interviewForm.company} 
                                                                // onChange={handleInterviewChange} 
                                                                className='w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white'>
                                                                    <option value=''>Select Company</option>
                                                                    {/* {companyList.map((c, i) => (
                                                                        <option key={c._id || i} value={c._id}>{c.name}</option>
                                                                    ))} */}
                                                                </select>
                                                            </div>

                                                            <div>
                                                                <label className='block text-sm font-medium text-gray-700 mb-2'>Launguage *</label>
                                                                <select name='recruiter' value={interviewForm.recruiter} onChange={handleInterviewChange} className='w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white'>
                                                                    <option value=''>Select Launguage</option>
                                                                    {/* {recruiterList.map((r, i) => (
                                                                        <option key={r._id || i} value={r._id}>{r.name}</option>
                                                                    ))} */}
                                                                    <option value="English">English</option>
                                                                    <option value="Hindi">Hindi</option>
                                                                </select>
                                                            </div>

                                                            <div>
                                                                <label className='block text-sm font-medium text-gray-700 mb-2'>Job Position *</label>
                                                                <input name='jobPosition' value={interviewForm.jobPosition} onChange={handleInterviewChange} placeholder='e.g. Senior Developer' className='w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent' />
                                                            </div>

                                                            <div>
                                                                <label className='block text-sm font-medium text-gray-700 mb-2'>Duration (minutes) *</label>
                                                                <input name='duration' type='number' value={interviewForm.duration} onChange={handleInterviewChange} placeholder='e.g. 60' className='w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent' />
                                                            </div>

                                                            <div className='md:col-span-2 relative'>
                                                                <label className='block text-sm font-medium text-gray-700 mb-2'>Job Description *</label>
                                                                <textarea name='jobDescription' value={interviewForm.jobDescription} onChange={handleInterviewChange} placeholder='Describe the role and responsibilities...' rows='4' className='w-full border border-gray-300 rounded-lg p-3 focus:outline-none transition-all duration-75 focus:border-2 focus:border-orange-500 resize-none' />
                                                                <div onClick={enhanceWithAI} className='underline text-orange-500  font-normal absolute top-[1px] right-3 flex hover:cursor-pointer'>
                                                                    <div className='' >
                                                                        <SparkleLoader isEnhancing={isEnhancing} />
                                                                    </div>
                                                                    {/* <img className='w-10 h-fit' src={gemai} alt="Enhance with AI" /> */}
                                                                    Enhance job description with AI
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Requirements */}
                                                    <div>
                                                        <h3 className='text-lg font-medium text-gray-900 mb-4'>Requirements</h3>
                                                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                                            <div>
                                                                <label className='block text-sm font-medium text-gray-700 mb-2'>Minimum Qualification</label>
                                                                <input name='minimumQualification' value={interviewForm.minimumQualification} onChange={handleInterviewChange} placeholder="e.g. Bachelor's Degree and 2 years of experience" className='w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent' />
                                                            </div>

                                                            <div>
                                                                <label className='block text-sm font-medium text-gray-700 mb-2'>Expiry Date</label>
                                                                <input name='expiryDate' type='date' value={interviewForm.expiryDate} onChange={handleInterviewChange} className='w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent' />
                                                            </div>

                                                            <div className='md:col-span-2'>
                                                                <label className='block text-sm font-medium text-gray-700 mb-2'>Required Skills</label>
                                                                <input name='minimumSkillsRequired' value={interviewForm.minimumSkillsRequired} onChange={handleInterviewChange} placeholder='e.g. React, Node.js, TypeScript' className='w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent' />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* otokend Candidates */}
                                                    <div className=''>
                                                        <div className='flex items-center justify-between mb-4'>
                                                            <div className='flex'>
                                                                <h3 className='text-lg font-medium text-gray-900'>Allowed Candidates</h3>

                                                                {/* <label className='flex cursor-pointer select-none items-center'>
                                                                    <div className='relative'>
                                                                        <input
                                                                            type='checkbox'
                                                                            checked={isChecked}
                                                                            onChange={handleCheckboxChange}
                                                                            aria-checked={isChecked}
                                                                            className='sr-only'
                                                                        />
                                                                        <div className={`block h-7 w-12 rounded-full transition-colors duration-200 ${isChecked ? 'bg-orange-400' : 'bg-[#E5E7EB]'}`} />
                                                                        <div
                                                                            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${isChecked ? 'translate-x-6' : 'translate-x-0 ml-1'}`}
                                                                        />
                                                                    </div>
                                                                </label> */}

                                                            </div>

                                                            {/* <button type='button' onClick={addotokendCandidate} className='text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1'>
                                                                <span className='text-lg'>+</span> Add Candidate
                                                            </button> */}
                                                        </div>

                                                        <div className='flex gap-3 items-start p-4 bg-gray-50 rounded-lg border border-gray-200'>
                                                            <select name='candidateSheetId' value={interviewForm.candidateSheetId} onChange={handleInterviewChange} className='w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white'>
                                                                <option value=''>Select Sheet</option>
                                                                {sheetsNames.map((r, i) => (
                                                                    <option key={r._id || i} value={r.id}>{r.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        {/* <div className='space-y-3'>
                                                            {(interviewForm.otokendCandidates || []).length === 0 ? (
                                                                <div className='text-center py-8 border-2 border-dashed border-gray-300 rounded-lg'>
                                                                    <p className='text-gray-500 text-sm'>No candidates added yet</p>
                                                                    <button type='button' onClick={addotokendCandidate} className='mt-2 text-orange-600 hover:text-orange-700 font-medium text-sm'>
                                                                        Add your first candidate
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                interviewForm.otokendCandidates.map((cand, idx) => (
                                                                    <div key={idx} className='flex gap-3 items-start p-4 bg-gray-50 rounded-lg border border-gray-200'>
                                                                        <div className='flex-1 grid grid-cols-1 md:grid-cols-3 gap-3'>
                                                                            <input className='border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent' placeholder='Name' value={cand.name} onChange={(e) => handleotokendCandidateChange(idx, 'name', e.target.value)} />
                                                                            <input className='border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent' placeholder='Email' value={cand.email} onChange={(e) => handleotokendCandidateChange(idx, 'email', e.target.value)} />
                                                                            <input className='border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent' placeholder='Phone' value={cand.phone} onChange={(e) => handleotokendCandidateChange(idx, 'phone', e.target.value)} />
                                                                        </div>
                                                                        <button type='button' onClick={() => removeotokendCandidate(idx)} className='text-red-500 hover:text-red-700 p-2'>
                                                                            <svg className='w-5 h-5' fill='currentColor' viewBox='0 0 20 20'>
                                                                                <path fillRule='evenodd' d='M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z' clipRule='evenodd' />
                                                                            </svg>
                                                                        </button>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div> */}
                                                    </div>

                                                    {/* Interview Questions */}
                                                    <div>
                                                        <div className='flex items-center justify-between mb-4'>
                                                            <h3 className='text-lg font-medium text-gray-900'>Interview Questions</h3>
                                                            <button type='button' onClick={addInterviewQuestion} className='text-sm bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors'>
                                                                Add Question
                                                            </button>
                                                        </div>
                                                        <div className='space-y-3'>
                                                            {interviewQuestions.map((q, idx) => (
                                                                <div key={idx} className='flex gap-3 items-center'>
                                                                    <span className='text-gray-500 font-medium min-w-[30px]'>{idx + 1}.</span>
                                                                    <input type='text' value={q} onChange={(e) => handleInterviewQuestionChange(idx, e.target.value)} placeholder={`Enter question ${idx + 1}`} className='flex-1 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent' />
                                                                    <button type='button' onClick={() => removeInterviewQuestion(idx)} className='text-gray-400 hover:text-red-600 p-2 transition-colors'>
                                                                        <svg className='w-5 h-5' fill='currentColor' viewBox='0 0 20 20'>
                                                                            <path fillRule='evenodd' d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z' clipRule='evenodd' />
                                                                        </svg>
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Footer */}
                                            <div className='flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50'>
                                                <button
                                                    onClick={() => { setInterviewCreateWindow(false) }}
                                                    type='button' className='px-6 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors'>
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={() => createinterview()}
                                                    type="button" className='px-6 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium shadow-sm transition-colors'>
                                                    Create Interview
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                }
                            </div>



                        </div>

                    </div>


                    {/* the create interview page start here -------------------------------------------------------------------- */}
                    {/* <div className='absolute top-0 p-20 bg-red-400 w-full h-full'>

                    </div> */}
                    {/* the create interview page end here -------------------------------------------------------------------- */}
                </>
            ) : (
                <div className='min-h-[60vh] flex h-[100vh] items-center justify-center bg-neutral-50'>
                    <div className='flex items-center gap-3'>
                        <svg className='animate-spin h-6 w-6 text-orange-500' viewBox='0 0 24 24'>
                            <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' fill='none'></circle>
                            <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z'></path>
                        </svg>
                        <div className='text-gray-600 text-base font-medium'>Loading...</div>
                    </div>
                </div>
            )}
        </>
    )
}

export default ProfileHr