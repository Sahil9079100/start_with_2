import { useState, useRef } from 'react';
import API from '../../axios.config';
import { useContext } from "react";
import { SocketContext } from "../../socket/SocketProvider.jsx";
import { useEffect } from 'react';
import SocketService from '../../socket/socketService.js';

import { FiInfo } from "react-icons/fi";
import { BsThreeDotsVertical } from "react-icons/bs";
import { RiArrowLeftSLine } from "react-icons/ri";
import { LuListCheck } from "react-icons/lu";
import { MdDelete } from "react-icons/md";
import { IoCloseOutline } from "react-icons/io5";



const UpdatedProfile = () => {
    const [activePage, setActivePage] = useState('Home');
    const [profile, setProfile] = useState(null);
    const { isConnected } = useContext(SocketContext);
    const [socketConnected, setSocketConnected] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(20); // percentage
    const [isResizing, setIsResizing] = useState(false);
    const [isChecked, setIsChecked] = useState(false)
    const textareaRef = useRef(null);

    const [skillsListArray, setSkillsListArray] = useState(["React", "Node Js", "Typescript"]);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [sheetsNames, setSheetsName] = useState([])
    const [interviews, setInterviews] = useState([])
    const [interviewDetails, setInterviewDetails] = useState(null);
    const [combinedLogs, setCombinedLogs] = useState([]); // Combined logs from userLogs + socket
    const [interviewExtraWindow, setInterviewExtraWindow] = useState(false);
    const [emailSuccessSortedToolWindow, setEmailSuccessSortedToolWindow] = useState(false);
    const [eSSWindow, setESSWindow] = useState('details');
    const [areYouSureDeleteWindow, setAreYouSureDeleteWindow] = useState(false);
    const [deleteInterviewID, setDeleteInterviewID] = useState('')
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [sortedListArray, setSortedListArray] = useState([])
    const [completedInterviewCandidateResults, setCompletedInterviewCandidateResults] = useState([])
    const [newSkill, setNewSkill] = useState('');


    const [interviewForm, setInterviewForm] = useState({
        //company: '', // will be a dropdown, fetch all the companies of the owner and show them here
        launguage: '', // will be a dropdown, fetch all the languages of the owner and show them here
        candidateSheetId: '', // will be a dynamic form, where owner can add multiple candidates
        jobPosition: '', // will be a text input
        jobDescription: '', // will be a text area
        duration: '', // will be a text input in minutes
        expiryDate: '', // will be a date picker
        minimumQualification: '', // will be a text input
        minimumSkills: [], // will be a text input
    })

    const handleAddSkill = (skill) => {
        const skillToAdd = skill.trim();
        if (skillToAdd && !interviewForm.minimumSkills.includes(skillToAdd)) {
            setInterviewForm(prev => ({
                ...prev,
                minimumSkills: [...prev.minimumSkills, skillToAdd]
            }));
            setNewSkill(''); // Clear input after adding
        }
    };

    const handleRemoveSkill = (skillToRemove) => {
        setInterviewForm(prev => ({
            ...prev,
            minimumSkills: prev.minimumSkills.filter(skill => skill !== skillToRemove)
        }));
    };

    const handleMouseDown = (e) => {
        setIsResizing(true);
        e.preventDefault();
    };

    const handleMouseMove = (e) => {
        if (!isResizing) return;

        const container = e.currentTarget;
        const containerRect = container.getBoundingClientRect();
        const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

        // Set min and max width constraints (10% - 50%)
        if (newWidth >= 13 && newWidth <= 20) {
            setSidebarWidth(newWidth);
        }
    };

    const handleMouseUp = () => {
        setIsResizing(false);
    };
    // const handleCheckboxChange = (e) => {
    //     setIsChecked(e.target.checked)
    //     // if the isChecked is false then only allow this\
    //     console.log(e.target.checked)
    //     if (e.target.checked) {
    //         // connectGoogleSheets()
    //         console.log("Connecting Google Sheets")
    //     }
    // }


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
            // reload the page so that the new interview loads
            // window.location.reload();
            setInterviewCreateWindow(false);
            setActivePage('Interview');
            setInterviewDetails(response.data.Interview);
            setShowLogsModal(true)
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

    const getSkillNamesAI = async (jobPosition) => {
        try {
            console.log(`Fetching skills for: ${jobPosition}`);
            // This is a placeholder. In a real scenario, you would make an API call.
            // For example:
            const response = await API.get(`/api/owner/get-skills-ai/${jobPosition}`);
            console.log("AI skills response:", response.data.skills);
            setSkillsListArray(response.data.skills);

            // Simulating AI skill generation
            // setSkillsListArray([`${jobPosition}`, `${jobPosition}`, `${jobPosition}`]);
        } catch (error) {
            console.error("Error fetching AI skills:", error);
        }
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

    // Helper function to get sheet name by ID
    const getSheetNameById = (sheetId) => {
        const sheet = sheetsNames.find(s => s.id === sheetId);
        return sheet ? sheet.name : sheetId;
    }

    async function set_Interview_Details_page(interview_id) {
        try {
            // find the interview from interviews state using the interview_id from the interview array
            const interview_detail = interviews.find((int) => int._id === interview_id);
            setInterviewDetails(interview_detail);
            console.log(interview_detail.jobPosition)
        } catch (error) {
            console.log("Error fetching interview details:", error);
        }
    }

    async function deleteInterview() {
        try {
            setDeleteLoading(true)
            // const response = await API.delete(`/api/owner/interview/${deleteInterviewID}`);
            const response = await API.post("/api/owner/delete/interview", { interviewid: deleteInterviewID });
            console.log(response)
            console.log("delete the interview of id ", deleteInterviewID)
            setInterviews((prev) => prev.filter((int) => int._id !== deleteInterviewID));
            setDeleteInterviewID('')
            setDeleteLoading(false)
        } catch (error) {
            console.log("Error while deleting interview", error)
        }
    }

    async function InterviewCompletedResultArray() {
        try {
            const response = await API.get(`/api/owner/fetch/interview/result/${interviewDetails._id}`)
            console.log("Interview completed results:", response.data);
            setCompletedInterviewCandidateResults(response.data.data.sortedCandidateInterviews)
        } catch (error) {
            console.log("Error fetching interview completed results:", error);
        }
    }


    useEffect(() => {
        setSocketConnected(isConnected);
        console.log("Socket connection status changed:", isConnected);
        if (!isConnected) return;

        const handleProgress = (data) => {
            // console.log("Got interview progress update:", data);
            // data = { interview: "123", step: "Sheet structure processed" }
            console.log(data.step);

            // Add new socket log to combined logs
            const newSocketLog = {
                message: data.step,
                level: 'INFO',
                timestamp: new Date().toISOString(),
                _id: `socket_${Date.now()}_${Math.random()}` // Unique ID for socket logs
            };

            setCombinedLogs(prev => [...prev, newSocketLog]);
        };

        SocketService.on("INTERVIEW_PROGRESS_LOG", handleProgress);

        return () => {
            SocketService.off("INTERVIEW_PROGRESS_LOG", handleProgress);
        };
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
                // navigate("/l/o")
            }
        };
        fetchProfile();
    }, [])

    useEffect(() => {
        const fetchAllInterviews = async () => {
            try {
                const response = await API.post('/api/owner/fetch/interviews');
                console.log("Fetched interviews:", response.data);
                setInterviews(response.data.data);
            } catch (error) {
                console.log("Error while fetching all interviews", error)
            }
        }
        fetchAllInterviews();
    }, [profile])

    useEffect(() => {
        if (interviewDetails) {
            console.log('interviewDetails changed ->', interviewDetails);
            // Initialize combined logs with userLogs when interview details are loaded
            setCombinedLogs(interviewDetails.userlogs || []);
            // Fetch sheets names if not already loaded and interview has a candidateSheetId
            if (interviewDetails.candidateSheetId && sheetsNames.length === 0) {
                getSheetsNames();
            }
        } else {
            console.log('interviewDetails cleared');
            // Clear combined logs when no interview is selected
            setCombinedLogs([]);
        }
    }, [interviewDetails]);


    useEffect(() => {
        const handler = setTimeout(() => {
            if (interviewForm.jobPosition.trim() !== '') {
                getSkillNamesAI(interviewForm.jobPosition);
            }
        }, 3000);

        return () => {
            clearTimeout(handler);
        };
    }, [interviewForm.jobPosition]);


    useEffect(() => {
        console.log(eSSWindow);

        if (eSSWindow === 'emailSent') console.log("email is clicked, can fetch emails");
        if (eSSWindow === 'sortedList') get_sorted_list();
        if (eSSWindow === 'successfulInterview') InterviewCompletedResultArray();

    }, [eSSWindow]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [interviewForm.jobDescription]);

    async function get_sorted_list() {
        // /owner/fetch/interview/:id/sorted-list
        const response = await API.get(`/api/owner/fetch/interview/${interviewDetails._id}/sorted-list`);
        console.log("sorted list response: ", response.data);
        setSortedListArray(response.data.data.sortedCandidates);
    }


    const [recruiterCreateWindow, setRecruiterCreateWindow] = useState(false);
    const [companyCreateWindow, setCompanyCreateWindow] = useState(false);
    const [interviewCreateWindow, setInterviewCreateWindow] = useState(false);
    const [showLogsModal, setShowLogsModal] = useState(false);

    const handleCheckboxChange = (e) => {
        setIsChecked(e.target.checked)
        // if the isChecked is false then only allow this\
        console.log(e.target.checked)
        if (e.target.checked) {
            connectGoogleSheets()
        }

    }

    // Group interviews by date
    const groupInterviewsByDate = () => {
        const grouped = {};
        const groupOrder = []; // Track the order of date labels
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        // Sort interviews by createdAt in descending order (newest first)
        const sortedInterviews = [...interviews].sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        );

        sortedInterviews.forEach(interview => {
            const createdDate = new Date(interview.createdAt);
            createdDate.setHours(0, 0, 0, 0);

            let dateLabel;
            if (createdDate.getTime() === today.getTime()) {
                dateLabel = 'Today';
            } else if (createdDate.getTime() === yesterday.getTime()) {
                dateLabel = 'Yesterday';
            } else {
                // Format as "2 Nov", "15 Oct", etc.
                const day = createdDate.getDate();
                const month = createdDate.toLocaleString('en-US', { month: 'short' });
                dateLabel = `${day} ${month}`;
            }

            if (!grouped[dateLabel]) {
                grouped[dateLabel] = [];
                groupOrder.push(dateLabel);
            }
            grouped[dateLabel].push(interview);
        });

        return grouped;
    };

    return (
        <div className='w-full h-[100vh] flex relative' onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>

            {interviewCreateWindow &&
                <div className='absolute w-full h-full z-10 flex items-center justify-center bg-gray-400/30 backdrop-blur-sm'>
                    <div className='bg-white w-[70vw] flex flex-col px-8 py-6 rounded-lg shadow-lg '>
                        <div className='w-full text-3xl font-normal mb-2 flex justify-between'>
                            <div>Create a Job Role</div>
                            <div onClick={() => { setInterviewCreateWindow(false) }} className='hover:cursor-pointer'><IoCloseOutline /></div>
                        </div>
                        <hr className='border border-gray-300 mb-6' />

                        <div className='mb-4'>
                            <label className='text-gray-600 text-sm mb-2 block'>Job Position</label>
                            <input
                                type='text'
                                name='jobPosition'
                                value={interviewForm.jobPosition}
                                onChange={handleInterviewChange}
                                placeholder='Ex: Content Writing, Laravel Developer'
                                className='w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400'
                            />
                        </div>

                        <div className='mb-4'>
                            <div className='flex justify-between items-center mb-2'>
                                <label className='text-gray-600 text-sm'>Job Description</label>
                                <button
                                    onClick={enhanceWithAI}
                                    disabled={isEnhancing}
                                    className='text-gray-500 text-sm flex items-center gap-1 hover:text-gray-700'
                                >
                                    <span className='text-lg'>↻</span> {isEnhancing ? 'Improving...' : 'Improve through AI'}
                                </button>
                            </div>
                            <textarea
                                ref={textareaRef}
                                name='jobDescription'
                                value={interviewForm.jobDescription}
                                onChange={(e) => {
                                    handleInterviewChange(e);
                                    e.target.style.height = 'auto';
                                    e.target.style.height = e.target.scrollHeight + 'px';
                                }}
                                rows={3}
                                placeholder='Type your job description here...'
                                className='w-full resize-none px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 scroll'
                            />
                        </div>

                        <div className='flex gap-4 mb-4'>
                            <div className='flex-1'>
                                <label className='text-gray-600 text-sm mb-2 block'>Minimum Qualification</label>
                                <input
                                    type='text'
                                    name='minimumQualification'
                                    value={interviewForm.minimumQualification}
                                    onChange={handleInterviewChange}
                                    placeholder='Bachelor or Masters'
                                    className='w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400'
                                />
                            </div>
                            <div className='flex-1'>
                                <label className='text-gray-600 text-sm mb-2 block'>Minimum Experience</label>
                                <input
                                    type='text'
                                    name='duration'
                                    value={interviewForm.duration}
                                    onChange={handleInterviewChange}
                                    placeholder='1 year+'
                                    className='w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400'
                                />
                            </div>
                        </div>

                        <div className='mb-6'>
                            <label className='text-gray-600 text-sm mb-2 block'>Required Skills</label>
                            <div className='flex flex-wrap items-center gap-2 p-2 border border-gray-300 rounded-md'>
                                {interviewForm.minimumSkills.map((skill, index) => (
                                    <div key={index} className='bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm flex items-center gap-2'>
                                        {skill}
                                        <button onClick={() => handleRemoveSkill(skill)} className='text-red-500 hover:text-red-700'>
                                            <IoCloseOutline />
                                        </button>
                                    </div>
                                ))}
                                <input
                                    type='text'
                                    value={newSkill}
                                    onChange={(e) => setNewSkill(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddSkill(newSkill);
                                        }
                                    }}
                                    placeholder='Add a skill and press Enter'
                                    className='flex-grow px-2 py-1 border-none focus:outline-none focus:ring-0'
                                />
                            </div>
                            <div className='flex gap-2 mt-3'>
                                {skillsListArray.map((skill, idx) => {
                                    return (
                                        <span key={idx} onClick={() => handleAddSkill(skill)} className='bg-gray-600 hover:bg-gray-800/90 hover:cursor-pointer text-white px-3 py-1 rounded-md text-sm flex items-center gap-1'>
                                            + {skill}
                                        </span>
                                    )
                                })}
                            </div>
                        </div>

                        <div>
                            <button
                                onClick={createinterview}
                                className='bg-black text-white px-6 py-2 rounded-full hover:bg-gray-800 transition-colors'
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            }


            <div className='SIDE-BAR h-full bg-[#D9D9D9] flex flex-col justify-between' style={{ width: `${sidebarWidth}%` }}>
                <div className='SIDE_TOP_PART pl-6 pt-4 w-full h-fit'>
                    <h1 className='text-3xl'>Startwith.</h1>
                    {socketConnected ? (<>
                        <div className='mt-2 w-full flex gap-3 items-center'>
                            <div className='w-11 h-4 bg-green-500 rounded-full'></div>
                            <div>Connected</div>
                        </div></>) : (<>
                            <div className='mt-2 w-full flex gap-3 items-center'>
                                <div className='w-11 h-4 bg-red-500 rounded-full'></div>
                                <div>Disconnected</div>
                            </div></>)}
                </div>

                <div className='SIDE_BOTTON_PART w-full h-fit'>
                    <div className='w-full h-fit'>
                        <div className='px-5 text-lg'>Connections</div>
                        <div className='bg-orange-40 w-full h-fit px-5 py-2'>
                            <div className='flex border justify-between pr-3 pl-4 py-3 rounded-3xl border-black w-full gap-1 '>
                                Google Sheets

                                <label className='flex cursor-pointer select-none items-center rotate-180'>
                                    <div className='relative'>
                                        <input
                                            type='checkbox'
                                            checked={isChecked}
                                            onChange={handleCheckboxChange}
                                            aria-checked={isChecked}
                                            className='sr-only'
                                        />

                                        <div className={`block h-6 w-10 rounded-full transition-colors duration-200 ${isChecked ? ' bg-green-400' : 'bg-[#c5c5c5]'}`} />

                                        <div
                                            className={`absolute top-1 h-4 w-4 rounded-full bg-gray-200 shadow transform transition-transform duration-200 ${isChecked ? 'translate-x-2 ml-[-4px]' : 'translate-x-4 ml-1'}`}
                                        />
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                    <hr className='border border-gray-600/40 mx-5' />
                    <div className='w-full flex gap-3 items-center px-5 py-5'>
                        <div className=' w-10 h-10 rounded-full bg-slate-500'></div>
                        <div className='USERNAME text-xl'>Sahil</div>
                    </div>
                </div>
            </div>
            <div className='w-1 h-full bg-white cursor-col-resize transition-colors' onMouseDown={handleMouseDown} style={{ userSelect: 'none' }} />




            <div className='MAIN-WINDOW h-full bg-purple-600 p-1' style={{ width: `${100 - sidebarWidth - 0.25}%` }}>

                { }
                <div className='w-full h-full bg-white flex flex-col'>
                    <div className='HeaderWindow  w-full h-fit flex justify-between pt-7'>
                        <div className=' w-fit h-fit px-16 py-4 text-4xl flex flex-col'>
                            Job Role
                            <div className='text-gray-400 text-[16px] mt-[-8px]'>{interviews.length || 0} job position created</div>
                        </div>
                        <div className='flex items-center gap-2 mr-10'>
                            <div onClick={() => { setInterviewCreateWindow(true) }} className=' bg-black text-white text-[15px] rounded-full px-3 py-[8px] font-light hover:cursor-pointer'>Create Job Role</div>
                            <div className='w-7 h-7 rounded-full bg-gray-400'></div>
                        </div>
                    </div>

                    <div className='ContentWindow  w-full h-full'>
                        {Object.entries(groupInterviewsByDate()).map(([dateLabel, interviewsGroup]) => (
                            <div key={dateLabel} className='mb-12'>
                                <div className='px-16 py-2 text-gray-400 text-[15px] mb-[-5px] font-normal'>
                                    {dateLabel}
                                </div>
                                {interviewsGroup.map((interview) => (
                                    <div key={interview._id} className='w-full'>
                                        <div onClick={() => { setInterviewDetails(interview); console.log('clicked interview:', interview); setESSWindow('details'); }}
                                            className='relative flex max-h-8 mx-[52px] hover:cursor-pointer hover:bg-gray-100 pl-[15px] py-[23px] pr-3 rounded-sm  justify-center items-center flex-nowrap text-black text-lg'>
                                            <div className='bg-gree-300/20 w-full h-[100%] flex items-center text-black/90 text-xl'>{interview.jobPosition || 'Interview'}</div>
                                            <span className='p-1 cursor-pointer rounded-full h-fit flex justify-center items-center text-xl rotate-180'><RiArrowLeftSLine /> </span>
                                            {/* <span onClick={() => { setInterviewExtraWindow({ [interview._id]: !interviewExtraWindow[interview._id] }); }} className='hover:bg-gray-200 p-1 rounded-full h-fit flex justify-center items-center text-xl'><BsThreeDotsVertical /></span> */}

                                            {interviewExtraWindow[interview._id] && (
                                                <div className='absolute z-50 top-0 right-0 mt-10 mr-0 bg-gray-50 border-[2px] border-gray-200 rounded-[5px] p-1 flex flex-col gap-1 ' >
                                                    <div onClick={() => { setAreYouSureDeleteWindow(true); setInterviewExtraWindow({ [interview._id]: !interviewExtraWindow[interview._id] }); setDeleteInterviewID(interview._id); }} className={`hover:bg-red-200/40 hover:cursor-pointer flex rounded-[3px] px-2 py-1 font-normal text-red-400 select-none`}>Delete <span className='ml-2 text-xl flex justify-center items-center'><MdDelete /></span></div>
                                                </div>
                                            )}
                                        </div>
                                        <hr className='border border-black/30 mx-[52px]' />
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div >
    )
}

export default UpdatedProfile
