import React, { useState, useRef, useMemo } from 'react';
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
import { OrbitProgress } from 'react-loading-indicators'


// Memoized spinner to avoid remounting/restarting the animation on parent re-renders
const Spinner = React.memo(() => (
    <div className='scale-[40%] mt-[-15px] mr-[-10px]'>
        <OrbitProgress variant="spokes" dense color="#9ca3af" size="small" text="" textColor="" />
    </div>
));

// ActivityMessage component: fades out old message, swaps content, then fades in new
// Small, self-contained so it can be reused if needed elsewhere.
const ActivityMessage = ({ message }) => {
    const [displayMessage, setDisplayMessage] = useState(message);
    const [fadeState, setFadeState] = useState('opacity-100');

    React.useEffect(() => {
        if (message !== displayMessage) {
            // Fade out current
            setFadeState('opacity-0');
            const timeout = setTimeout(() => {
                // After fade-out, swap message and fade back in
                setDisplayMessage(message);
                setFadeState('opacity-100');
            }, 150); // duration should be shorter than fade-in (below)
            return () => clearTimeout(timeout);
        }
    }, [message, displayMessage]);

    return (
        <div
            aria-live="polite"
            className={`transition-opacity duration-300 ease-in-out ${fadeState}`}
        >
            {displayMessage}
        </div>
    );
};




