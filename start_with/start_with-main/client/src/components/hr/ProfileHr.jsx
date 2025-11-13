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
import { IoIosSend } from "react-icons/io";



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




const ProfileHr = () => {
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
    const [reviewedCandidateFetchLoading, setReviewedCandidateFetchLoading] = useState(false);
    const [detailsSmallWindow, setDetailsSmallWindow] = useState(false);
    const [reviewedCandidatesLiveCount, setReviewedCandidatesLiveCount] = useState(0);
    const [resumeCollectedLiveCount, setResumeCollectedLiveCount] = useState(0);
    const [createInterviewLoading, setCreateInterviewLoading] = useState(false);
    const [candidateResumeDetailsWindow, setCandidateResumeDetailsWindow] = useState(false);
    const [currentcandidateResumeDetailsID, setCurrentcandidateResumeDetailsID] = useState('');
    const [interviewSheduleWindow, setInterviewSheduleWindow] = useState(false);
    const [interviewSheduleLoading, setInterviewSheduleLoading] = useState(false);
    const [formErrors, setFormErrors] = useState({});
    // const [intervie

    // Schedule interview form state
    const [scheduleForm, setScheduleForm] = useState({
        language: 'English',
        duration: '12',
        questions: ['How do you manage a product?', 'How do you collab with other brands to manage there product?'],
        // addProfileScreening: 'Yes',
        expiryDate: ''
    });

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
            // Clear error when skill is added
            if (formErrors.minimumSkills) {
                setFormErrors(prev => ({ ...prev, minimumSkills: false }));
            }
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
            setErrorMessage('');
            let sahil = false
            let emptyItems = []
            const errors = {};

            // Validate required fields
            if (!interviewForm.jobPosition?.trim()) {
                errors.jobPosition = true;
                sahil = true;
                emptyItems.push('Job Position');
            }
            if (!interviewForm.jobDescription?.trim()) {
                errors.jobDescription = true;
                sahil = true;
                emptyItems.push('Job Description');
            }
            if (!interviewForm.minimumQualification?.trim()) {
                errors.minimumQualification = true;
                sahil = true;
                emptyItems.push('Minimum Qualification');
            }
            if (!interviewForm.minimumExperience?.trim()) {
                errors.minimumExperience = true;
                sahil = true;
                emptyItems.push('Minimum Experience');
            }
            if (!interviewForm.minimumSkills || interviewForm.minimumSkills.length === 0) {
                errors.minimumSkills = true;
                sahil = true;
                emptyItems.push('Required Skills');
            }
            if (!interviewForm.candidateSheetId) {
                errors.candidateSheetId = true;
                sahil = true;
                emptyItems.push('Candidate Sheet');
            }

            setFormErrors(errors);

            if (sahil == true) {
                setCreateInterviewLoading(false);
                setErrorMessage(`Please fill: ${emptyItems.join(', ')}`);
                return 0
            }
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

    async function SheduleInterviewSend() {
        try {
            setInterviewSheduleLoading(true);
            // await new Promise(resolve => setTimeout(resolve, 2000));
            const payload = {
                interviewId: interviewDetails._id,
                ...scheduleForm
            };
            console.log("Scheduling interview with payload:", payload);
            const response = await API.post('/api/owner/schedule/interview', payload);
            console.log("Interview scheduled successfully:", response.data);
            setInterviewSheduleLoading(false);
        }
        catch (error) {
            console.log("Error scheduling interview:", error);
            setErrorMessage(error?.response?.data?.message)
            setInterviewSheduleLoading(false);
        }
    }

    useEffect(() => {
        setSocketConnected(isConnected);
        console.log("Socket connection status changed:", isConnected);
        if (!isConnected) return;

        const handleProgress = (data) => {
            // Ensure we only process socket events for the currently selected interview
            const currentInterviewId = interviewDetails?._id;
            const incomingInterviewId = data?.interview;

            // If there's no selected interview or the IDs don't match, ignore this event
            if (!currentInterviewId || !incomingInterviewId || String(incomingInterviewId) !== String(currentInterviewId)) {
                return;
            }

            // console.log("Got interview progress update:", data);
            // data = { interview: "123", step: "Sheet structure processed" }
            console.log(data.step);
            console.log(data.data)
            // console.log(data)

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
    }, [isConnected, interviewDetails?._id]);

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

    async function get_sorted_list(interviewId) {

        if (sortedListArray.length > 0) {
            console.log("Sorted list array is alreayd there");
            return;
        }
        try {
            setReviewedCandidateFetchLoading(true);
            const response = await API.get(`/api/owner/fetch/interview/${interviewId}/sorted-list`);
            console.log("sorted list response: ", response.data);
            setSortedListArray(response.data.data.sortedCandidates);
            setReviewedCandidateFetchLoading(false);
        } catch (error) {
            console.log("Error fetching sorted list:", error);

            // get_sorted_list();
        }
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
                <div className='w-full h-[100vh] flex relative overflow-hidden' onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>

                    {interviewCreateWindow &&
                        <div className='absolute w-full h-full z-10 flex items-center justify-center bg-gray-400/30 backdrop-blur-sm'>
                            <div className='bg-white w-[70vw] flex flex-col px-8 py-6 rounded-lg shadow-lg '>
                                <div className='w-full text-3xl font-normal mb-2 flex justify-between'>
                                    <div>Create a Job Role</div>
                                    <div onClick={() => { setInterviewCreateWindow(false); setErrorMessage(''); setFormErrors([]) }} className='hover:cursor-pointer'><IoCloseOutline /></div>
                                </div>
                                <hr className='border border-gray-300 mb-6' />

                                <div className='mb-4'>
                                    <label className='text-gray-600 text-sm mb-2 block'>Job Position</label>
                                    <input
                                        type='text'
                                        required
                                        name='jobPosition'
                                        value={interviewForm.jobPosition}
                                        onChange={(e) => {
                                            handleInterviewChange(e);
                                            if (formErrors.jobPosition) {
                                                setFormErrors(prev => ({ ...prev, jobPosition: false }));
                                            }
                                        }}
                                        placeholder='Ex: Content Writing, Laravel Developer'
                                        className={`w-full px-4 py-3 border ${formErrors.jobPosition ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 ${formErrors.jobPosition ? 'focus:ring-red-400' : 'focus:ring-gray-400'}`}
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
                                        required
                                        value={interviewForm.jobDescription}
                                        onChange={(e) => {
                                            handleInterviewChange(e);
                                            if (formErrors.jobDescription) {
                                                setFormErrors(prev => ({ ...prev, jobDescription: false }));
                                            }
                                            e.target.style.height = 'auto';
                                            e.target.style.height = e.target.scrollHeight + 'px';
                                        }}
                                        rows={3}
                                        placeholder='Type your job description here...'
                                        className={`w-full resize-none px-4 py-3 border ${formErrors.jobDescription ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 ${formErrors.jobDescription ? 'focus:ring-red-400' : 'focus:ring-gray-400'} scroll`}
                                    />
                                </div>

                                <div className='flex gap-4 mb-4'>
                                    <div className='flex-1'>
                                        <label className='text-gray-600 text-sm mb-2 block'>Minimum Qualification</label>
                                        <input
                                            type='text'
                                            required
                                            name='minimumQualification'
                                            value={interviewForm.minimumQualification}
                                            onChange={(e) => {
                                                handleInterviewChange(e);
                                                if (formErrors.minimumQualification) {
                                                    setFormErrors(prev => ({ ...prev, minimumQualification: false }));
                                                }
                                            }}
                                            placeholder='Bachelor or Masters'
                                            className={`w-full px-4 py-3 border ${formErrors.minimumQualification ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 ${formErrors.minimumQualification ? 'focus:ring-red-400' : 'focus:ring-gray-400'}`}
                                        />
                                    </div>
                                    <div className='flex-1'>
                                        <label className='text-gray-600 text-sm mb-2 block'>Minimum Experience</label>
                                        <input
                                            type='text'
                                            required
                                            name='minimumExperience'
                                            value={interviewForm.minimumExperience}
                                            onChange={(e) => {
                                                handleInterviewChange(e);
                                                if (formErrors.minimumExperience) {
                                                    setFormErrors(prev => ({ ...prev, minimumExperience: false }));
                                                }
                                            }}
                                            placeholder='1 year+'
                                            className={`w-full px-4 py-3 border ${formErrors.minimumExperience ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 ${formErrors.minimumExperience ? 'focus:ring-red-400' : 'focus:ring-gray-400'}`}
                                        />
                                    </div>
                                </div>

                                <div className='mb-4'>
                                    <label className='text-gray-600 text-sm mb-2 block'>Required Skills</label>
                                    <div className={`flex flex-wrap items-center gap-2 p-2 border ${formErrors.minimumSkills ? 'border-red-500' : 'border-gray-300'} rounded-md focus-within:ring-2 ${formErrors.minimumSkills ? 'focus-within:ring-red-400' : 'focus-within:ring-gray-400'}`}>
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
                                            required
                                            onChange={(e) => {
                                                setNewSkill(e.target.value);
                                                if (formErrors.minimumSkills && interviewForm.minimumSkills.length > 0) {
                                                    setFormErrors(prev => ({ ...prev, minimumSkills: false }));
                                                }
                                            }}
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
                                    <div className={`flex flex-wrap items-center gap-2 p-2 border ${formErrors.candidateSheetId ? 'border-red-500' : 'border-gray-300'} rounded-md focus-within:ring-2 ${formErrors.candidateSheetId ? 'focus-within:ring-red-400' : 'focus-within:ring-gray-400'}`}>

                                        {/* <input
                                            type='text'
                                            value={newSkill}
                                            onChange={(e) => setNewSkill(e.target.value)}
                                            placeholder='Add a skill and press Enter'
                                            className='flex-grow px-2 py-1 border-none focus:outline-none focus:ring-0'
                                        /> */}
                                        <select
                                            name='candidateSheetId'
                                            required
                                            value={interviewForm.candidateSheetId}
                                            onChange={(e) => {
                                                handleInterviewChange(e);
                                                if (formErrors.candidateSheetId) {
                                                    setFormErrors(prev => ({ ...prev, candidateSheetId: false }));
                                                }
                                            }}
                                            className='w-full px-2 py-2 border-none rounded-md focus:outline-none focus:ring-0'
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
                                            <div className=''>
                                                Creating...
                                            </div>
                                        </button>
                                    </>) : (<>
                                        <button
                                            onClick={() => { createinterview(); }}
                                            className='bg-black h-fit transistion-all duration-300 text-white px-6 py-2 rounded-full hover:bg-black/90 transition-colors flex'
                                        >
                                            Create
                                        </button>
                                    </>)}

                                    {errorMessage != '' &&
                                        <div className='w-full pl-3 flex justify-center items-center font-Manrope text-red-500 text-sm'>
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

                    {interviewSheduleWindow &&
                        <div className='absolute w-full h-full z-10 flex items-center justify-center bg-gray-400/30 backdrop-blur-sm'>
                            <div className='bg-white w-[40vw] flex flex-col px-8 py-6 rounded-lg shadow-lg max-h-[90vh] overflow-y-auto'>
                                <div className='w-full text-3xl font-normal mb-2 flex justify-between'>
                                    <div>Schedule Interview</div>
                                    <div onClick={() => {
                                        setInterviewSheduleWindow(false);
                                        setScheduleForm({
                                            language: 'English',
                                            duration: '10',
                                            questions: [''],
                                            addProfileScreening: 'Yes',
                                            expiryDate: ''
                                        });
                                    }} className='hover:cursor-pointer'><IoCloseOutline /></div>
                                </div>
                                <hr className='border border-gray-300 mb-6' />

                                <div className='mb-4'>
                                    <label className='text-gray-600 text-sm mb-2 block'>Language</label>
                                    <select
                                        name='language'
                                        value={scheduleForm.language}
                                        onChange={(e) => setScheduleForm(prev => ({ ...prev, language: e.target.value }))}
                                        className='w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400'
                                    >
                                        <option value='English'>English</option>
                                        {/* <option value='Spanish'>Spanish</option> */}
                                        {/* <option value='French'>French</option> */}
                                        {/* <option value='German'>German</option> */}
                                        <option value='Hindi'>Hindi</option>
                                    </select>
                                </div>

                                <div className='mb-4'>
                                    <label className='text-gray-600 text-sm mb-2 block'>Duration (minutes)</label>
                                    <input
                                        type='number'
                                        name='duration'
                                        value={scheduleForm.duration}
                                        onChange={(e) => setScheduleForm(prev => ({ ...prev, duration: e.target.value }))}
                                        placeholder='10'
                                        className='w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400'
                                    />
                                </div>

                                <div className='mb-4'>
                                    <div className='flex justify-between items-center mb-2'>
                                        <label className='text-gray-600 text-sm'>Interview Questions</label>
                                        <button
                                            onClick={() => setScheduleForm(prev => ({ ...prev, questions: [...prev.questions, ''] }))}
                                            className='text-gray-500 text-sm hover:text-gray-700'
                                        >
                                            + Add question
                                        </button>
                                    </div>
                                    {scheduleForm.questions.map((question, index) => (
                                        <div key={index} className='mb-2 flex gap-'>
                                            <input
                                                type='text'
                                                value={question}
                                                onChange={(e) => {
                                                    const newQuestions = [...scheduleForm.questions];
                                                    newQuestions[index] = e.target.value;
                                                    setScheduleForm(prev => ({ ...prev, questions: newQuestions }));
                                                }}
                                                placeholder={`Q.${index + 1}`}
                                                className='flex-1 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400'
                                            />
                                            {scheduleForm.questions.length > 1 && (
                                                <button
                                                    onClick={() => {
                                                        const newQuestions = scheduleForm.questions.filter((_, i) => i !== index);
                                                        setScheduleForm(prev => ({ ...prev, questions: newQuestions.length ? newQuestions : [''] }));
                                                    }}
                                                    className=' py-2  text-red-600 rounded-md'
                                                >
                                                    <IoCloseOutline className='text-xl' />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => setScheduleForm(prev => ({ ...prev, questions: [...prev.questions, ''] }))}
                                        className='mt-2 px-4 py-[2px] bg-gray-700 text-white rounded-full text-sm hover:bg-gray-800 flex items-center gap-1'
                                    >
                                        <span className='text-lg'>+</span> Add
                                    </button>
                                </div>

                                {/* Add Profile Screening */}
                                {/* <div className='mb-4'>
                                    <label className='text-gray-600 text-sm mb-2 block'>Would you like to add profile screening questions?</label>
                                    <select
                                        name='addProfileScreening'
                                        value={scheduleForm.addProfileScreening}
                                        onChange={(e) => setScheduleForm(prev => ({ ...prev, addProfileScreening: e.target.value }))}
                                        className='w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400'
                                    >
                                        <option value='Yes'>Yes</option>
                                        <option value='No'>No</option>
                                    </select>
                                </div> */}

                                <div className='mb-6'>
                                    <label className='text-gray-600 text-sm mb-2 block'>Expiry date</label>
                                    <input
                                        type='date'
                                        name='expiryDate'
                                        value={scheduleForm.expiryDate}
                                        onChange={(e) => setScheduleForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                                        className='w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400'
                                    />
                                </div>

                                <div className='flex justify-start '>
                                    {interviewSheduleLoading == true ? (<>
                                        <button disabled className='relative bg-black hover:cursor-not-allowed text-white pl-8 pr-4 py-2 rounded-full hover:bg-black/90 transition-colors'
                                        >
                                            <div className='absolute top-[4px] left-[-8px]'>
                                                <Spinner />
                                            </div>
                                            <div className='pl-2'>
                                                Sending...
                                            </div>
                                        </button>
                                    </>) : (<>
                                        <button
                                            onClick={() => { SheduleInterviewSend(interviewDetails._id) }}
                                            className='bg-black text-white px-8 py-2 rounded-full hover:bg-gray-800 transition-colors'
                                        >
                                            Send
                                        </button>
                                    </>)}

                                    <div className="w-full flex justify-center items-center">
                                        {/* <div className='bg-red-'>
                                            Error message is this
                                        </div> */}
                                        {errorMessage != '' &&
                                            <div className='w-full flex justify-center ml-3 items-center font-Manrope text-red-500 text-[13px]'>
                                                <div className='bg-red-100 w-fit flex justify-center items-center text-center px-1 py-1 border-[1px] border-red-300 rounded-[4px] font-medium'>
                                                    {errorMessage}
                                                </div>
                                            </div>
                                        }
                                    </div>
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
                                    {interviews.length !== 0 &&
                                        <div className='flex items-center gap-2 mr-10'>
                                            <div onClick={() => { setInterviewCreateWindow(true); getSheetsNames(); }} className=' bg-black text-white text-[15px] rounded-full px-3 py-[8px] font-light hover:cursor-pointer'>Create Job Role</div>
                                            <div className='w-7 h-7 rounded-full bg-gray-400'></div>
                                        </div>
                                    }
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
                                                                <div onClick={() => { setInterviewDetails(interview); console.log('clicked interview:', interview); get_sorted_list(interview._id); setActivePage('Each Interview Detail'); }}
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

                                                <div onClick={() => { setActivePage('Each_Interview_Reviewed_Candidate'); }} className='hover:cursor-pointer hover:text-black text-gray-400 transistion-all duration-300 rounded-2xl border border-gray-400 p-4 flex justify-between items-center'>
                                                    <div>
                                                        <div className='text-sm text-gray-400'>Reviewed Candidate</div>
                                                        <div className='text-2xl font-medium text-black'>{reviewedCandidatesLiveCount ?? 'N/A'}</div>
                                                    </div>
                                                    <div className='text-3xl  '>›</div>
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


                    {/* Each Interview Reviewed Candidate */}
                    {activePage == 'Each_Interview_Reviewed_Candidate' && interviewDetails &&
                        <div className='INTERVIEW_DETAILS_EACH   h-full bg-purple-600 p' style={{ width: `${100 - sidebarWidth - 0.25}%` }}>

                            <div className='w-full h-[100vh] bg-white flex flex-col'>
                                <div className='HeaderWindow  w-full h-fit flex justify-between pt-7'>
                                    <div className=' w-fit h-fit px-16 py-4 text-4xl flex flex-col'>
                                        <div className='text-gray-400/90 text-[16px] mt-[-8px] flex items-center gap relative'>
                                            <div onClick={() => { setActivePage('Home'); setSortedListArray([]); setSortedListArray([]); }} className='hover:cursor-pointer hover:underline hover:decoration-dotted'>Job Positions</div>
                                            <RiArrowLeftSLine className='rotate-180 text-2xl   left-[-25px]' />
                                            <div onClick={() => { setActivePage('Each Interview Detail'); get_sorted_list(interviewDetails._id) }} className='hover:cursor-pointer hover:underline hover:decoration-dotted'>Job detail</div>
                                            <RiArrowLeftSLine className='rotate-180 text-2xl   left-[-25px]' />
                                            <div className='text-gray-500'>Reviewed Candidate</div>
                                        </div>
                                        Reviewed Candidate
                                        <div className='text-gray-400 text-[16px] mt-[-8px]'>Candidate Resume Reviewed</div>
                                    </div>
                                    {interviewDetails.isSheduled == true ? (<>
                                        <div className='flex items-center gap-2 mr-10'>
                                            <div onClick={() => { setActivePage('Each_Interview_Reviewed_Candidate_EmailPanel') }} className='group flex bg-white border hover:bg-black hover:text-white transition-all duration-[50ms] ease-in-out border-black text-black text-[16px] rounded-full px-4 py-[5px] font-medium hover:cursor-pointer overflow-hidden'>
                                                <span className='transition-all duration-[40ms] ease-in-out'>Email Panel</span>
                                                <div className='ml-0 text-[20px] flex justify-center items-center max-w-0 opacity-0 group-hover:max-w-[24px] group-hover:ml-2 group-hover:opacity-100 transition-all duration-[300ms] ease-in-out'>
                                                    <IoIosSend />
                                                </div>
                                            </div>
                                        </div>
                                    </>) : (<>
                                        <div className='flex items-center gap-2 mr-10'>
                                            <div onClick={() => { setInterviewSheduleWindow(true) }} className=' bg-black text-white text-[15px] rounded-full px-3 py-[8px] font-light hover:cursor-pointer'>Schedule Interview</div>
                                            {/* <div className='w-7 h-7 rounded-full bg-gray-400'></div> */}
                                            {/* <div onClick={() => { setDetailsSmallWindow(!detailsSmallWindow) }} className='relative text-[18px] hover:cursor-pointer p-[3px]'>

<BsThreeDotsVertical />

{detailsSmallWindow &&
<div className='absolute bg-gray-400 rounded-[5px] flex flex-col items-center justify-center p-1 top-7 right-0  shadow-md'>
<div className='bg-red-100 border border-red-400 text-red-400 px-2 py-1 rounded-[4px]'>Delete</div>
</div>
}
</div> */}

                                        </div>
                                    </>)}
                                </div>

                                <div className='w-full text-gray-400 text-[14px] pr-[130px]'>
                                    <div className='relative w-full flex max-h-8 mx-[52px] hover:cursor-pointer hover:bg-gray-00 pl-[15px] py-[16px] pr-3 rounded-sm justify-center items-center flex-nowrap'>
                                        <div className='bg-gree-300/20 bg-yellow-00 w-full h-[100%] flex items-center'>
                                            Name
                                        </div>

                                        <div className='bg-gree-300/20 bg-red-00 w-full h-[100%] flex items-center'>
                                            Score
                                        </div>
                                        <div className='bg-gree-300/20 bg-green-00 w-full h-[100%] flex items-center'>
                                            Match
                                        </div>
                                        <div className='bg-gree-300/20 bg-orange-00 w-fit   h-[100%] flex items-center'>
                                            {/* &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; */}
                                            {/* &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; */}
                                            {/* Hello */}
                                        </div>

                                    </div>
                                </div>


                                {reviewedCandidateFetchLoading !== true ? (
                                    <>
                                        <div className='INTERVIEW_DETAILS_SECTION  w-full h-full overflow-scroll hscroll overflow-x-hidden transistion-all duration-300'>
                                            {/*  */}
                                            {sortedListArray.map((interview, idx) => (
                                                <>
                                                    <div key={interview._id} className='w-full'>
                                                        <div onClick={() => {
                                                            if (currentcandidateResumeDetailsID === interview._id) {
                                                                setCandidateResumeDetailsWindow(prev => !prev);
                                                            } else {
                                                                setCurrentcandidateResumeDetailsID(interview._id);
                                                                setCandidateResumeDetailsWindow(true);
                                                            }
                                                        }}
                                                            className='relative w-full flex max-h-8  pr-[130px] mx-[52px] hover:cursor-pointer hover:bg-gray-00 pl-[15px] py-[23px] pr- rounded-sm justify-center items-center flex-nowrap text-black text-lg'>
                                                            {/* <div className='bg-gree-300/20 w-full h-[100%] flex items-center text-black/90 hover:text-black text-xl'></div> */}
                                                            {/* <span className="text-[15px] text-gray-400 absolute left-[-10px]">{idx}</span> */}
                                                            <div className='bg-gree-300/20 w-full h-[100%] flex items-center text-black/90 hover:text-black text-xl'>
                                                                <span className="text-[15px] text-gray-400 absolute left-[-35px]">{idx}</span>
                                                                {interview?.name || interview.dynamicData?.Name || interview.dynamicData?.name}
                                                            </div>

                                                            <div className='bg-gree-300/20 w-full h-[100%] flex items-center text-black/90 hover:text-black text-xl'>
                                                                {interview?.matchScore}
                                                            </div>

                                                            <div className='bg-gree-300/20 w-full h-[100%] flex items-center text-black/90 hover:text-black text-[18px]'>

                                                                {interview?.matchLevel == 'High Match' ? (
                                                                    <div className='bg-green-300/30 text-green-700 w-[150px] rounded-full flex items-start justify-center border border-green-500'>
                                                                        {interview?.matchLevel}
                                                                    </div>
                                                                ) : interview?.matchLevel == 'Medium Match' ? (
                                                                    <div className='bg-yellow-300/30 text-yellow-700 w-[150px] flex rounded-full items-start justify-center border border-yellow-500'>
                                                                        {interview?.matchLevel}
                                                                    </div>
                                                                ) : interview?.matchLevel == 'Low Match' ? (
                                                                    <div className='bg-orange-300/30 text-orange-700 w-[150px] flex rounded-full items-start justify-center border border-orange-500'>
                                                                        {interview?.matchLevel}
                                                                    </div>
                                                                ) : interview?.matchLevel == 'Unqualified' ? (
                                                                    <div className='bg-red-300/30 text-red-700 w-[150px] flex rounded-full items-start justify-center border border-red-500'>
                                                                        {interview?.matchLevel}
                                                                    </div>
                                                                ) : (
                                                                    <div className='bg-red-300/30 text-red-700 w-[150px] flex rounded-full items-start justify-center border border-red-500'>
                                                                        {interview?.matchLevel}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className={`w-fit justify-end h-[100%] flex  text-black/90 hover:text-black text-xl`}>
                                                                <RiArrowLeftSLine className={`${(currentcandidateResumeDetailsID === interview._id && candidateResumeDetailsWindow) ? '-rotate-90' : 'rotate-180'} transition-all duration-50`} />
                                                            </div>

                                                        </div>
                                                        {candidateResumeDetailsWindow === true && currentcandidateResumeDetailsID === interview._id && (
                                                            <div className='w-full transition-all duration-300 bg-red-300'>
                                                                <div className='w-full bg-yellow-300'>
                                                                    <div className='w-full px-[67px] bg-white shadow-sm flex flex-col gap-8'>
                                                                        {/* Info + Actions (no duplicate name/score/match) */}
                                                                        <div className='grid md:grid-cols-2 gap-8'>
                                                                            {/* Contact & Resume */}
                                                                            <div className='space-y-2'>
                                                                                <div>
                                                                                    <div className='text-sm text-gray-400 uppercase tracking-wide'>Email</div>
                                                                                    <div className='text-sm text-black break-all mt-1'>{interview.email || '—'}</div>
                                                                                </div>
                                                                                <div>
                                                                                    <div className='text-sm text-gray-400 uppercase tracking-wide'>Resume</div>
                                                                                    <div className='mt-2 flex gap-3'>
                                                                                        {interview.resumeUrl && (
                                                                                            <a
                                                                                                href={interview.resumeUrl}
                                                                                                target='_blank'
                                                                                                rel='noopener noreferrer'
                                                                                                className='px-4 py-2 rounded-md bg-white border border-gray-300 text-black text-sm hover:bg-gray-50 transition-colors'
                                                                                                onClick={(e) => e.stopPropagation()}
                                                                                            >
                                                                                                Preview
                                                                                            </a>
                                                                                        )}
                                                                                        <button
                                                                                            type='button'
                                                                                            className='px-4 py-2 rounded-md bg-gray-200 text-black text-sm hover:bg-gray-300 transition-colors'
                                                                                            onClick={(e) => { e.stopPropagation(); /* TODO: implement preview modal */ }}
                                                                                        >
                                                                                            Download
                                                                                        </button>

                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            {/* AI Note */}
                                                                            <div className='space-y-1'>
                                                                                <div className='text-sm text-gray-400 uppercase tracking-wide'>AI Note</div>
                                                                                <div className='text-sm leading-relaxed text-black'>
                                                                                    {interview.resumeSumary || interview.dynamicData?.aiNote || 'Based on Job description, required skills, and minimum qualification this one is selected.'}
                                                                                </div>
                                                                                <div className='flex flex-col gap-2 mt-2'>
                                                                                    <div className='flex items-center gap-2 text-sm text-black/80'>
                                                                                        <span className='text-green-600'>✓</span> LinkedIn Profile
                                                                                    </div>
                                                                                    <div className='flex items-center gap-2 text-sm text-black/80'>
                                                                                        <span className='text-green-600'>✓</span> Github Profile
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Flags / Questions */}
                                                                        <div className='flex flex-col gap-3 mb-3'>
                                                                            <div className='text-sm text-gray-400 uppercase tracking-wide'>Flags</div>
                                                                            <div className='flex flex-wrap gap-3'>
                                                                                <div className='bg-orange-500 text-white px-3 py-1 rounded-md text-sm'>
                                                                                    {(interview.dynamicData?.questions?.length || interview.dynamicData?.Questions?.length || 0)} Questions
                                                                                </div>
                                                                                <div className='bg-red-600 text-white px-3 py-1 rounded-md text-sm'>
                                                                                    {(interview.dynamicData?.importantQuestions?.length || interview.dynamicData?.ImportantQuestions?.length || 0)} Important Question
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                        <hr className='border border-black/30 mx-[52px]' />
                                                    </div >

                                                </>
                                            ))}

                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className='ContentWindow w-full h-full overflow-scroll hscroll flex pt-10 items-start justify-center text-gray-400 text-lg'>
                                            <Spinner />
                                            Loading Reviewed Candidate details...
                                        </div>
                                    </>
                                )}

                            </div >

                        </div>}


                    {activePage == 'Each_Interview_Reviewed_Candidate_EmailPanel' && interviewDetails &&
                        <div className='INTERVIEW_DETAILS_EACH   h-full bg-purple-600 p' style={{ width: `${100 - sidebarWidth - 0.25}%` }}>

                            <div className='w-full h-[100vh] bg-white flex flex-col'>
                                <div className='HeaderWindow  w-full h-fit flex justify-between pt-7'>
                                    <div className=' w-fit h-fit px-16 py-4 text-4xl flex flex-col'>
                                        <div className='text-gray-400/90 text-[16px] mt-[-8px] flex items-center gap relative'>
                                            <div onClick={() => { setActivePage('Home'); setSortedListArray([]); setSortedListArray([]); }} className='hover:cursor-pointer hover:underline hover:decoration-dotted'>Job Positions</div>
                                            <RiArrowLeftSLine className='rotate-180 text-2xl   left-[-25px]' />
                                            <div onClick={() => { setActivePage('Each Interview Detail'); get_sorted_list(interviewDetails._id) }} className='hover:cursor-pointer hover:underline hover:decoration-dotted'>Job detail</div>
                                            <RiArrowLeftSLine className='rotate-180 text-2xl   left-[-25px]' />
                                            <div onClick={() => { setActivePage('Each_Interview_Reviewed_Candidate'); }} className='hover:cursor-pointer hover:underline hover:decoration-dotted' > Reviewed Candidate</div>
                                            <RiArrowLeftSLine className='rotate-180 text-2xl   left-[-25px]' />
                                            <div className='text-gray-500'>Email Panel</div>
                                        </div>
                                        Reviewed Candidate
                                        <div className='text-gray-400 text-[16px] mt-[-8px]'>Candidate Resume Reviewed</div>
                                    </div>
                                    <div className='flex items-center gap-2 mr-10'>
                                        <div onClick={() => { console.log("Hello") }} className='group flex bg-black border hover:bg-whit hover:text-blac transition-all duration-[50ms] ease-in-out border-black text-white text-[16px] rounded-full px-4 py-[6px] font-medium hover:cursor-pointer overflow-hidden'>
                                            <span className='transition-all duration-[40ms] ease-in-out'>Send Invite</span>
                                            <div className='ml-0 text-[20px] flex justify-center items-center max-w-0 opacity-0 group-hover:max-w-[24px] group-hover:ml-2 group-hover:opacity-100 transition-all duration-[300ms] ease-in-out'>
                                                <IoIosSend />
                                            </div>
                                        </div>
                                    </div>
                                    {/* {interviewDetails.isSheduled == true ? (<>
                                        <div className='flex items-center gap-2 mr-10'>
                                            <div onClick={() => { setInterviewSheduleWindow(true) }} className='group flex bg-white border hover:bg-black hover:text-white transition-all duration-[50ms] ease-in-out border-black text-black text-[16px] rounded-full px-4 py-[5px] font-medium hover:cursor-pointer overflow-hidden'>
                                                <span className='transition-all duration-[40ms] ease-in-out'>Email Panel</span>
                                                <div className='ml-0 text-[20px] flex justify-center items-center max-w-0 opacity-0 group-hover:max-w-[24px] group-hover:ml-2 group-hover:opacity-100 transition-all duration-[300ms] ease-in-out'>
                                                    <IoIosSend />
                                                </div>
                                            </div>
                                        </div>
                                    </>) : (<>
                                        <div className='flex items-center gap-2 mr-10'>
                                            <div onClick={() => { setInterviewSheduleWindow(true) }} className=' bg-black text-white text-[15px] rounded-full px-3 py-[8px] font-light hover:cursor-pointer'>Schedule Interview</div>
                                        </div>
                                    </>)} */}
                                </div>

                                {/* <div className='w-full text-gray-400 text-[14px] pr-[130px]'>
                                    <div className='relative w-full flex max-h-8 mx-[52px] hover:cursor-pointer hover:bg-gray-00 pl-[15px] py-[16px] pr-3 rounded-sm justify-center items-center flex-nowrap'>
                                        <div className='bg-gree-300/20 bg-yellow-00 w-full h-[100%] flex items-center'>
                                            Name
                                        </div>

                                        <div className='bg-gree-300/20 bg-red-00 w-full h-[100%] flex items-center'>
                                            Score
                                        </div>
                                        <div className='bg-gree-300/20 bg-green-00 w-full h-[100%] flex items-center'>
                                            Match
                                        </div>
                                        <div className='bg-gree-300/20 bg-orange-00 w-fit   h-[100%] flex items-center'>
                                        </div>

                                    </div>
                                </div> */}


                                {reviewedCandidateFetchLoading !== true ? (
                                    <>
                                        <div className='INTERVIEW_DETAILS_SECTION  w-full h-full overflow-scroll hscroll overflow-x-hidden transistion-all duration-300'>


                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className='ContentWindow w-full h-full overflow-scroll hscroll flex pt-10 items-start justify-center text-gray-400 text-lg'>
                                            <Spinner />
                                            Loading Reviewed Candidate Email Panel...
                                        </div>
                                    </>
                                )}

                            </div >

                        </div>}


                </div >
            </>) : (<>
                <div className='w-full h-full overflow-scroll hscroll flex pt-10 items-start justify-center text-gray-400 text-lg'>
                    <Spinner />
                    Loading Profile...
                </div>
            </>)
            }
        </>
    )
}

export default ProfileHr


























































/**
 *
 * [ARCHIVED FILE]
 * This file has been archived and is no longer in active use.
 * It is retained for reference purposes only to develop new updated file and to take some refrence from it if needed.
 * Date: 11 November 2025
 * Author: Sahil Vaishnav
 *
 * -StartWith Team
 */



// import { useEffect, useState } from 'react';
// import API from '../../axios.config';
// import { useContext } from "react";
// import { SocketContext } from "../../socket/SocketProvider.jsx";
// import { useNavigate } from 'react-router-dom';
// // import Switcher1 from '../ToggleButton.jsx';
// // import gemai from '../../assets/gemai.png';
// import SparkleLoader from '../SparkleLoader.jsx';
// import SocketService from '../../socket/socketService.js';
// import { FiInfo } from "react-icons/fi";
// import { BsThreeDotsVertical } from "react-icons/bs";
// import { RiArrowLeftSLine } from "react-icons/ri";
// import { LuListCheck } from "react-icons/lu";
// import { MdDelete } from "react-icons/md";





// const ProfileHr = () => {
//     const [activePage, setActivePage] = useState('Home');
//     const [profile, setProfile] = useState(null);
//     const { isConnected } = useContext(SocketContext);
//     const [socketConnected, setSocketConnected] = useState(false);
//     const navigate = useNavigate()

//     const [isChecked, setIsChecked] = useState(false)
//     const [isEnhancing, setIsEnhancing] = useState(false);
//     const [sheetsNames, setSheetsName] = useState([])
//     const [interviews, setInterviews] = useState([])
//     const [interviewDetails, setInterviewDetails] = useState(null);
//     const [combinedLogs, setCombinedLogs] = useState([]); // Combined logs from userLogs + socket
//     const [interviewExtraWindow, setInterviewExtraWindow] = useState(false);
//     const [emailSuccessSortedToolWindow, setEmailSuccessSortedToolWindow] = useState(false);
//     const [eSSWindow, setESSWindow] = useState('details');
//     const [areYouSureDeleteWindow, setAreYouSureDeleteWindow] = useState(false);
//     const [deleteInterviewID, setDeleteInterviewID] = useState('')
//     const [deleteLoading, setDeleteLoading] = useState(false);
//     const [sortedListArray, setSortedListArray] = useState([])
//     const [completedInterviewCandidateResults, setCompletedInterviewCandidateResults] = useState([])

//     // This is a Job role for Content creator for Social media platform
//     const [interviewForm, setInterviewForm] = useState({
//         //company: '', // will be a dropdown, fetch all the companies of the owner and show them here
//         launguage: '', // will be a dropdown, fetch all the languages of the owner and show them here
//         candidateSheetId: '', // will be a dynamic form, where owner can add multiple candidates
//         jobPosition: '', // will be a text input
//         jobDescription: '', // will be a text area
//         duration: '', // will be a text input in minutes
//         expiryDate: '', // will be a date picker
//         minimumQualification: '', // will be a text input
//         minimumSkills: '', // will be a text input
//     })
//     const [interviewQuestions, setInterviewQuestions] = useState(['']);

//     const handleInterviewChange = (e) => {
//         const { name, value } = e.target;
//         setInterviewForm((prev) => ({ ...prev, [name]: value }));
//     };

//     const addotokendCandidate = () => {
//         setInterviewForm((prev) => ({
//             ...prev,
//             otokendCandidates: [...(prev.otokendCandidates || []), { name: '', email: '', phone: '' }]
//         }));
//     };

//     const removeotokendCandidate = (index) => {
//         setInterviewForm((prev) => {
//             const copy = [...(prev.otokendCandidates || [])];
//             copy.splice(index, 1);
//             return { ...prev, otokendCandidates: copy.length ? copy : [{ name: '', email: '', phone: '' }] };
//         });
//     };

//     const handleotokendCandidateChange = (index, field, value) => {
//         setInterviewForm((prev) => {
//             const copy = [...(prev.otokendCandidates || [])];
//             copy[index] = { ...copy[index], [field]: value };
//             return { ...prev, otokendCandidates: copy };
//         });
//     };

//     const createinterview = async () => {
//         try {
//             const payload = { ...interviewForm, questions: interviewQuestions };
//             console.log('Create interview payload:', payload);

//             const response = await API.post('/api/owner/create/interview', payload);
//             console.log("interview created", response)
//             console.log(response.data)
//             // reload the page so that the new interview loads
//             // window.location.reload();
//             setInterviewCreateWindow(false);
//             setActivePage('Interview');
//             setInterviewDetails(response.data.Interview);
//             setShowLogsModal(true)
//         } catch (error) {
//             console.log("create interview error", error)
//         }
//     }

//     const addInterviewQuestion = () => {
//         setInterviewQuestions((prev) => [...prev, '']);
//     };

//     const removeInterviewQuestion = (index) => {
//         setInterviewQuestions((prev) => {
//             const copy = [...prev];
//             copy.splice(index, 1);
//             if (copy.length === 0) return [''];
//             return copy;
//         });
//     };

//     const handleInterviewQuestionChange = (index, value) => {
//         setInterviewQuestions((prev) => {
//             const copy = [...prev];
//             copy[index] = value;
//             return copy;
//         });
//     };

//     async function connectGoogleSheets() {
//         // const res = await fetch("/api/google/auth-url", { credentials: "include" });
//         try {
//             const res = await API.get("/api/google/auth-url");
//             console.log("this is res", res)
//             const json = await res.data;
//             if (json.url) {
//                 // redirect the browser to Google consent page
//                 window.location.href = json.url;
//                 // console.log(json.url)
//                 // navigate(json.url)
//             } else {
//                 alert("Failed to get Google auth url");
//             }
//         } catch (error) {
//             console.log(error)
//         }
//     }

//     async function enhanceWithAI() {
//         try {
//             if (interviewForm.jobDescription.trim() === '') {
//                 console.log("Job description is empty. Cannot enhance with AI.");
//                 return;
//             }

//             if (interviewForm.jobDescription.length < 20) {
//                 console.log("Job description is too short. Cannot enhance with AI.");
//                 return;
//             }

//             setIsEnhancing(true)

//             const response = await API.post('/api/owner/enhance-job-description', {
//                 jobDescription: interviewForm.jobDescription

//             });
//             // console.log("Enhanced job description:", response.data.enhancedJobDescription)

//             setInterviewForm((prev) => ({
//                 ...prev,
//                 jobDescription: response.data.enhancedJobDescription
//             }));

//             setIsEnhancing(false)
//         } catch (error) {
//             console.log("enhance with ai error: ", error)
//         }
//     }

//     async function getSheetsNames() {
//         try {
//             const response = await API.get('/api/google/get-sheets-names');
//             console.log(response.data);
//             setSheetsName(response.data)
//         } catch (error) {
//             console.log("Error fetching Google Sheets names:", error);
//         }
//     }

//     // Helper function to get sheet name by ID
//     const getSheetNameById = (sheetId) => {
//         const sheet = sheetsNames.find(s => s.id === sheetId);
//         return sheet ? sheet.name : sheetId;
//     }

//     async function set_Interview_Details_page(interview_id) {
//         try {
//             // find the interview from interviews state using the interview_id from the interview array
//             const interview_detail = interviews.find((int) => int._id === interview_id);
//             setInterviewDetails(interview_detail);
//             console.log(interview_detail.jobPosition)
//         } catch (error) {
//             console.log("Error fetching interview details:", error);
//         }
//     }

//     async function deleteInterview() {
//         try {
//             setDeleteLoading(true)
//             // const response = await API.delete(`/api/owner/interview/${deleteInterviewID}`);
//             const response = await API.post("/api/owner/delete/interview", { interviewid: deleteInterviewID });
//             console.log(response)
//             console.log("delete the interview of id ", deleteInterviewID)
//             setInterviews((prev) => prev.filter((int) => int._id !== deleteInterviewID));
//             setDeleteInterviewID('')
//             setDeleteLoading(false)
//         } catch (error) {
//             console.log("Error while deleting interview", error)
//         }
//     }

//     async function InterviewCompletedResultArray() {
//         try {
//             const response = await API.get(`/api/owner/fetch/interview/result/${interviewDetails._id}`)
//             console.log("Interview completed results:", response.data);
//             setCompletedInterviewCandidateResults(response.data.data.sortedCandidateInterviews)
//         } catch (error) {
//             console.log("Error fetching interview completed results:", error);
//         }
//     }

//     useEffect(() => {
//         setSocketConnected(isConnected);
//         console.log("Socket connection status changed:", isConnected);
//         if (!isConnected) return;

//         const handleProgress = (data) => {
//             // console.log("📡 Got interview progress update:", data);
//             // data = { interview: "123", step: "Sheet structure processed" }
//             console.log(data.step);
//             console.log(data.data)
//             console.log(data)

//             // Add new socket log to combined logs
//             const newSocketLog = {
//                 message: data.step,
//                 level: 'INFO',
//                 timestamp: new Date().toISOString(),
//                 _id: `socket_${Date.now()}_${Math.random()}` // Unique ID for socket logs
//             };

//             setCombinedLogs(prev => [...prev, newSocketLog]);
//         };

//         SocketService.on("INTERVIEW_PROGRESS_LOG", handleProgress);

//         return () => {
//             SocketService.off("INTERVIEW_PROGRESS_LOG", handleProgress);
//         };
//     }, [isConnected]);

//     useEffect(() => {
//         const fetchProfile = async () => {
//             try {
//                 const response = await API.get('/api/owner/profile');
//                 setProfile(response.data.owner);
//                 setIsChecked(response.data.owner.googleSheetsConnected);
//                 localStorage.setItem('umid', response.data.owner._id);
//                 // gsconn
//                 // const user_mongodb_id = localStorage.getItem('umid')
//                 const google_sheets_connected = localStorage.getItem('gsconn')
//                 if (google_sheets_connected == '1') {
//                     setIsChecked(true)
//                 }
//                 // setCompanyList(response.data.owner.company)
//                 // setRecruiterList(response.data.owner.recrutier)
//                 console.log(response.data)

//             } catch (error) {
//                 console.log("Error fetching profile:", error);
//                 // navigate("/l/o")
//             }
//         };
//         fetchProfile();
//     }, [])

//     useEffect(() => {
//         const fetchAllInterviews = async () => {
//             try {
//                 const response = await API.post('/api/owner/fetch/interviews');
//                 console.log("Fetched interviews:", response.data);
//                 setInterviews(response.data.data);
//             } catch (error) {
//                 console.log("Error while fetching all interviews", error)
//             }
//         }
//         fetchAllInterviews();
//     }, [profile])

//     // Debug: log when interviewDetails changes (setInterviewDetails is async)
//     useEffect(() => {
//         if (interviewDetails) {
//             console.log('interviewDetails changed ->', interviewDetails);
//             // Initialize combined logs with userLogs when interview details are loaded
//             setCombinedLogs(interviewDetails.userlogs || []);
//             // Fetch sheets names if not already loaded and interview has a candidateSheetId
//             if (interviewDetails.candidateSheetId && sheetsNames.length === 0) {
//                 getSheetsNames();
//             }
//         } else {
//             console.log('interviewDetails cleared');
//             // Clear combined logs when no interview is selected
//             setCombinedLogs([]);
//         }
//     }, [interviewDetails]);


//     useEffect(() => {
//         console.log(eSSWindow);

//         if (eSSWindow === 'emailSent') console.log("email is clicked, can fetch emails");
//         if (eSSWindow === 'sortedList') get_sorted_list();
//         if (eSSWindow === 'successfulInterview') InterviewCompletedResultArray();

//     }, [eSSWindow]);

//     async function get_sorted_list() {
//         // /owner/fetch/interview/:id/sorted-list
//         const response = await API.get(`/api/owner/fetch/interview/${interviewDetails._id}/sorted-list`);
//         console.log("sorted list response: ", response.data);
//         setSortedListArray(response.data.data.sortedCandidates);
//     }

//     const [recruiterCreateWindow, setRecruiterCreateWindow] = useState(false);
//     const [companyCreateWindow, setCompanyCreateWindow] = useState(false);
//     const [interviewCreateWindow, setInterviewCreateWindow] = useState(false);
//     const [showLogsModal, setShowLogsModal] = useState(false);

//     const handleCheckboxChange = (e) => {
//         setIsChecked(e.target.checked)
//         // if the isChecked is false then only allow this\
//         console.log(e.target.checked)
//         if (e.target.checked) {
//             connectGoogleSheets()
//         }

//     }

//     return (
//         <>
//             {profile ? (
//                 <>
//                     <div className='bg-gray-300 h-[100vh] w-full flex flex-col p-2 gap-2'>

//                         <div className='navbar bg-white p-4 rounded-md shadow-md w-full h-fit flex justify-between items-center'>
//                             <div className='font-bold text-xl pl-3 text-orange-500'>StartWith</div>
//                             <div className='flex justify-center items-center'>
//                                 <div>
//                                     <div className='px-3 py-2 rounded-md font-bold text-lg hover:scale-[98%] '>
//                                         {socketConnected ? (<>
//                                             <span onClick={connectGoogleSheets} className='flex items-center gap-2 bg-gray-300'>
//                                                 <div className='w-6 h-6 rounded-full bg-green-400'></div>
//                                                 Connected
//                                             </span>
//                                         </>) : (<>
//                                             <span className='flex items-center gap-2'>
//                                                 <div className='w-6 h-6 rounded-full bg-red-400'></div>
//                                                 Disconnected
//                                             </span>
//                                         </>)}
//                                     </div>
//                                 </div >
//                                 <div>

//                                     <div
//                                         onClick={() => {
//                                             setInterviewCreateWindow(true);
//                                             getSheetsNames();
//                                         }}
//                                         className='bg-orange-400 px-3 py-2 rounded-md text-white font-bold text-lg hover:scale-[98%] hover:cursor-pointer '>+ Create Interview</div>
//                                 </div >
//                                 <div className='w-10'><img src="https://www.reshot.com/preview-assets/icons/F3N5JXHBEG/user-F3N5JXHBEG.svg" alt="" /></div>
//                             </div>
//                         </div>


//                         <div className=' w-full h-[89vh] bg-yellow-400 flex gap-2'>
//                             <div className='bg-white relative min-w-[200px] rounded-lg flex flex-col gap-1 p-1'>
//                                 {/* <div onClick={() => setActivePage('Home')} className={`bg-orange-300/40 text-orange-500 px-4 py-3 text-lg rounded-md font-semibold cursor-pointer`}>Home</div> */}
//                                 {/* <div onClick={() => setActivePage('Analytics')} className={`bg-orange-300/40 text-orange-500 px-4 py-3 text-lg rounded-md font-semibold cursor-pointer`}>Analytics</div> */}
//                                 <div onClick={() => setActivePage('Candidates')} className={`bg-orange-300/40 text-orange-500 px-4 py-3 text-lg rounded-md font-semibold cursor-pointer`}>Candidates</div>
//                                 {/* <div onClick={() => setActivePage('Recruiters')} className={`bg-orange-300/40 text-orange-500 px-4 py-3 text-lg rounded-md font-semibold cursor-pointer`}>Recruiters</div> */}
//                                 {/* <div onClick={() => setActivePage('Company')} className={`bg-orange-300/40 text-orange-500 px-4 py-3 text-lg rounded-md font-semibold cursor-pointer`}>Company</div> */}
//                                 <div onClick={() => setActivePage('Interview')} className={`bg-orange-300/40 text-orange-500 px-4 py-3 text-lg rounded-md font-semibold cursor-pointer`}>Interview</div>


//                                 <div className={`order left-0 w-[100%] p-1 border-black/30 absolute bottom-0 text-orange-500 text-lg font-normal`}>
//                                     <div className='w-full rounded-md border-2  border-black/20'>
//                                         <span className='text-black font-medium ml-1'>Connections</span>
//                                         <hr className='border border-black/20' />
//                                         <div className='bg p-2 text flex text-black justify-between'>
//                                             <span >Google Sheet</span>
//                                             <label className='flex cursor-pointer select-none items-center'>
//                                                 <div className='relative'>
//                                                     <input
//                                                         type='checkbox'
//                                                         checked={isChecked}
//                                                         onChange={handleCheckboxChange}
//                                                         aria-checked={isChecked}
//                                                         className='sr-only'
//                                                     />

//                                                     {/* track/background */}
//                                                     <div className={`block h-6 w-10 rounded-full transition-colors duration-200 ${isChecked ? 'bg-orange-400' : 'bg-[#E5E7EB]'}`} />

//                                                     {/* knob */}
//                                                     <div
//                                                         className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 ${isChecked ? 'translate-x-6 ml-[-4px]' : 'translate-x-0 ml-1'}`}
//                                                     />
//                                                 </div>
//                                             </label>
//                                         </div>
//                                     </div>
//                                     {/* Connect Google Sheet */}
//                                 </div>

//                             </div>

//                             <div className='bg-gray-100 w-full rounded-lg borer-2 border-orange-500'>


//                                 {/* home page start ------------------------------------------------------------------------ */}
//                                 {activePage == 'Home' &&
//                                     <div className='HomePage h-full bg-re-500/60 p-3 rounded-lg flex flex-col gap-3'>
//                                         <div className=''>
//                                             <select className='bg-white border border-gray-300 rounded-md p-2 w-full'>
//                                                 <option>Select Interview</option>
//                                                 {/* map the interviews from a state */}
//                                                 {/* {interviews.map((interview) => (
//                                                     <option key={interview.id} value={interview.id}>
//                                                         {interview.title}
//                                                     </option>
//                                                 ))} */}
//                                             </select>
//                                         </div>

//                                         <div className='flex gap-3 flex-wrap'>
//                                             <div className='relative min-w-[260px] flex justify-between w-fit text-b bg-gray-300 rounded-[5px] px-5 text-xl font-medium py-4 min-h-[120px] h-fit'>
//                                                 <div className='text-black/80 h-fit'>Links Opened</div>
//                                                 <div className='flex items-end pr-3 pb- text-3xl'>17%</div>
//                                                 <div className='absolute bottom-5 l-0 text-black/70 text-lg'>12/20</div>
//                                             </div>
//                                             <div className='min-w-[260px] flex justify-between w-fit text-b bg-gray-300 rounded-[5px] px-5 text-xl font-medium py-4 min-h-[120px] h-fit'>
//                                                 <div className='text-black/80'>Links Opened</div>
//                                                 <div className='bg-rd-200 flex items-end pr-3 pb-3 text-3xl'>17%</div>
//                                             </div>
//                                             <div className='min-w-[260px] flex justify-between w-fit text-b bg-gray-300 rounded-[5px] px-5 text-xl font-medium py-4 min-h-[120px] h-fit'>
//                                                 <div className='text-black/80'>Links Opened</div>
//                                                 <div className='bg-rd-200 flex items-end pr-3 pb-3 text-3xl'>17%</div>
//                                             </div>
//                                         </div>

//                                     </div>
//                                 }
//                                 {/* home page end ------------------------------------------------------------------------ */}


//                                 {/* Analytics page start ------------------------------------------------------------------------ */}
//                                 {activePage == 'Analytics' &&
//                                     <div className='AnalyticsPage h-full bg-re-500/60 p-3 rounded-lg flex flex-col gap-3'>
//                                         <div className=''>
//                                             <select className='bg-white border border-gray-300 rounded-md p-2 w-full'>
//                                                 <option>Select Interview</option>
//                                                 {/* map the interviews from a state */}
//                                                 {/* {interviews.map((interview) => (
//                                                     <option key={interview.id} value={interview.id}>
//                                                         {interview.title}
//                                                     </option>
//                                                 ))} */}
//                                             </select>
//                                         </div>

//                                         <div className='w-full bg-slate-200 p-6 h-full rounded-md flex flex-col gap-3'>
//                                             {/* we will save this things in a state, and use map to show it */}
//                                             {/* {current_leaderboard.map((interview) => (
//                                                 <div key={interview.id}>
//                                                     <div className='text-black/90 text-xl'>{interview.id}.&nbsp;&nbsp;&nbsp;{interview.title}</div>
//                                                     <div className='w-full border  border-black/10 '></div>
//                                                 </div>
//                                             ))} */}
//                                         </div>
//                                     </div>
//                                 }
//                                 {/* Analytics page end ------------------------------------------------------------------------ */}


//                                 {/* Candidates page start ------------------------------------------------------------------------ */}
//                                 {activePage == 'Candidates' &&
//                                     <div className='bg-slate-200 h-full w-full rounded-md p-1 flex gap-2'>
//                                         <div className='min-w-[160px] h-full bg-rd-300'>
//                                             <div className='bg-yello-300 flex justify-center p-3 text-xl font-semibold'>Interview List</div>
//                                             <div
//                                                 style={{ scrollbarWidth: 'none' }}
//                                                 className='w-full h-fit bg-purple-300 flex flex-col g-1 p-1 overflow-y-scroll'>
//                                                 {/* {interviews.map((interview) => (
//                                                     <div key={interview.id} className='border-b border-black/10 p-2 hover:bg-orange-300/40 cursor-pointer'>
//                                                         {interview.title}
//                                                     </div>
//                                                 ))} */}
//                                             </div>
//                                         </div>

//                                         <div className='border border-black/20 my-3 rounded-full '></div> {/*seperation line*/}

//                                         <div className='w-full h-full bg-geen-300 rounded-md p-3 flex flex-col gap-3'>
//                                             <div className='text-2xl font-semibold text-black/80'>Candidates</div>
//                                             <div className='w-full h-full bg-white rounded-md p-3 overflow-y-scroll flex flex-col gap-3'>
//                                                 {/* {candidates.map((candidate) => (
//                                                     <div key={candidate.id} className='border-b border-black/10 p-2 hover:bg-orange-300/40 cursor-pointer flex justify-between'>
//                                                         <div className='text-lg font-medium text-black/80'>{candidate.name}</div>
//                                                         <div className='text-md text-black/60'>View Details</div>
//                                                     </div>
//                                                 ))} */}
//                                             </div>
//                                         </div>

//                                     </div>
//                                 }
//                                 {/* Candidates page end ------------------------------------------------------------------------ */}





//                                 {/* Recruiters page start ------------------------------------------------------------------------ */}
//                                 {activePage == 'Recruiters' &&
//                                     <div className='bg-slate-200 h-full w-full rounded-md p-1 flex gap-2'>

//                                         <div className='w-full h-full bg-geen-300 rounded-md p-3 flex flex-col gap-3'>
//                                             <div className='text-2xl font-semibold text-black/80 flex justify-between items-center'>
//                                                 <div>Recrutiers</div>
//                                                 <div onClick={() => setRecruiterCreateWindow(true)} className='bg-orange-400 px-3 py-2 rounded-md text-white font-bold text-lg hover:scale-[98%] cursor-pointer'>+ Create Recrutier</div>
//                                             </div>
//                                             <div className='w-full h-full bg-white rounded-md p-3 overflow-y-scroll flex flex-col gap-3'>
//                                                 {/* {recruiterList && recruiterList.length > 0 ? (
//                                                     recruiterList.map((candidate, idx) => (
//                                                         <div key={idx} className='border-b border-black/10 p-2 hover:bg-orange-300/40 cursor-pointer flex justify-between'>
//                                                             <div className='text-lg font-medium text-black/80'>{candidate.name}</div>
//                                                             <div className='text-lg font-medium text-black/80'>{candidate.email}</div>
//                                                             <div className='text-lg font-medium text-black/80'>{candidate.position}</div>
//                                                             <div className='text-md text-black/60'>View Details</div>
//                                                         </div>
//                                                     ))
//                                                 ) : (
//                                                     <div className='text-md text-black/40 text-center'>No launguage yet</div>
//                                                 )} */}
//                                             </div>
//                                         </div>
//                                     </div>
//                                 }
//                                 {/* Recruiters page end ------------------------------------------------------------------------ */}

//                                 {recruiterCreateWindow &&
//                                     <div className='fixed inset-0 z-50 flex items-center justify-center'>
//                                         <div onClick={() => setRecruiterCreateWindow(false)} className='absolute inset-0 bg-black/45 backdrop-blur-sm' />

//                                         <div onClick={(e) => e.stopPropagation()} className='relative w-full max-w-2xl mx-4 bg-white rounded-xl shadow-2xl border border-orange-200 p-6'>
//                                             <button aria-label='Close' onClick={() => setRecruiterCreateWindow(false)} className='absolute -top-3 -right-3 bg-white border border-gray-200 rounded-full p-2 shadow hover:scale-95'>
//                                                 <svg xmlns="http://www.w3.org/2000/svg" className='h-4 w-4 text-gray-700' viewBox="0 0 20 20" fill="currentColor">
//                                                     <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
//                                                 </svg>
//                                             </button>

//                                             <div className='flex flex-col gap-4'>
//                                                 <div className='text-2xl font-semibold text-gray-800 mb-2'>Create Recruiter</div>
//                                                 <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
//                                                     <input name="name" value={recruiterForm.name} onChange={handleRecruiterChange} type="text" placeholder='Name' className='w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-orange-300' />
//                                                     <input name="email" value={recruiterForm.email} onChange={handleRecruiterChange} type="email" placeholder='Email' className='w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-orange-300' />
//                                                     <input name="phone" value={recruiterForm.phone} onChange={handleRecruiterChange} type="text" placeholder='Phone' className='w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-orange-300' />
//                                                     <select
//                                                         name="company"
//                                                         value={recruiterForm.company}
//                                                         onChange={handleRecruiterChange}
//                                                         className='w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-orange-300'
//                                                     >
//                                                         <option value="">Select Company</option>
//                                                         {companyList && companyList.length > 0 && companyList.map((company, idx) => (
//                                                             <option key={company._id || company.id || idx} value={company._id || company.id}>{company.name}</option>
//                                                         ))}
//                                                     </select>
//                                                     <input name="position" value={recruiterForm.position} onChange={handleRecruiterChange} type="text" placeholder='Position' className='w-full md:col-span-2 border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-orange-300' />
//                                                 </div>

//                                                 <div className='mt-5 flex items-center justify-end gap-3'>
//                                                     <button type="button" onClick={createRecruiter} className='inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg font-semibold shadow'>
//                                                         <svg xmlns="http://www.w3.org/2000/svg" className='h-4 w-4' viewBox="0 0 20 20" fill="currentColor">
//                                                             <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" />
//                                                         </svg>
//                                                         Create
//                                                     </button>
//                                                 </div>
//                                             </div>
//                                         </div>
//                                     </div>
//                                 }


//                                 {activePage === 'Company' &&
//                                     <div className='bg-slate-200 h-full w-full rounded-md p-1 flex gap-2'>
//                                         <div className='w-full h-full bg-white rounded-md p-6 flex flex-col gap-4'>
//                                             <div className='flex justify-between items-center mb-4'>
//                                                 <div className='text-2xl font-semibold text-black/80'>Companies</div>
//                                                 <button onClick={() => setCompanyCreateWindow(true)} className='bg-orange-400 px-4 py-2 rounded-md text-white font-bold text-lg hover:scale-[98%]'>
//                                                     + Create Company
//                                                 </button>
//                                             </div>
//                                             <div className='flex flex-col gap-3'>
//                                                 {/* {companyList && companyList.length === 0 ? (
//                                                     <div className='text-md text-black/40 text-center'>No companies yet</div>
//                                                 ) : (
//                                                     companyList && companyList.map((company, idx) => (
//                                                         <div key={idx} className='border-b border-black/10 p-3 hover:bg-orange-300/40 cursor-pointer flex justify-between'>
//                                                             <div className='text-lg font-medium text-black/80'>{company.name}</div>
//                                                             <div className='text-md text-black/60'>{company.location}</div>
//                                                             <div className='text-md text-black/60'>View Details</div>
//                                                         </div>
//                                                     ))
//                                                 )} */}
//                                             </div>
//                                         </div>
//                                     </div>
//                                 }

//                                 {activePage === 'Interview' &&
//                                     <div className='bg-slate-200 h-full w-full rounded-md p-1 flex gap-2'>

//                                         {interviewDetails == null &&
//                                             <div className='w-full h-full bg-white rounded-md p-6 flex flex-col gap-4'>
//                                                 <div className='flex justify-between items-center mb-4'>
//                                                     <div className='text-2xl font-semibold text-black'>Interviews</div>
//                                                 </div>
//                                                 <div className='flex flex-col gap-1 bg-ed-300/20 h-[100%] max-h-[100%]'>

//                                                     {interviews.map((interview) => (
//                                                         <div key={interview._id}>
//                                                             <div className='relative w-full flex max-h-8 hover:bg-gray-200/30 pl-[15px] py-[23px] pr-3 rounded-sm  justify-center items-center flex-nowrap text-black font-semibold text-lg'>
//                                                                 <div className='bg-gree-300/20 w-full h-[100%] flex items-center text-black/90 text-xl'>{interview.jobPosition || 'Interview'}</div>
//                                                                 <span onClick={() => { setInterviewDetails(interview); console.log('clicked interview:', interview); setESSWindow('details'); }} className='hover:bg-gray-200 p-1 cursor-pointer rounded-full h-fit flex justify-center items-center text-xl mr-3'><FiInfo /></span>
//                                                                 <span onClick={() => { setInterviewExtraWindow({ [interview._id]: !interviewExtraWindow[interview._id] }); }} className='hover:bg-gray-200 p-1 rounded-full h-fit flex justify-center items-center text-xl'><BsThreeDotsVertical /></span>

//                                                                 {interviewExtraWindow[interview._id] && (
//                                                                     <div className='absolute z-50 top-0 right-0 mt-10 mr-0 bg-gray-50 border-[2px] border-gray-200 rounded-[5px] p-1 flex flex-col gap-1 ' >
//                                                                         <div onClick={() => { setAreYouSureDeleteWindow(true); setInterviewExtraWindow({ [interview._id]: !interviewExtraWindow[interview._id] }); setDeleteInterviewID(interview._id); }} className={`hover:bg-red-200/40 hover:cursor-pointer flex rounded-[3px] px-2 py-1 font-normal text-red-400 select-none`}>Delete <span className='ml-2 text-xl flex justify-center items-center'><MdDelete /></span></div>
//                                                                     </div>
//                                                                 )}
//                                                             </div>
//                                                             {/* <div className='w-full flex justify-end pr-3'>
//                                                                 <div className='absolute top-0 right-0  mr-0 bg-gray-50 border-[2px] border-gray-200 rounded-[5px] p-1 flex flex-col gap-1 ' >
//                                                                     <div onClick={() => { setESSWindow('details'); setEmailSuccessSortedToolWindow(false) }} className={`${eSSWindow === 'details' ? 'bg-gray-200' : ''} hover:bg-gray-200 hover:cursor-pointer rounded-[3px] px-2 py-1 font-normal text-gray-900`}>Details</div>
//                                                                 </div>
//                                                             </div> */}
//                                                             <hr className='border border-black/20 ' />
//                                                         </div>
//                                                     ))}

//                                                 </div>
//                                             </div>
//                                         }

//                                         {
//                                             // here i will add the "Are you sure to delete this interview?" confirmation box
//                                             areYouSureDeleteWindow && (
//                                                 <div className='absolute top-0 left-0 w-full h-full bg-black/30 flex justify-center items-center'>
//                                                     <div className='bg-white rounded-md p-4 flex flex-col gap-4'>
//                                                         <h3 className='text-lg font-bold text-center'>Are you sure you want to delete this <br /> interview permanently?</h3>
//                                                         <div className='flex justify-end'>
//                                                             <button onClick={() => { setAreYouSureDeleteWindow(false); setDeleteLoading(false); }} className='bg-gray-200 hover:bg-gray-300 rounded-md px-4 py-2'>Cancel</button>
//                                                             {deleteLoading &&
//                                                                 <div className="flex w-[82px] justify-center items-center bg-red-500 hover:bg-red-600 text-white rounded-md px-4 py-2 ml-2">
//                                                                     <div className="w-5 h-5 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
//                                                                 </div>}
//                                                             {!deleteLoading && <button onClick={() => { deleteInterview(); }} className='bg-red-500 w-[82px] hover:bg-red-600 text-white rounded-md px-4 py-2 ml-2'>Delete</button>}
//                                                         </div>
//                                                     </div>
//                                                 </div>
//                                             )
//                                         }

//                                         {interviewDetails &&
//                                             <div className='w-full h-full bg-white rounded-md p-4 flex flex-col gap-4 relative'>
//                                                 <div className=' flex flex-col h-[100%] items-center gap-3 pb-2 border-b border-gray-200 flex-shrink-0'>
//                                                     <div className='w-full flex relative'>

//                                                         <div onClick={() => { setInterviewDetails(null); setESSWindow(''); }} className="text-[30px] rounded-full pr-[2px] py-[1px] w-fit h-fit hover:bg-gray-200 cursor-pointer transition-colors">
//                                                             <RiArrowLeftSLine />
//                                                         </div>
//                                                         <div className='flex-1'>
//                                                             <h2 className='text-2xl font-bold text-gray-800'>{interviewDetails.jobPosition}</h2>
//                                                             <p className='text-sm text-gray-500 mt-1'>Created: {new Date(interviewDetails.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
//                                                         </div>

//                                                         <div onClick={() => { setEmailSuccessSortedToolWindow(!emailSuccessSortedToolWindow) }} className='w-8 h-8 flex justify-center items-center rounded-full hover:bg-gray-200 cursor-pointer transition-colors'>
//                                                             <BsThreeDotsVertical />
//                                                         </div>

//                                                         {emailSuccessSortedToolWindow && (
//                                                             <div className='absolute top-0 right-0 mt-10 mr-0 bg-gray-50 border-[2px] border-gray-200 rounded-[5px] p-1 flex flex-col gap-1 ' >
//                                                                 <div onClick={() => { setESSWindow('details'); setEmailSuccessSortedToolWindow(false) }} className={`${eSSWindow === 'details' ? 'bg-gray-200' : ''} hover:bg-gray-200 hover:cursor-pointer rounded-[3px] px-2 py-1 font-normal text-gray-900`}>Details</div>
//                                                                 <div onClick={() => { setESSWindow('emailSent'); setEmailSuccessSortedToolWindow(false) }} className={`${eSSWindow === 'emailSent' ? 'bg-gray-200' : ''} hover:bg-gray-200 hover:cursor-pointer rounded-[3px] px-2 py-1 font-normal text-gray-900`}>Emails Sent</div>
//                                                                 <div onClick={() => { setESSWindow('successfulInterview'); setEmailSuccessSortedToolWindow(false) }} className={`${eSSWindow === 'successfulInterview' ? 'bg-gray-200' : ''} hover:bg-gray-200 hover:cursor-pointer rounded-[3px] px-2 py-1 font-normal text-gray-900`}>Successful Interview</div>
//                                                                 <div onClick={() => { setESSWindow('sortedList'); setEmailSuccessSortedToolWindow(false) }} className={`${eSSWindow === 'sortedList' ? 'bg-gray-200' : ''} hover:bg-gray-200 hover:cursor-pointer rounded-[3px] px-2 py-1 font-normal text-gray-900`}>Sorted List</div>
//                                                             </div>
//                                                         )}
//                                                     </div>

//                                                     {eSSWindow === 'emailSent' &&
//                                                         <>
//                                                             <hr className='border border-black/10 w-full' />
//                                                             <div className='w-full flex flex-col items-center gap-4 bg-rd-300'>
//                                                                 <div className='text-xl font-bold w-full'>Emails sent list</div>
//                                                                 <div className='flex flex-col gap-1 bg-ed-300/20 h-[100%] w-full'>

//                                                                     {interviews.map((interview) => (
//                                                                         <div key={interview._id}>
//                                                                             <div className='w-full flex max-h-8 hover:bg-gray-200/30 pl-[15px] py-[23px] pr-3 rounded-sm  justify-center items-center flex-nowrap text-black font-semibold text-lg'>
//                                                                                 <div className='bg-gree-300/20 w-full h-[100%] flex items-center text-black/90 text-xl'>{interview.jobPosition || 'Interview'}</div>
//                                                                                 {/* set state and log the interview object (not the stale state) */}
//                                                                                 <span onClick={() => { setInterviewDetails(interview); console.log('clicked interview:', interview); }} className='hover:bg-gray-200 p-1 cursor-pointer rounded-full h-fit flex justify-center items-center text-xl mr-3'><FiInfo /></span>
//                                                                                 <span className='hover:bg-gray-200 p-1 rounded-full h-fit flex justify-center items-center text-xl'><BsThreeDotsVertical /></span>
//                                                                             </div>
//                                                                             <hr className='border border-black/20 ' />
//                                                                         </div>
//                                                                     ))}

//                                                                 </div>
//                                                             </div>
//                                                         </>
//                                                     }


//                                                     {/* Status Badge */}
//                                                     {/* <div className='flex items-center gap-2'>
//                                                         <span className={`px-3 py-1 rounded-full text-xs font-semibold ${interviewDetails.status === 'sort_resume_as_job_description' ? 'bg-yellow-100 text-yellow-700' :
//                                                             interviewDetails.status === 'completed' ? 'bg-green-100 text-green-700' :
//                                                                 'bg-blue-100 text-blue-700'
//                                                             }`}>
//                                                             {interviewDetails.status?.replace(/_/g, ' ').toUpperCase()}
//                                                         </span>
//                                                     </div> */}

//                                                     {eSSWindow === 'details' && (
//                                                         <div className='w-full flex-1 h-[100%] overflow-y-scroll space-y-4 bg-rd-500'>
//                                                             <div className='grid grid-cols-1 md:grid-cols-4 gap-3'>
//                                                                 <div className='bg-gray-50 p-2 rounded-lg border border-gray-200'>
//                                                                     <div className='text-sm font-semibold text-gray-600 mb-2'>Duration</div>
//                                                                     <div className='text-gray-800'>{interviewDetails.duration ? `${interviewDetails.duration} min` : 'Not specified'}</div>
//                                                                 </div>
//                                                                 <div className='bg-gray-50 p-2 rounded-lg border border-gray-200'>
//                                                                     <div className='text-sm font-semibold text-gray-600 mb-2'>Language</div>
//                                                                     <div className='text-gray-800'>{interviewDetails.launguage || 'Not specified'}</div>
//                                                                 </div>
//                                                                 <div className='bg-gray-50 p-2 rounded-lg border border-gray-200'>
//                                                                     <div className='text-sm font-semibold text-gray-600 mb-2'>Candiate interview completed</div>
//                                                                     <div className='text-gray-800'>{interviewDetails.usercompleteintreviewemailandid?.length || 0}</div>
//                                                                 </div>
//                                                                 <div className='bg-gray-50 p-2 rounded-lg border border-gray-200'>
//                                                                     <div className='text-sm font-semibold text-gray-600 mb-2'>Expiry date</div>
//                                                                     {/* add a check if the date is null */}
//                                                                     <div className='text-gray-800'>{interviewDetails.expiryDate ? new Date(interviewDetails.expiryDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Not specified'}</div>
//                                                                 </div>
//                                                             </div>

//                                                             <div className='bg-gray-50 p-5 rounded-lg border border-gray-200'>
//                                                                 <h3 className='text-lg font-semibold text-gray-800 mb-3'>Job Description</h3>
//                                                                 <p className='text-gray-700 leading-relaxed'>{interviewDetails.jobDescription}</p>
//                                                             </div>

//                                                             <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
//                                                                 <div className='bg-white p-4 rounded-lg border border-gray-200 shadow-sm'>
//                                                                     <h4 className='text-sm font-semibold text-gray-600 mb-2'>Minimum Qualification</h4>
//                                                                     <p className='text-gray-800'>{interviewDetails.minimumQualification || 'Not specified'}</p>
//                                                                 </div>
//                                                                 <div className='bg-white p-4 rounded-lg border border-gray-200 shadow-sm'>
//                                                                     <h4 className='text-sm font-semibold text-gray-600 mb-2'>Minimum Skills</h4>
//                                                                     <p className='text-gray-800'>{interviewDetails.minimumSkills || 'Not specified'}</p>
//                                                                 </div>
//                                                                 <div className='bg-white p-4 rounded-lg border border-gray-200 shadow-sm md:col-span-2'>
//                                                                     <h4 className='text-sm font-semibold text-gray-600 mb-2'>Candidate Sheet</h4>
//                                                                     <div className='flex items-center gap-2'>
//                                                                         <svg className='w-5 h-5 text-green-600' fill="currentColor" viewBox="0 0 20 20">
//                                                                             <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" />
//                                                                             <path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
//                                                                         </svg>
//                                                                         <p className='text-gray-800 font-medium'>{getSheetNameById(interviewDetails.candidateSheetId)}</p>
//                                                                     </div>
//                                                                     {interviewDetails.candidateSheetId && (
//                                                                         <p className='text-xs text-gray-500 mt-2 font-mono'>ID: {interviewDetails.candidateSheetId}</p>
//                                                                     )}
//                                                                 </div>
//                                                             </div>

//                                                             <div className='bg-white p-4 rounded-lg border border-gray-200 shadow-sm'>
//                                                                 <h4 className='text-sm font-semibold text-gray-600 mb-2'>Interview URL</h4>
//                                                                 <div className='flex items-center gap-2'>
//                                                                     <input
//                                                                         type='text'
//                                                                         readOnly
//                                                                         value={interviewDetails.interviewUrl}
//                                                                         className='flex-1 bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-gray-700'
//                                                                     />
//                                                                     <button
//                                                                         onClick={() => {
//                                                                             navigator.clipboard.writeText(interviewDetails.interviewUrl);
//                                                                             alert('URL copied to clipboard!');
//                                                                         }}
//                                                                         className='bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors'
//                                                                     >
//                                                                         Copy
//                                                                     </button>
//                                                                 </div>
//                                                             </div>

//                                                             {combinedLogs && combinedLogs.length > 0 && (
//                                                                 <div className='bg-white p-4 rounded-lg border border-gray-200 shadow-sm'>
//                                                                     <div className='flex justify-between items-center mb-3'>
//                                                                         <h4 className='text-sm font-semibold text-gray-600'>Recent Activity</h4>
//                                                                         <span className='text-xs text-gray-500'>{combinedLogs.length} logs</span>
//                                                                     </div>
//                                                                     <div className='space-y-2'>
//                                                                         {combinedLogs.slice(-3).reverse().map((log, idx) => (
//                                                                             <div key={log._id || idx} className='flex items-start gap-2 text-sm'>
//                                                                                 <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${log.level === 'SUCCESS' ? 'bg-green-500' :
//                                                                                     log.level === 'ERROR' ? 'bg-red-500' :
//                                                                                         'bg-blue-500'
//                                                                                     }`}></span>
//                                                                                 <p className='text-gray-700 flex-1'>{log.message}</p>
//                                                                             </div>
//                                                                         ))}
//                                                                     </div>
//                                                                 </div>
//                                                             )}
//                                                         </div>
//                                                     )}

//                                                     {eSSWindow === 'sortedList' && (
//                                                         <>
//                                                             {sortedListArray.length !== 0 ? (
//                                                                 <>
//                                                                     <hr className='border border-black/10 w-full' />
//                                                                     <div className='w-full flex flex-col items-center gap-4 bg-rd-300'>
//                                                                         <div className='text-xl font-bold w-full ml-10'>Sorted list</div>
//                                                                         <div className='flex flex-col gap-1 bg-ed-300/20 h-[100%] w-full'>

//                                                                             <div className='w-full h-[100%] flex items-center text-black/70 hover:text-black text-xl'>
//                                                                                 <div className='w-full h-[100%] flex items-center text-black hover:text-black text-xl ml-4 mr-[-65px]'># &nbsp; Name </div>
//                                                                                 <div className='w-full h-[100%] flex items-center text-black hover:text-black text-xl'>Resume Score </div>
//                                                                                 <div className='w-full h-[100%] flex items-center text-black hover:text-black text-xl ml-24'>Match</div>
//                                                                             </div>
//                                                                             <hr className='border border-black/20 ' />

//                                                                             {sortedListArray.map((candidate, idx) => (
//                                                                                 <div key={candidate._id}>
//                                                                                     <div className='w-full flex max-h-8 hover:bg-gray-200/20 pl-[15px] py-[23px] pr-3 rounded-sm  justify-center items-center flex-nowrap text-black font-semibold text-lg'>
//                                                                                         <div className='bg-gree-300/20 w-full h-[100%] flex items-center text-black/70 hover:text-black text-xl'>{idx + 1}.&nbsp;&nbsp;&nbsp;{candidate.dynamicData?.Name || 'Interview'}</div>
//                                                                                         <div className='bg-gree-300/20 w-full h-[100%] flex items-center text-black/70 hover:text-black text-xl'>{candidate.matchScore || 'Interview'}/100</div>
//                                                                                         <div className='bg-gree-300/20 w-full h-[100%] flex items-center text-black/70 hover:text-black text-xl'>
//                                                                                             {candidate.matchLevel === 'Unqualified' && <div className='bg-red-400/40 w-[140px] h-fit px-3 py-0 border-2 border-red-500 text-red-600 text-[15px] font-medium flex items-center justify-center rounded-full'>Unqualified</div>}
//                                                                                             {candidate.matchLevel === 'High Match' && <div className='bg-green-400/30 w-[140px] h-fit px-3 py-0 border-2 border-green-400 text-green-600 text-[15px] font-medium flex items-center justify-center rounded-full'>High Match</div>}
//                                                                                             {candidate.matchLevel === 'Medium Match' && <div className='bg-yellow-400/30 w-[140px] h-fit px-3 py-0 border-2 border-yellow-300 text-yellow-500 text-[15px] font-medium flex items-center justify-center rounded-full'>Medium Match</div>}
//                                                                                             {candidate.matchLevel === 'Low Match' && <div className='bg-orange-400/30 w-[140px] h-fit px-3 py-0 border-2 border-orange-300 text-orange-500 text-[15px] font-medium flex items-center justify-center rounded-full'>Low Match</div>}
//                                                                                         </div>
//                                                                                         <span className='hover:bg-gray-200 p-1 cursor-pointer rounded-full h-fit flex justify-center items-center text-xl mr-3'><FiInfo /></span>
//                                                                                         {/* <span className='hover:bg-gray-200 p-1 rounded-full h-fit flex justify-center items-center text-xl'><BsThreeDotsVertical /></span> */}
//                                                                                     </div>
//                                                                                     <hr className='border border-black/20 ' />
//                                                                                 </div>
//                                                                             ))}

//                                                                         </div>
//                                                                     </div>
//                                                                 </>) : (
//                                                                 <div className='text-xl font-normal w-full text-center mt-24'>Loading the list<br />OR<br />Sorted list is empty</div>
//                                                                 // <div className='w-full flex flex-col items-center gap-4 bg-rd-300'>
//                                                                 // </div>
//                                                             )}
//                                                         </>
//                                                     )}

//                                                     {eSSWindow === 'successfulInterview' && (
//                                                         <>
//                                                             <hr className='border border-black/10 w-full' />
//                                                             <div className='w-full flex flex-col items-center gap-4 bg-rd-300'>
//                                                                 <div className='text-xl font-bold w-full ml-10'>Successfully Interview Completed</div>
//                                                                 <div className='flex flex-col gap-1 bg-ed-300/20 h-[100%] w-full'>

//                                                                     <div className='w-full h-[100%] flex items-center text-black/70 hover:text-black text-xl mt-5'>
//                                                                         <div className='w-full h-[100%] flex items-center text-black hover:text-black text-xl ml-4 mr-[-65px]'>Email</div>
//                                                                         <div className='w-full h-[100%] flex items-center text-black hover:text-black text-xl'>Resume Score</div>
//                                                                         {/* <div className='w-full h-[100%] flex items-center text-black hover:text-black text-xl ml-24'>Match</div> */}
//                                                                     </div>
//                                                                     <hr className='border border-black/20 ' />

//                                                                     {completedInterviewCandidateResults.map((user) => (
//                                                                         <div key={user._id}>
//                                                                             <div className='w-full flex max-h-8 hover:bg-gray-200/30 pl-[15px] py-[23px] pr-3 rounded-sm  justify-center items-center flex-nowrap text-black font-semibold text-lg'>
//                                                                                 <div className='w-full h-[100%] flex items-center text-black/90 text-xl'>{user.email || 'Interview'}</div>
//                                                                                 <div className='w-full h-[100%] flex items-center text-black/90 text-xl'>{user.interviewResult.feedback.overall_mark || 'Interview'}</div>
//                                                                                 <span className='hover:bg-gray-200 p-1 cursor-pointer rounded-full h-fit flex justify-center items-center text-xl mr-3'><FiInfo /></span>
//                                                                                 {/* <span className='hover:bg-gray-200 p-1 rounded-full h-fit flex justify-center items-center text-xl'><BsThreeDotsVertical /></span> */}
//                                                                             </div>
//                                                                             <hr className='border border-black/20 ' />
//                                                                         </div>
//                                                                     ))}

//                                                                 </div>
//                                                             </div>
//                                                         </>
//                                                     )}



//                                                 </div>

//                                                 <div
//                                                     onClick={() => setShowLogsModal(true)}
//                                                     className="bg-white text-black/80 hover:cursor-pointer hover:text-black w-fit h-fit hover:bg-gray-100 border-[2px] border-black/30 absolute px-4 py-[2px] rounded-full text-lg font-medium bottom-4 right-4 flex justify-center items-center shadow-lg transition-all hover:shadow-xl">
//                                                     Logs
//                                                     <div className='ml-[7px] text-[20px]'>
//                                                         <LuListCheck />
//                                                     </div>
//                                                 </div>
//                                             </div>
//                                         }
//                                     </div>
//                                 }

//                                 {/* Here i will */}
//                                 { }

//                                 {showLogsModal && interviewDetails && (
//                                     <div className=' inset-0 z-50 flex items-center justify-center p-4 absolute'>
//                                         <div onClick={() => setShowLogsModal(false)} className='absolute inset-0 bg-black/50 backdrop-blur-sm' />

//                                         <div className='relative w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-gray-200 max-h-[85vh] overflow-hidden flex flex-col'>

//                                             <div className='flex items-center justify-between p-5 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-orange-100'>
//                                                 <div>
//                                                     <h2 className='text-xl font-bold text-gray-800'>Interview Logs</h2>
//                                                     <p className='text-sm text-gray-600 mt-1'>{interviewDetails.jobPosition} - {combinedLogs.length} entries</p>
//                                                 </div>
//                                                 <button
//                                                     onClick={() => setShowLogsModal(false)}
//                                                     className='bg-white hover:bg-gray-100 rounded-lg p-2 transition-colors shadow-sm'>
//                                                     <svg xmlns="http://www.w3.org/2000/svg" className='h-5 w-5 text-gray-600' viewBox="0 0 20 20" fill="currentColor">
//                                                         <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
//                                                     </svg>
//                                                 </button>
//                                             </div>


//                                             <div className='flex-1 overflow-y-auto p-5'>
//                                                 <div className='space-y-3'>
//                                                     {combinedLogs && combinedLogs.length > 0 ? (
//                                                         combinedLogs.map((log, idx) => (
//                                                             <div key={log._id || idx} className={`p-4 rounded-lg border-l-4 ${log.level === 'SUCCESS' ? 'bg-green-50 border-green-500' :
//                                                                 log.level === 'ERROR' ? 'bg-red-50 border-red-500' :
//                                                                     'bg-blue-50 border-blue-500'
//                                                                 }`}>
//                                                                 <div className='flex items-start justify-between gap-3'>
//                                                                     <div className='flex-1'>
//                                                                         <div className='flex items-center gap-2 mb-1'>
//                                                                             <span className={`text-xs font-bold px-2 py-0.5 rounded ${log.level === 'SUCCESS' ? 'bg-green-200 text-green-800' :
//                                                                                 log.level === 'ERROR' ? 'bg-red-200 text-red-800' :
//                                                                                     'bg-blue-200 text-blue-800'
//                                                                                 }`}>
//                                                                                 {log.level}
//                                                                             </span>
//                                                                             <span className='text-xs text-gray-500'>
//                                                                                 {new Date(log.timestamp).toLocaleString('en-US', {
//                                                                                     month: 'short',
//                                                                                     day: 'numeric',
//                                                                                     hour: '2-digit',
//                                                                                     minute: '2-digit',
//                                                                                     second: '2-digit'
//                                                                                 })}
//                                                                             </span>
//                                                                         </div>
//                                                                         <p className='text-gray-800 text-sm leading-relaxed'>{log.message}</p>
//                                                                     </div>
//                                                                     <div className='text-gray-400 text-xs font-mono'>#{idx + 1}</div>
//                                                                 </div>
//                                                             </div>
//                                                         ))
//                                                     ) : (
//                                                         <div className='text-center py-12'>
//                                                             <div className='text-gray-400 text-lg mb-2'>No logs available</div>
//                                                             <p className='text-gray-500 text-sm'>Logs will appear here as the interview progresses</p>
//                                                         </div>
//                                                     )}
//                                                 </div>
//                                             </div>

//                                             {/* Modal Footer */}
//                                             <div className='flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50'>
//                                                 <button
//                                                     onClick={() => setShowLogsModal(false)}
//                                                     className='px-5 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium transition-colors'>
//                                                     Close
//                                                 </button>
//                                             </div>
//                                         </div>
//                                     </div>
//                                 )}


//                                 {companyCreateWindow &&
//                                     <div className='fixed inset-0 z-50 flex items-center justify-center'>
//                                         <div onClick={() => setCompanyCreateWindow(false)} className='absolute inset-0 bg-black/45 backdrop-blur-sm' />

//                                         <div onClick={(e) => e.stopPropagation()} className='relative w-full max-w-2xl mx-4 bg-white rounded-xl shadow-2xl border border-orange-200 p-6'>
//                                             <button aria-label='Close' onClick={() => setCompanyCreateWindow(false)} className='absolute -top-3 -right-3 bg-white border border-gray-200 rounded-full p-2 shadow hover:scale-95'>
//                                                 <svg xmlns="http://www.w3.org/2000/svg" className='h-4 w-4 text-gray-700' viewBox="0 0 20 20" fill="currentColor">
//                                                     <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
//                                                 </svg>
//                                             </button>

//                                             <div className='flex flex-col gap-4'>
//                                                 <div className='text-2xl font-semibold text-gray-800 mb-2'>Create Company</div>
//                                                 <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
//                                                     <input
//                                                         name="name"
//                                                         value={companyForm.name}
//                                                         onChange={handleCompanyChange}
//                                                         type="text"
//                                                         placeholder='Company Name'
//                                                         className='w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-orange-300'
//                                                     />
//                                                     <input
//                                                         name="location"
//                                                         value={companyForm.location}
//                                                         onChange={handleCompanyChange}
//                                                         type="text"
//                                                         placeholder='Location'
//                                                         className='w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-orange-300'
//                                                     />
//                                                     <input
//                                                         name="website"
//                                                         value={companyForm.website}
//                                                         onChange={handleCompanyChange}
//                                                         type="text"
//                                                         placeholder='Website'
//                                                         className='w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-orange-300'
//                                                     />
//                                                     <input
//                                                         name="size"
//                                                         value={companyForm.size}
//                                                         onChange={handleCompanyChange}
//                                                         type="text"
//                                                         placeholder='Company Size'
//                                                         className='w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-orange-300'
//                                                     />
//                                                     <input
//                                                         name="industry"
//                                                         value={companyForm.industry}
//                                                         onChange={handleCompanyChange}
//                                                         type="text"
//                                                         placeholder='Industry'
//                                                         className='w-full md:col-span-2 border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-orange-300'
//                                                     />
//                                                 </div>
//                                                 <div className='mt-5 flex items-center justify-end gap-3'>
//                                                     <button type="button" onClick={createCompany} className='inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg font-semibold shadow'>
//                                                         <svg xmlns="http://www.w3.org/2000/svg" className='h-4 w-4' viewBox="0 0 20 20" fill="currentColor">
//                                                             <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" />
//                                                         </svg>
//                                                         Create
//                                                     </button>
//                                                 </div>
//                                             </div>
//                                         </div>
//                                     </div>
//                                 }

//                                 {interviewCreateWindow &&
//                                     <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
//                                         <div className='absolute inset-0 bg-black/45 backdrop-blur-sm' />

//                                         <div className='relative w-full max-w-5xl bg-white rounded-xl shadow-2xl border border-orange-200 max-h-[90vh] overflow-hidden flex flex-col'>
//                                             {/* Header */}
//                                             <div className='flex items-center justify-between p-6 border-b border-gray-200'>
//                                                 <div>
//                                                     <h2 className='text-2xl font-semibold text-gray-800'>Create Interview</h2>
//                                                     <p className='text-sm text-gray-500 mt-1'>Fill in the details below to create a new interview</p>
//                                                 </div>
//                                                 <button onClick={() => { setInterviewCreateWindow(false) }} aria-label='Close' className='bg-gray-100 hover:bg-gray-200 rounded-lg p-2 transition-colors'>
//                                                     <svg xmlns="http://www.w3.org/2000/svg" className='h-5 w-5 text-gray-600' viewBox="0 0 20 20" fill="currentColor">
//                                                         <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
//                                                     </svg>
//                                                 </button>
//                                                 {/* <Switcher1 /> */}

//                                             </div>

//                                             {/* Form Content */}
//                                             <div className='flex-1 overflow-y-auto p-6'>
//                                                 <div className='space-y-6'>
//                                                     {/* Basic Information */}
//                                                     <div>
//                                                         <h3 className='text-lg font-medium text-gray-900 mb-4'>Basic Information</h3>
//                                                         <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
//                                                             <div>
//                                                                 <label className='block text-sm font-medium text-gray-700 mb-2'>Company *</label>
//                                                                 <select name='company' value={interviewForm.company}
//                                                                     // onChange={handleInterviewChange} 
//                                                                     className='w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white'>
//                                                                     <option value=''>Select Company</option>
//                                                                     {/* {companyList.map((c, i) => (
//                                                                         <option key={c._id || i} value={c._id}>{c.name}</option>
//                                                                     ))} */}
//                                                                 </select>
//                                                             </div>

//                                                             <div>
//                                                                 <label className='block text-sm font-medium text-gray-700 mb-2'>Launguage *</label>
//                                                                 <select name='launguage' value={interviewForm.launguage} onChange={handleInterviewChange} className='w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white'>
//                                                                     <option value=''>Select Launguage</option>
//                                                                     {/* {recruiterList.map((r, i) => (
//                                                                         <option key={r._id || i} value={r._id}>{r.name}</option>
//                                                                     ))} */}
//                                                                     <option value="English">English</option>
//                                                                     <option value="Hindi">Hindi</option>
//                                                                 </select>
//                                                             </div>

//                                                             <div>
//                                                                 <label className='block text-sm font-medium text-gray-700 mb-2'>Job Position *</label>
//                                                                 <input name='jobPosition' value={interviewForm.jobPosition} onChange={handleInterviewChange} placeholder='e.g. Senior Developer' className='w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent' />
//                                                             </div>

//                                                             <div>
//                                                                 <label className='block text-sm font-medium text-gray-700 mb-2'>Duration (minutes) *</label>
//                                                                 <input name='duration' type='number' value={interviewForm.duration} onChange={handleInterviewChange} placeholder='e.g. 60' className='w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent' />
//                                                             </div>

//                                                             <div className='md:col-span-2 relative'>
//                                                                 <label className='block text-sm font-medium text-gray-700 mb-2'>Job Description *</label>
//                                                                 <textarea name='jobDescription' value={interviewForm.jobDescription} onChange={handleInterviewChange} placeholder='Describe the role and responsibilities...' rows='4' className='w-full border h-[220px] border-gray-300 rounded-lg p-3 focus:outline-none transition-all duration-75 focus:border-2 focus:border-orange-500 resize-none' />
//                                                                 <div onClick={enhanceWithAI} className='underline text-orange-500  font-normal absolute top-[1px] right-3 flex hover:cursor-pointer'>
//                                                                     <div className='' >
//                                                                         <SparkleLoader isEnhancing={isEnhancing} />
//                                                                     </div>
//                                                                     {/* <img className='w-10 h-fit' src={gemai} alt="Enhance with AI" /> */}
//                                                                     Enhance job description with AI
//                                                                 </div>
//                                                             </div>
//                                                         </div>
//                                                     </div>

//                                                     {/* Requirements */}
//                                                     <div>
//                                                         <h3 className='text-lg font-medium text-gray-900 mb-4'>Requirements</h3>
//                                                         <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
//                                                             <div>
//                                                                 <label className='block text-sm font-medium text-gray-700 mb-2'>Minimum Qualification</label>
//                                                                 <input name='minimumQualification' value={interviewForm.minimumQualification} onChange={handleInterviewChange} placeholder="e.g. Bachelor's Degree and 2 years of experience" className='w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent' />
//                                                             </div>

//                                                             <div>
//                                                                 <label className='block text-sm font-medium text-gray-700 mb-2'>Expiry Date</label>
//                                                                 <input name='expiryDate' type='date' value={interviewForm.expiryDate} onChange={handleInterviewChange} className='w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent' />
//                                                             </div>

//                                                             <div className='md:col-span-2'>
//                                                                 <label className='block text-sm font-medium text-gray-700 mb-2'>Required Skills</label>
//                                                                 <input name='minimumSkills' value={interviewForm.minimumSkills} onChange={handleInterviewChange} placeholder='e.g. React, Node.js, TypeScript' className='w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent' />
//                                                             </div>
//                                                         </div>
//                                                     </div>

//                                                     {/* otokend Candidates */}
//                                                     <div className=''>
//                                                         <div className='flex items-center justify-between mb-4'>
//                                                             <div className='flex'>
//                                                                 <h3 className='text-lg font-medium text-gray-900'>Allowed Candidates</h3>

//                                                                 {/* <label className='flex cursor-pointer select-none items-center'>
//                                                                     <div className='relative'>
//                                                                         <input
//                                                                             type='checkbox'
//                                                                             checked={isChecked}
//                                                                             onChange={handleCheckboxChange}
//                                                                             aria-checked={isChecked}
//                                                                             className='sr-only'
//                                                                         />
//                                                                         <div className={`block h-7 w-12 rounded-full transition-colors duration-200 ${isChecked ? 'bg-orange-400' : 'bg-[#E5E7EB]'}`} />
//                                                                         <div
//                                                                             className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${isChecked ? 'translate-x-6' : 'translate-x-0 ml-1'}`}
//                                                                         />
//                                                                     </div>
//                                                                 </label> */}

//                                                             </div>

//                                                             {/* <button type='button' onClick={addotokendCandidate} className='text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1'>
//                                                                 <span className='text-lg'>+</span> Add Candidate
//                                                             </button> */}
//                                                         </div>

//                                                         <div className='flex gap-3 items-start p-4 bg-gray-50 rounded-lg border border-gray-200'>
//                                                             <select name='candidateSheetId' value={interviewForm.candidateSheetId} onChange={handleInterviewChange} className='w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white'>
//                                                                 <option value=''>Select Sheet</option>
//                                                                 {sheetsNames.map((r, i) => (
//                                                                     <option key={r._id || i} value={r.id}>{r.name}</option>
//                                                                 ))}
//                                                             </select>
//                                                         </div>
//                                                         {/* <div className='space-y-3'>
//                                                             {(interviewForm.otokendCandidates || []).length === 0 ? (
//                                                                 <div className='text-center py-8 border-2 border-dashed border-gray-300 rounded-lg'>
//                                                                     <p className='text-gray-500 text-sm'>No candidates added yet</p>
//                                                                     <button type='button' onClick={addotokendCandidate} className='mt-2 text-orange-600 hover:text-orange-700 font-medium text-sm'>
//                                                                         Add your first candidate
//                                                                     </button>
//                                                                 </div>
//                                                             ) : (
//                                                                 interviewForm.otokendCandidates.map((cand, idx) => (
//                                                                     <div key={idx} className='flex gap-3 items-start p-4 bg-gray-50 rounded-lg border border-gray-200'>
//                                                                         <div className='flex-1 grid grid-cols-1 md:grid-cols-3 gap-3'>
//                                                                             <input className='border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent' placeholder='Name' value={cand.name} onChange={(e) => handleotokendCandidateChange(idx, 'name', e.target.value)} />
//                                                                             <input className='border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent' placeholder='Email' value={cand.email} onChange={(e) => handleotokendCandidateChange(idx, 'email', e.target.value)} />
//                                                                             <input className='border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent' placeholder='Phone' value={cand.phone} onChange={(e) => handleotokendCandidateChange(idx, 'phone', e.target.value)} />
//                                                                         </div>
//                                                                         <button type='button' onClick={() => removeotokendCandidate(idx)} className='text-red-500 hover:text-red-700 p-2'>
//                                                                             <svg className='w-5 h-5' fill='currentColor' viewBox='0 0 20 20'>
//                                                                                 <path fillRule='evenodd' d='M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z' clipRule='evenodd' />
//                                                                             </svg>
//                                                                         </button>
//                                                                     </div>
//                                                                 ))
//                                                             )}
//                                                         </div> */}
//                                                     </div>

//                                                     {/* Interview Questions */}
//                                                     <div>
//                                                         <div className='flex items-center justify-between mb-4'>
//                                                             <h3 className='text-lg font-medium text-gray-900'>Interview Questions</h3>
//                                                             <button type='button' onClick={addInterviewQuestion} className='text-sm bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors'>
//                                                                 Add Question
//                                                             </button>
//                                                         </div>
//                                                         <div className='space-y-3'>
//                                                             {interviewQuestions.map((q, idx) => (
//                                                                 <div key={idx} className='flex gap-3 items-center'>
//                                                                     <span className='text-gray-500 font-medium min-w-[30px]'>{idx + 1}.</span>
//                                                                     <input type='text' value={q} onChange={(e) => handleInterviewQuestionChange(idx, e.target.value)} placeholder={`Enter question ${idx + 1}`} className='flex-1 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent' />
//                                                                     <button type='button' onClick={() => removeInterviewQuestion(idx)} className='text-gray-400 hover:text-red-600 p-2 transition-colors'>
//                                                                         <svg className='w-5 h-5' fill='currentColor' viewBox='0 0 20 20'>
//                                                                             <path fillRule='evenodd' d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z' clipRule='evenodd' />
//                                                                         </svg>
//                                                                     </button>
//                                                                 </div>
//                                                             ))}
//                                                         </div>
//                                                     </div>
//                                                 </div>
//                                             </div>

//                                             {/* Footer */}
//                                             <div className='flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50'>
//                                                 <button
//                                                     onClick={() => { setInterviewCreateWindow(false) }}
//                                                     type='button' className='px-6 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors'>
//                                                     Cancel
//                                                 </button>
//                                                 <button
//                                                     onClick={() => createinterview()}
//                                                     type="button" className='px-6 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium shadow-sm transition-colors'>
//                                                     Create Interview
//                                                 </button>
//                                             </div>
//                                         </div>
//                                     </div>
//                                 }
//                             </div>



//                         </div>

//                     </div>


//                     {/* the create interview page start here -------------------------------------------------------------------- */}
//                     {/* <div className='absolute top-0 p-20 bg-red-400 w-full h-full'>

//                     </div> */}
//                     {/* the create interview page end here -------------------------------------------------------------------- */}
//                 </>
//             ) : (
//                 <div className='min-h-[60vh] flex h-[100vh] items-center justify-center bg-neutral-50'>
//                     <div className='flex items-center gap-3'>
//                         <svg className='animate-spin h-6 w-6 text-orange-500' viewBox='0 0 24 24'>
//                             <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' fill='none'></circle>
//                             <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z'></path>
//                         </svg>
//                         <div className='text-gray-600 text-base font-medium'>Loading...</div>
//                     </div>
//                 </div>
//             )}
//         </>
//     )
// }



// export default ProfileHr