const UpdatedProfile = () => {
    const [activePage, setActivePage] = useState('Home');
    const [profile, setProfile] = useState(null);
    const { isConnected } = useContext(SocketContext);
    const [socketConnected, setSocketConnected] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(15); // percentage
    const [isResizing, setIsResizing] = useState(false);
    const [isChecked, setIsChecked] = useState(false)
    const [errorMessage, setErrorMessage] = useState('');
    const textareaRef = useRef(null);
    // Guard to prevent double-fetching profile in React Strict Mode (dev double-invoke of effects)
    const hasFetchedProfile = useRef(false);
    // Guard to ensure interviews are fetched only once when profile becomes available
    const hasFetchedInterviews = useRef(false);

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
    const [interviewFetchLoading, setInterviewFetchLoading] = useState(false);
    const [detailsSmallWindow, setDetailsSmallWindow] = useState(false);
    const [reviewedCandidatesLiveCount, setReviewedCandidatesLiveCount] = useState(0);
    const [resumeCollectedLiveCount, setResumeCollectedLiveCount] = useState(0);
    const [createInterviewLoading, setCreateInterviewLoading] = useState(false);

    // Latest activity message: prefer live combinedLogs, fallback to last user log on reload
    const latestActivityMessage = useMemo(() => {
        if (combinedLogs && combinedLogs.length > 0) {
            return combinedLogs[combinedLogs.length - 1]?.message;
        }
        const logs = interviewDetails?.userlogs;
        if (Array.isArray(logs) && logs.length > 0) {
            return logs[logs.length - 1]?.message;
        }
        return 'Waiting for recruiter to review sorted candidates and allow to send emails...';
    }, [combinedLogs, interviewDetails]);


    const [interviewForm, setInterviewForm] = useState({
        //company: '', // will be a dropdown, fetch all the companies of the owner and show them here
        // launguage: '', // will be a dropdown, fetch all the languages of the owner and show them here
        candidateSheetId: '', // will be a dynamic form, where owner can add multiple candidates
        jobPosition: '', // will be a text input
        jobDescription: '', // will be a text area
        minimumExperience: '', // will be a text input in minutes
        // expiryDate: '', // will be a date picker
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
            setCreateInterviewLoading(true);
            // Send minimumSkills as a comma-separated string (do not change UI state)
            const minSkillsString = Array.isArray(interviewForm.minimumSkills)
                ? interviewForm.minimumSkills.join(', ')
                : (interviewForm.minimumSkills || '');

            const payload = { ...interviewForm, minimumSkills: minSkillsString, questions: interviewQuestions };
            console.log('Create interview payload:', payload);

            const response = await API.post('/api/owner/create/interview', payload);
            console.log("interview created", response)
            console.log(response.data)
            // reload the page so that the new interview loads
            // window.location.reload();
            setInterviewCreateWindow(false);
            console.log("interview details each: ", response.data.Interview)
            setInterviewDetails(response.data.Interview);
            setActivePage('Each Interview Detail');
            setCreateInterviewLoading(false);
            // setShowLogsModal(true)
        } catch (error) {
            console.log("create interview error", error)
            setErrorMessage(error.response.data.error)
            // console.log(error.response.data.error)
            setCreateInterviewLoading(false);
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

    // Format ISO date -> "November 4, 2025 10:00am"
    const formatInterviewDate = (iso) => {
        if (!iso) return '';
        const d = new Date(iso);
        if (isNaN(d)) return iso;

        const datePart = d.toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        // time part like "10:00 am" -> convert to "10:00am"
        const timePart = d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase().replace(/\s+/g, '');
        return `${datePart}`;
    }
    const formatInterviewTime = (iso) => {
        if (!iso) return '';
        const d = new Date(iso);
        if (isNaN(d)) return iso;

        const datePart = d.toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        // time part like "10:00 am" -> convert to "10:00am"
        const timePart = d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase().replace(/\s+/g, '');
        return `${timePart}`;
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
            console.log(data.data)
            console.log(data)

            // Add new socket log to combined logs
            const newSocketLog = {
                message: data.step,
                level: 'INFO',
                timestamp: new Date().toISOString(),
                _id: `socket_${Date.now()}_${Math.random()}` // Unique ID for socket logs
            };

            // Safe optional chaining: data?.data?.reviewedCandidate protects against
            // undefined "data" or undefined nested "data" object. If any part is
            // missing, the expression short-circuits to undefined and the comparison
            // simply fails; no runtime error will occur.
            if (data?.data?.reviewedCandidate === 'SUCCESS') {
                setReviewedCandidatesLiveCount(prev => prev + 1);
            }
            // resumeCollected
            if (data?.data?.resumeCollected === 'SUCCESS') {
                setResumeCollectedLiveCount(prev => prev + 1);
            }

            setCombinedLogs(prev => [...prev, newSocketLog]);
        };

        SocketService.on("INTERVIEW_PROGRESS_LOG", handleProgress);

        return () => {
            SocketService.off("INTERVIEW_PROGRESS_LOG", handleProgress);
        };
    }, [isConnected]);

    useEffect(() => {
        if (hasFetchedProfile.current) return;
        hasFetchedProfile.current = true;

        const fetchProfile = async () => {
            try {
                const response = await API.get('/api/owner/profile');
                setProfile(response.data.owner);
                setIsChecked(response.data.owner.googleSheetsConnected);
                localStorage.setItem('umid', response.data.owner._id);

                // Respect any persisted google-sheets flag if present
                const google_sheets_connected = localStorage.getItem('gsconn');
                if (google_sheets_connected === '1') {
                    setIsChecked(true);
                }

                console.log(response.data.owner.name);
            } catch (error) {
                console.log("Error fetching profile:", error);
                // navigate("/l/o")
            }
        };

        fetchProfile();
    }, [])

    useEffect(() => {
        // Only fetch interviews when profile is available and we haven't fetched yet.
        if (!profile) return;
        if (hasFetchedInterviews.current) return;
        hasFetchedInterviews.current = true;

        const fetchAllInterviews = async () => {
            try {
                const response = await API.post('/api/owner/fetch/interviews');
                console.log("Fetched interviews:", response.data);
                // Set interviews from response (uncomment the line below if desired)
                setInterviews(response.data.data);
                // setInterviews([]);
                setInterviewFetchLoading(true);
            } catch (error) {
                console.log("Error while fetching all interviews", error);
                // setInterviewFetchLoading(false)
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
            // if (interviewDetails.candidateSheetId && sheetsNames.length === 0) {
            //     getSheetsNames();
            // }
            // Initialize the live reviewed candidates count from the persisted value
            if (typeof interviewDetails.reviewedCandidates === 'number') {
                setReviewedCandidatesLiveCount(interviewDetails.reviewedCandidates);
            } else {
                setReviewedCandidatesLiveCount(0);
            }

            if (typeof interviewDetails.resumeCollected === 'number') {
                setResumeCollectedLiveCount(interviewDetails.resumeCollected);
            } else {
                setResumeCollectedLiveCount(0);
            }
        } else {
            console.log('interviewDetails cleared');
            // Clear combined logs when no interview is selected
            setCombinedLogs([]);
            setReviewedCandidatesLiveCount(0);
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
    const [interviewLogsWindow, setInterviewLogsWindow] = useState(false);
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
        <>
            {profile ? (<>
                <div className='w-full h-[100vh] flex relative' onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>

                    {interviewCreateWindow &&
                        <div className='absolute w-full h-full z-10 flex items-center justify-center bg-gray-400/30 backdrop-blur-sm'>
                            <div className='bg-white w-[70vw] flex flex-col px-8 py-6 rounded-lg shadow-lg '>
                                <div className='w-full text-3xl font-normal mb-2 flex justify-between'>
                                    <div>Create a Job Role</div>
                                    <div onClick={() => { setInterviewCreateWindow(false); setErrorMessage(''); }} className='hover:cursor-pointer'><IoCloseOutline /></div>
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
                                            name='minimumExperience'
                                            value={interviewForm.minimumExperience}
                                            onChange={handleInterviewChange}
                                            placeholder='1 year+'
                                            className='w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400'
                                        />
                                    </div>
                                </div>

                                <div className='mb-4'>
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

                                <div className='mb-6'>
                                    <label className='text-gray-600 text-sm mb-2 block'>Allowed Candidates Sheet</label>
                                    <div className='flex flex-wrap items-center gap-2 p-2 border border-gray-300 rounded-md'>

                                        {/* <input
                                            type='text'
                                            value={newSkill}
                                            onChange={(e) => setNewSkill(e.target.value)}
                                            placeholder='Add a skill and press Enter'
                                            className='flex-grow px-2 py-1 border-none focus:outline-none focus:ring-0'
                                        /> */}
                                        <select
                                            name='candidateSheetId'
                                            value={interviewForm.candidateSheetId}
                                            onChange={handleInterviewChange}
                                            className='w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400'
                                        >
                                            <option value=''>Select a Google Sheet</option>
                                            {sheetsNames.map((sheet) => (
                                                <option key={sheet.id} value={sheet.id}>
                                                    {sheet.name}
                                                </option>
                                            ))}
                                        </select>

                                    </div>
                                </div>

                                <div className='flex justify-between'>
                                    {createInterviewLoading ? (<>
                                        <button
                                            onClick={createinterview}
                                            disabled
                                            className='bg-black text-white px-6 py-2 rounded-full hover:bg-gray-800 transition-colors flex relative pl-[42px] cursor-not-allowed'
                                        >
                                            <div className='absolute top-[4px] left-[-8px]'>
                                                <Spinner />
                                            </div>
                                            Create
                                        </button>
                                    </>) : (<>
                                        <button
                                            onClick={createinterview}
                                            className='bg-black text-white px-6 py-2 rounded-full hover:bg-gray-800 transition-colors flex'
                                        >
                                            Create
                                        </button>
                                    </>)}

                                    {errorMessage != '' &&
                                        <div className='w-full flex justify-center items-center font-Manrope text-red-500 text-sm'>
                                            <div className='bg-red-100 px-2 py-1 border-[1px] border-red-300 rounded-[4px] font-medium'>
                                                {errorMessage}
                                            </div>
                                        </div>
                                    }
                                </div>
                            </div>
                        </div>
                    }

                    {interviewLogsWindow &&
                        <div className='absolute w-full h-full z-10 flex items-center justify-center bg-gray-400/30 backdrop-blur-sm'>
                            <div className='bg-white w-[60vw] h-[70vh] flex flex-col px-8 py-6 rounded-lg shadow-lg overflow-hidden '>
                                <div className='w-full text-3xl font-normal mb-2 flex justify-between'>
                                    <div>Interview Logs</div>
                                    <div onClick={() => { setInterviewLogsWindow(false) }} className='hover:cursor-pointer'><IoCloseOutline /></div>
                                </div>
                                <hr className='border border-gray-300 mb-6' />

                                <div className='flex-1 overflow-y-auto hscroll border border-gray-300 rounded-md p-4 bg-gray-50'>
                                    {combinedLogs.length === 0 ? (
                                        <div className='text-gray-500'>No logs available.</div>
                                    ) : (
                                        combinedLogs.map((log, index) => (
                                            <div key={log._id || index} className='mb-2'>
                                                <div className='text-sm text-gray-600'>
                                                    [{log.level}] [{new Date(log.timestamp).toLocaleString()}]
                                                </div>
                                                <div className='text-base text-gray-800'>{log.message}</div>
                                            </div>
                                        ))
                                    )}
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
                                <div className='USERNAME text-xl'>{profile.name}</div>
                            </div>
                        </div>
                    </div>
                    <div className='w-1 h-full bg-white cursor-col-resize transition-colors' onMouseDown={handleMouseDown} style={{ userSelect: 'none' }} />



                    {/* Main window where we ahow all the interviews */}
                    {activePage == 'Home' &&
                        <div className='MAIN-WINDOW ALL-INTERVIEWS   h-full bg-purple-600 p' style={{ width: `${100 - sidebarWidth - 0.25}%` }}>

                            <div className='w-full h-[100vh] bg-white flex flex-col'>
                                <div className='HeaderWindow  w-full h-fit flex justify-between pt-7'>
                                    <div className=' w-fit h-fit px-16 py-4 text-4xl flex flex-col'>
                                        Job Positions
                                        <div className='text-gray-400 text-[16px] mt-[-8px]'>{interviews.length || 0} job position created</div>
                                    </div>
                                    <div className='flex items-center gap-2 mr-10'>
                                        <div onClick={() => { setInterviewCreateWindow(true); getSheetsNames(); }} className=' bg-black text-white text-[15px] rounded-full px-3 py-[8px] font-light hover:cursor-pointer'>Create Job Role</div>
                                        <div className='w-7 h-7 rounded-full bg-gray-400'></div>
                                    </div>
                                </div>



                                {interviewFetchLoading == true ? (<>


                                    <div className='ContentWindow  w-full h-full overflow-scroll hscroll '>

                                        {interviews.length === 0 ? (
                                            <div className='w-full h-full flex flex-col items-center justify-start pt-20 gap-4 text-gray-400'>
                                                <div className='text-xl'>No Job Roles Created Yet</div>
                                                <div onClick={() => { setInterviewCreateWindow(true) }} className=' bg-black text-white text-[12px] rounded-full px-3 py-[8px] font-light hover:cursor-pointer'>Create Job Role</div>
                                            </div>
                                        ) : (
                                            <>

                                                {Object.entries(groupInterviewsByDate()).map(([dateLabel, interviewsGroup]) => (
                                                    <div key={dateLabel} className='mb-12'>
                                                        <div className='px-16 py-2 text-gray-400 text-[15px] mb-[-5px] font-normal'>
                                                            {dateLabel}
                                                        </div>
                                                        {interviewsGroup.map((interview) => (
                                                            <div key={interview._id} className='w-full'>
                                                                <div onClick={() => { setInterviewDetails(interview); console.log('clicked interview:', interview); setESSWindow('details'); setActivePage('Each Interview Detail'); }}
                                                                    className='relative flex max-h-8 mx-[52px] hover:cursor-pointer hover:bg-gray-00 pl-[15px] py-[23px] pr-3 rounded-sm  justify-center items-center flex-nowrap text-black text-lg'>
                                                                    <div className='bg-gree-300/20 w-full h-[100%] flex items-center text-black/90 hover:text-black text-xl'>{interview.jobPosition || 'Interview'}</div>
                                                                    <span className='p-1 cursor-pointer rounded-full h-fit flex justify-center items-center text-xl rotate-180'><RiArrowLeftSLine /> </span>
                                                                    {/* <span onClick={() => { setInterviewExtraWindow({ [interview._id]: !interviewExtraWindow[interview._id] }); }} className='hover:bg-gray-200 p-1 rounded-full h-fit flex justify-center items-center text-xl'><BsThreeDotsVertical /></span> */}

                                                                    {/* {interviewExtraWindow[interview._id] && (
                                                                        <div className='absolute z-50 top-0 right-0 mt-10 mr-0 bg-gray-50 border-[2px] border-gray-200 rounded-[5px] p-1 flex flex-col gap-1 ' >
                                                                            <div onClick={() => { setAreYouSureDeleteWindow(true); setInterviewExtraWindow({ [interview._id]: !interviewExtraWindow[interview._id] }); setDeleteInterviewID(interview._id); }} className={`hover:bg-red-200/40 hover:cursor-pointer flex rounded-[3px] px-2 py-1 font-normal text-red-400 select-none`}>Delete <span className='ml-2 text-xl flex justify-center items-center'><MdDelete /></span></div>
                                                                        </div>
                                                                    )} */}
                                                                </div>
                                                                <hr className='border border-black/30 mx-[52px]' />
                                                            </div>
                                                        ))}
                                                    </div>
                                                ))}

                                            </>
                                        )}


                                    </div>
                                </>) : (<>
                                    <div className='ContentWindow w-full h-full overflow-scroll hscroll flex pt-10 items-start justify-center text-gray-400 text-lg'>
                                        <Spinner />
                                        Loading Job Roles...
                                    </div>
                                </>)}

                            </div>

                        </div>}


                    {/* Each Interview Panel */}
                    {activePage == 'Each Interview Detail' && interviewDetails &&
                        <div className='INTERVIEW_DETAILS_EACH   h-full bg-purple-600 p' style={{ width: `${100 - sidebarWidth - 0.25}%` }}>

                            <div className='w-full h-[100vh] bg-white flex flex-col'>
                                <div className='HeaderWindow  w-full h-fit flex justify-between pt-7'>
                                    <div className=' w-fit h-fit px-16 py-4 text-4xl flex flex-col'>
                                        <div className='text-gray-400/90 text-[16px] mt-[-8px] flex items-center gap relative'>
                                            <div onClick={() => { setActivePage('Home'); }} className='hover:cursor-pointer hover:underline hover:decoration-dotted'>Job Positions</div>
                                            <RiArrowLeftSLine className='rotate-180 text-2xl   left-[-25px]' />
                                            <div className='text-gray-500'>Job detail</div>
                                        </div>
                                        {interviewDetails.jobPosition}
                                        <div className='text-gray-400 text-[16px] mt-[-8px]'>{formatInterviewDate(interviewDetails.createdAt)}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{formatInterviewTime(interviewDetails.createdAt)}</div>
                                    </div>
                                    <div className='flex items-center gap-2 mr-10'>
                                        {/* <div onClick={() => { setInterviewCreateWindow(true) }} className=' bg-black text-white text-[15px] rounded-full px-3 py-[8px] font-light hover:cursor-pointer'>Create Job Role</div> */}
                                        {/* <div className='w-7 h-7 rounded-full bg-gray-400'></div> */}
                                        <div onClick={() => { setDetailsSmallWindow(!detailsSmallWindow) }} className='relative text-[18px] hover:cursor-pointer p-[3px]'>

                                            <BsThreeDotsVertical />

                                            {detailsSmallWindow &&
                                                <div className='absolute bg-gray-400 rounded-[5px] flex flex-col items-center justify-center p-1 top-7 right-0  shadow-md'>
                                                    <div className='bg-red-100 border border-red-400 text-red-400 px-2 py-1 rounded-[4px]'>Delete</div>
                                                </div>
                                            }
                                        </div>

                                    </div>
                                </div>



                                {interviewFetchLoading == true ? (
                                    <>
                                        <div className='INTERVIEW_DETAILS_SECTION  w-full h-full overflow-scroll hscroll px-16 pt-5'>
                                            {/* Stats row */}
                                            <div className='grid grid-cols-2 gap-4 mb-6'>
                                                <div className='rounded-2xl border border-gray-400 p-4 flex justify-between items-center'>
                                                    <div>
                                                        <div className='text-sm text-gray-400'>Resume Collected</div>
                                                        <div className='text-2xl font-medium'>{resumeCollectedLiveCount ?? 'N/A'}</div>
                                                    </div>
                                                    <div className='text-xl text-gray-400'>›</div>
                                                </div>

                                                <div className='rounded-2xl border border-gray-400 p-4 flex justify-between items-center'>
                                                    <div>
                                                        <div className='text-sm text-gray-400'>Reviewed Candidate</div>
                                                        <div className='text-2xl font-medium'>{reviewedCandidatesLiveCount ?? 'N/A'}</div>
                                                    </div>
                                                    <div className='text-xl text-gray-400'>›</div>
                                                </div>
                                            </div>

                                            {/* Job description card */}
                                            <div className='rounded-2xl border border-gray-400 p-6 mb-6'>
                                                <div className='text-sm text-gray-400 mb-2'>Job Description</div>
                                                <div className='text-gray-800 leading-6 text-sm'>
                                                    {interviewDetails?.jobDescription || 'No job description provided.'}
                                                </div>
                                            </div>

                                            {/* Qualification and Skills */}
                                            <div className='grid grid-cols-2 gap-4 mb-6'>
                                                <div className='rounded-2xl border border-gray-400 p-4'>
                                                    <div className='text-sm text-gray-400'>Minimum Qualification</div>
                                                    <div className='text-base text-gray-800 mt-2'>{interviewDetails?.minimumQualification || 'N/A'}</div>
                                                </div>

                                                <div className='rounded-2xl border border-gray-400 p-4'>
                                                    <div className='text-sm text-gray-400'>Minimum Skills</div>
                                                    <div className='text-base text-gray-800 mt-2'>{(interviewDetails?.minimumSkills) ? interviewDetails.minimumSkills : 'N/A'}</div>
                                                </div>
                                            </div>

                                            <hr className='border-t border-gray-500 my-6' />

                                            {/* Activity pill */}
                                            <div className='rounded-2xl border border-gray-400 p-4 flex items-center justify-between'>
                                                <div className='text-sm text-gray-700'>
                                                    <div className='text-xs text-gray-400 mb-1'>Activity</div>
                                                    <div className='text-sm'>
                                                        <ActivityMessage message={latestActivityMessage} />
                                                    </div>
                                                </div>
                                                <div onClick={() => { setInterviewLogsWindow(true) }} className='text-gray-400'>
                                                    <FiInfo />
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className='ContentWindow w-full h-full overflow-scroll hscroll flex pt-10 items-start justify-center text-gray-400 text-lg'>
                                            <Spinner />
                                            Loading Job Role details...
                                        </div>
                                    </>
                                )}

                            </div>

                        </div>}

                </div >
            </>) : (<>
                <div className='w-full h-full overflow-scroll hscroll flex pt-10 items-start justify-center text-gray-400 text-lg'>
                    <Spinner />
                    Loading Profile...
                </div>
            </>)}
        </>
    )
}

export default UpdatedProfile
