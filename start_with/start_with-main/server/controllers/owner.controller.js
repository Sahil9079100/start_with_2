import Owner from "../models/owner.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { geminiAPI } from "../server.js";
import { Interview } from "../models/Interview.model.js";
import SheetDataExtractJsonModel from "../models/SheetDataExtractJson.model.js";
import InterviewGSheetStructureModel from "../models/InterviewGSheetStructure.model.js";
import { Candidate } from "../models/Candidate.model.js";
import { IntreviewResult } from "../models/IntreviewResult.model.js";
// import Company from "../model/company.model.js";
// import Recruiter from "../model/recruiter.model.js";
// import Interview from "../model/interview.model.js";


export const RegisterOwner = async (req, res) => {
    try {
        const { name, email, phone, password, secretKey } = req.body

        if (!secretKey == process.env.SECRET_KEY_OWNER) return res.status(401).json({ message: "secret key not matched" })

        const newOwnerExists = await Owner.findOne({ email });
        if (newOwnerExists) {
            return res.status(400).json({ message: "Owner with this email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newowner = new Owner({ name, email, phone, password: hashedPassword, secretKey });
        await newowner.save();

        const token = jwt.sign({ id: newowner._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.cookie("otoken", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            // use 'lax' in development so cross-site requests from localhost can receive/send the cookie
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 24 * 60 * 60 * 1000
        });

        res.status(201).json({ message: "Owner created successfully", owner: newowner._id, token });
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Error creating owner", error });
    }
};


export const LoginOwner = async (req, res) => {
    try {
        const { email, password, secretKey } = req.body;

        if (!secretKey == process.env.SECRET_KEY_OWNER) return res.status(401).json({ message: "secret key not matched" })

        const owner = await Owner.findOne({ email });
        if (!owner) {
            return res.status(400).json({ message: "Owner with this email does not exist" });
        }

        const isPasswordValid = await bcrypt.compare(password, owner.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Invalid password" });
        }

        // console.log(process.env.NODE_ENV)
        const token = jwt.sign({ id: owner._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.cookie("otoken", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "None",
            maxAge: 24 * 60 * 60 * 1000
        });

        res.status(200).json({ message: "Login successful", owner: owner._id, token });
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Error logging in", error });
    }
}

export const getProfile = async (req, res) => {
    try {
        const ownerid = req.user;

        const owner = await Owner.findById(ownerid);
        if (!owner) {
            return res.status(404).json({ message: "Owner not found" });
        }

        // const companies = [];
        // if (owner.company && Array.isArray(owner.company)) {
        //     for (const companyId of owner.company) {
        //         const company = await Company.findById(companyId);
        //         // console.log("new company", company)

        //         if (company) {
        //             companies.push(company);
        //         }
        //     }
        // }
        // owner.company = companies;

        // const recruiters = [];
        // if (owner.recrutier && Array.isArray(owner.recrutier)) {
        //     for (const recrutierId of owner.recrutier) {
        //         let recruiterObjectId = recrutierId;
        //         if (typeof recrutierId === 'object' && recrutierId.$oid) {
        //             recruiterObjectId = recrutierId.$oid;
        //         }
        //         const recruiter = await Recruiter.findById(recruiterObjectId);
        //         if (recruiter) {
        //             recruiters.push(recruiter);
        //         }
        //     }
        // }
        // owner.recrutier = recruiters;
        // const plainOwner = owner.toObject();
        // plainOwner.recrutier = recruiters;
        res.status(200).json({ message: "Profile fetched successfully", owner: owner });
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "get profile error" })
    }
}

export const enhanceJobDescription = async (req, res) => {
    try {
        const { jobDescription } = req.body;

        if (!jobDescription || jobDescription.trim() === '') {
            return res.status(400).json({ message: "Job description is required" });
        }

        //geminiAPI 

        const model = geminiAPI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `
        Your Task: Enhance the following job description to make it more detailed.
        Here is the Job Description:\n\n${jobDescription}\n\n
        Please provide the enhanced job description in JSON format with the key "enhancedJobDescription" with around 100-150 words, the description should be concise and on the topic.
        You are required to only provide the JSON format without any additional text, because your answer will be used by a machine to parse it.
        `;

        const result = await model.generateContent(prompt);
        // The Gemini model may return a structured response object or a Response-like
        // object with a .text() method. We need to extract the raw text, attempt to
        // parse JSON from it, and return the `enhancedJobDescription` field.

        let enhancedJobDescription = '';
        try {
            let text = '';

            if (result == null) {
                throw new Error('Empty response from Gemini API');
            }

            if (result.response) {
                const resp = await result.response;
                if (resp && typeof resp.text === 'function') {
                    text = await resp.text();
                } else if (typeof resp === 'string') {
                    text = resp;
                } else if (resp && resp.outputText) {
                    text = resp.outputText;
                } else {
                    text = JSON.stringify(resp);
                }
            } else if (result.outputText) {
                text = result.outputText;
            } else if (typeof result === 'string') {
                text = result;
            } else if (result.toString) {
                text = result.toString();
            } else {
                text = JSON.stringify(result);
            }

            // Try to parse JSON. The model may include surrounding commentary, so
            // attempt to extract the first JSON object-like substring.
            let jsonText = text.trim();
            const firstBrace = jsonText.indexOf('{');
            const lastBrace = jsonText.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
                jsonText = jsonText.slice(firstBrace, lastBrace + 1);
            }

            const parsed = JSON.parse(jsonText);
            enhancedJobDescription = parsed.enhancedJobDescription || parsed.enhanced || parsed.text || '';
        } catch (parseError) {
            console.log('Error parsing JSON response from Gemini API:', parseError);
            // As a fallback, try to return any textual content we can find on the result
            try {
                if (result && result.response) {
                    const resp = await result.response;
                    if (resp && typeof resp.text === 'function') {
                        enhancedJobDescription = await resp.text();
                    } else {
                        enhancedJobDescription = JSON.stringify(resp || result);
                    }
                } else if (result && result.outputText) {
                    enhancedJobDescription = result.outputText;
                } else if (typeof result === 'string') {
                    enhancedJobDescription = result;
                } else {
                    enhancedJobDescription = JSON.stringify(result || {});
                }
            } catch (e) {
                console.log('Fallback extraction failed:', e);
                return res.status(500).json({ message: 'Error processing enhanced job description' });
            }
        }

        res.status(200).json({ message: 'Job description enhanced successfully', enhancedJobDescription });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Error enhancing job description" });
    }
}

export const getSkillsUsingAI = async (req, res) => {
    try {
        const { jobPosition } = req.params;

        if (!jobPosition) return res.status(400).json({ message: "Job Position is required" });
        // Call to AI service to get skills
        const model = geminiAPI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' }); //gemini-2.0-flash-lite

        const prompt = `
Given the job position of '[${jobPosition}]', please generate a list of 4-5 of the most relevant and essential technical skills or programming languages required for this role. Return the skills as a JSON array of strings.

For example, if the job position is 'Senior Backend Developer', the output should be:
["Node.js", "Express.js", "MongoDB", "RESTful APIs", "GraphQL"]
Now, generate the skills for the job position: '[${jobPosition}]'.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = await response.text();

        let skills = [];
        try {
            // The response might contain markdown ```json ... ```, so we need to extract the JSON part.
            const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch && jsonMatch[1]) {
                skills = JSON.parse(jsonMatch[1]);
            } else {
                // Fallback for plain JSON array, in case the format changes.
                skills = JSON.parse(text);
            }
        } catch (e) {
            console.error("Error parsing AI response for skills:", e);
            // If parsing fails, return an empty array or handle the error as needed.
        }

        res.status(200).json({ message: "Skills fetched successfully", skills });
    } catch (error) {
        console.log("Error fetching skills using AI:", error);
        res.status(500).json({ message: "Error fetching skills using AI", error });
    }
}

export const CreateInterview = async (req, res) => {
    try {
        const { company, recruiter, allowedCandidates, expiryDate, interviewUrl, questions, jobPosition, jobDescription, duration, minimumQualification, minimumSkillsRequired } = req.body;

        console.log("this is req body: ", req.body)

        const company_search = await Company.findById(company);
        if (!company_search) {
            return res.status(404).json({ message: "Company not found" });
        }
        const recruiter_search = await Recruiter.findById(recruiter);
        if (!recruiter_search) {
            return res.status(404).json({ message: "Recruiter not found" });
        }

        const payload = {
            company,
            owner: req.user,
            recruiter,
            allowedCandidates,
            expiryDate,
            interviewUrl: null,
            candidatesJoined: [],
            jobPosition,
            jobDescription,
            duration,
            minimumQualification,
            questions,
            minimumSkills: minimumSkillsRequired
        }

        console.log("this is payload: ", payload)

        const new_interview = new Interview(payload);

        await new_interview.save();
        const url = "http://localhost:5000/interview/" + new_interview._id + "/login";
        console.log("this is url: ", url)

        new_interview.interviewUrl = url;

        await new_interview.save();
        company_search.interviews.push(new_interview._id);
        await company_search.save();

        res.status(200).json({ message: "interview created successfully", data: new_interview })
    } catch (error) {
        console.log("create interview error", error)
        res.status(500).json({ message: "create interview error" })
    }
}

export const FetchAllInterviews = async (req, res) => {
    try {
        const ownerid = req.user;

        const interviews = await Interview.find({ owner: ownerid }).select('-questions');

        res.status(200).json({ message: "Interviews fetched successfully", data: interviews })
    } catch (error) {
        console.log("fetch all interviews error", error)
        res.status(500).json({ message: "fetch all interviews error" })
    }
}

export const DeleteInterviews = async (req, res) => {
    try {
        const ownerid = req.user;
        console.log("this is owner id: ", ownerid, req.user)
        const { interviewid } = req.body;
        if (!interviewid) return res.status(400).json({ message: "Interview id is required" });

        const interviews = await Interview.findById(interviewid);
        if (!interviews) return res.status(404).json({ message: "Interview not found" });

        console.log(interviews.owner, ownerid)
        if (interviews.owner.toString() != ownerid.toString()) return res.status(403).json({ message: "You are not authorized to delete this interview" });

        await Interview.findByIdAndDelete(interviewid);

        // const SheetDataExtractJson_delete = await SheetDataExtractJsonModel.findByIdAndDelete({ interview: interviewid });
        // if (!SheetDataExtractJson_delete) return res.status(404).json({ message: "No SheetDataExtractJson found for this interview" });

        // const InterviewGSheetStructure_delete = await InterviewGSheetStructureModel.findByIdAndDelete({ interview: interviewid });
        // if (!InterviewGSheetStructure_delete) return res.status(404).json({ message: "No InterviewGSheetStructure found for this interview" });

        // const candidate_delete = await Candidate.deleteMany({ interview: interviewid });
        // if (!candidate_delete) return res.status(404).json({ message: "No candidates found for this interview" });


        res.status(200).json({ message: "Interview deleted successfully" });
    }
    catch (error) {
        console.log("Error while deleting the interview ", error);
        res.status(500).json({ message: "Error deleting the Interview" })
    }
}

export const FetchSortedListCandidates = async (req, res) => {
    try {
        const interviewId = req.params.id;
        const sortedCandidates = await Candidate.find({ interview: interviewId })
            .sort({ matchScore: -1 });

        res.status(200).json({ message: "Sorted list fetched successfully", data: { sortedCandidates } });
    } catch (error) {
        console.log("fetch sorted list error", error);
        res.status(500).json({ message: "fetch sorted list error" });
    }
}

export const FetchCandiateCompletedInterviewDetails = async (req, res) => {
    try {
        const interviewId = req.params.id;
        const findInterview = await Interview.findById(interviewId);
        if (!findInterview) return res.status(404).json({ message: "Interview not found" })
        const completedInterviewEntries = findInterview.usercompleteintreviewemailandid;
        const sortedCandidateInterviews = [];
        for (const entry of completedInterviewEntries) {
            const interviewResult = await IntreviewResult.findById(entry.intreviewid);
            if (interviewResult) {
                sortedCandidateInterviews.push({
                    email: entry.email,
                    interviewResult
                });
            }
        }
        res.status(200).json({ message: "Candidate completed interview details fetched successfully", data: { sortedCandidateInterviews } });
    } catch (error) {
        console.log("fetch candiate completed interview details error", error);
        res.status(500).json({ message: "fetch candiate completed interview details error" });
    }
}
// export const CreateCompany = async (req, res) => {
//     try {
//         const { name, location, website, size, industry, recruiters } = req.body

//         // console.log('req..user is company owner:-', req.user)

//         console.log(name, location, website, size, industry, recruiters)

//         const company_data = {
//             name,
//             details: [{
//                 location, website, size, industry
//             }],
//             owner: req.user,
//             recruiters,
//             interviews: []
//         }

//         const new_company = new Company(company_data)
//         await new_company.save();

//         const owner = await Owner.findById(req.user);
//         owner.company.push(new_company._id)
//         await owner.save()

//         res.status(201).json({ message: "Company created successfully", data: new_company })
//     } catch (error) {
//         console.log(error)
//         res.status(500).json({ message: "create company error" })
//     }
// }

// export const CreateRecruiter = async (req, res) => {
//     try {
//         const { name, email, phone, company, position } = req.body;


//         console.log("this is req body: ", req.body)
//         const ownerid = req.user;
//         const owner = await Owner.findById(ownerid);
//         if (!owner) {
//             return res.status(404).json({ message: "Owner not found" });
//         }

//         // Check if the company belongs to the owner
//         if (!owner.company.includes(company)) {
//             return res.status(403).json({ message: "You do not have permission to add recruiters to this company" });
//         }


//         // add the recrutier in  the Recrutier schema
//         const new_recrutier_data = {
//             name,
//             email,
//             phone,
//             company,
//             position
//         }
//         const new_recrutier = new Recruiter(new_recrutier_data)
//         await new_recrutier.save()

//         owner.recrutier.push(new_recrutier._id)
//         const company_search = await Company.findById(company)
//         company_search.recruiters.push(new_recrutier._id)
//         await company_search.save()
//         await owner.save()


//         res.status(200).json({ message: "recruiter added successfully", data: new_recrutier_data })
//     } catch (error) {
//         console.log(error)
//         res.status(500).json({ message: "add recruiter error" })
//     }
// }


/**
 * This is job description for s Writer role, a content writer role, who should be able to write content about any topic in easy and engaging way.
 */

//12th pass and creative
//creativity, content writing skills

// How are you going to approch to write content on a specific topic?
// How would you write a content about a topic you dont have much knowledge about?

/*


Ok so you adde 4 status, but i have more form my  side, so understand these status:
a. intial = here the only thing happend is that the interview plyload is just saved directly in the DB, and no further process started.

b. sheet_data_structure = Here after the interview details are saved, we will take the google sheet id then try to fetch top 5 rows, the first row will contain the fieled names, like  "Name","resume Url", "Email", etc. and the next row will have the data of the users. So after fetching the data will be sent to a AI Agent named "sheet_structure_finder_agent" which will take the data, then using AI it will tell us which coloum is which, so it will give a json output, somehting like this: A1:"Name", B1:"resume Url", C1:"Email", which we will will store in DB or in just a variable(we will figure this out where to save), so the status will be "sheet_data_structure" when this whole process is done successfully.

c. sheet_data_extract_json = here we wiill take the output data from the previous step, so we have the structure of the sheet now, so now we will extract 'all' the data form the sheet easily, it can take time, and we will not fetch all data at one time, because it can cause some error, so we will fetch in buffer like if there are 200 rows of people, then we will fetch in 5 people at a time, then this will run in a loop until we reach the end of the rows, and we will save the data in the DB and we will also keep the log of the buffer, like we are at buffer 3 (3 means we fetched 5 people 3 times, so total 15 people data), then at the end of the process we will have the whole data of a sheet in the DB. then we can show the status "sheet_data_extract_json"

d. seperate_resume_urls_and save = So this is a small work that we need to do, so we will fetch the data of the extracted sheet from the DB that we saved in earlier status, then we will seperate the 'email' and 'resume url' of each candiates, then we will save it in a new model named "Candiates", and in this we will save each use in a document, so its something like this:
{
name: Sahil,
email: shail@gmail.com,
phone:1212212,
resumeurll: http://drive.google.com/asdbadjb/view,
//other information of the candiates,
resume_summery: "", // here we will save the ""summary or text extarctor form pdf"" of the resume later, right now its empty, it will be filled in next status, next step.
isResumeScanned:false // later it will be true when the text is extrated in 'resume_summery'
interviews:[], // all the interviews he took/ now important right now
}
So this is what this step does.

e. extract_text_from_resumeurl = this step is huge, and it i will take time to complete too, so we will fetch each user one by one from the "Candiates" model, and we will fetch them using interview id and the email of each user, and if the user has "isResumeScanned" = true then we will just skip it, and if the "isResumeScanned"= false , then we will pass the resume url to the TextExtrator function, which will take the resume url as input and then it will output the text form that resume url, and we will have the text extrated as output, then we will save that output in the 'resume_summery' and we will also do "isResumeScanned=true", then we will do this for all the valid candidates.

f.


*/






















// ["initial", "sheet_data_structure", "sheet_data_extract_json", "seperate_resume_urls_and_save", "extract_text_from_resumeurl", "sort_resume_as_job_description", "wating_for_recrutier", "send_email_to_candidates", "interview_successfully_processed"]
/*
Ok so you adde 4 status, but i have more form my  side, so understand these status:
a. initial = here the only thing happend is that the interview plyload is just saved directly in the DB, and no further process started.

b. sheet_data_structure = Here after the interview details are saved, we will take the google sheet id then try to fetch top 5 rows, the first row will contain the fieled names, like  "Name","resume Url", "Email", etc. and the next row will have the data of the users. So after fetching the data will be sent to a AI Agent named "sheet_structure_finder_agent" which will take the data, then using AI it will tell us which coloum is which, so it will give a json output, somehting like this: A1:"Name", B1:"resume Url", C1:"Email", which we will will store in DB or in just a variable(we will figure this out where to save), so the status will be "sheet_data_structure" when this whole process is done successfully.

c. sheet_data_extract_json = here we wiill take the output data from the previous step, so we have the structure of the sheet now, so now we will extract 'all' the data form the sheet easily, it can take time, and we will not fetch all data at one time, because it can cause some error, so we will fetch in buffer like if there are 200 rows of people, then we will fetch in 5 people at a time, then this will run in a loop until we reach the end of the rows, and we will save the data in the DB and we will also keep the log of the buffer, like we are at buffer 3 (3 means we fetched 5 people 3 times, so total 15 people data), then at the end of the process we will have the whole data of a sheet in the DB. then we can show the status "sheet_data_extract_json"

d. seperate_resume_urls_and_save = So this is a small work that we need to do, so we will fetch the data of the extracted sheet from the DB that we saved in earlier status, then we will seperate the 'email' and 'resume url' of each candiates, then we will save it in a new model named "Candiates", and in this we will save each use in a document, so its something like this:
{
name: Sahil,
email: shail@gmail.com,
phone:1212212,
resumeurll: http://drive.google.com/asdbadjb/view,
//other information of the candiates,
resume_summery: "", // here we will save the ""summary or text extarctor form pdf"" of the resume later, right now its empty, it will be filled in next status, next step.
isResumeScanned:false // later it will be true when the text is extrated in 'resume_summery'
interviews:[], // all the interviews he took/ now important right now
}
So this is what this step does.

e. extract_text_from_resumeurl = this step is huge, and it i will take time to complete too, so we will fetch each user one by one from the "Candiates" model, and we will fetch them using interview id and the email of each user, and if the user has "isResumeScanned" = true then we will just skip it, and if the "isResumeScanned"= false , then we will pass the resume url to the TextExtrator function, which will take the resume url as input and then it will output the text form that resume url, and we will have the text extrated as output, then we will save that output in the 'resume_summery' and we will also do "isResumeScanned=true", then we will do this for all the valid candidates. And if this step complete fully then we can put status 'extract_text_from_resumeurl'

f. sort_resume_as_job_description = So till this step we have all the candiates data and there resume data extrated, now we will take each candiate resume, and then pass it to a AI Agent named "Resumer Sorter" which will take the candiate resume text and job description, then it will check if the candiate is eligible for this job or not, it will tell if the candiate is "High Match", "Medium Match", "Low Match", "Unqualified", And the agent will also give a score out of 100, which will or should be really accurate, we will figure this out later.
So once the resume are sorted, we will save this in a new mode "SortedResumeList" which will have the interview id, and the list of all the emails of the candiates and there score and some details. Then after all that, we will make status=sort_resume_as_job_description

g. wating_for_recrutier = So in this step we will simply send the sorted list to the recrutier, and then do nothing, and just wait for him, to allow to send email, but for that he will click a button on his dashbaord, so yeah this step is very simple, we will send the sorted list to the recrutier, thats all.
And we will do status=wating_for_recrutier once we send it

h. send_email_to_candidates = So in this step we will send the email to the the candiates, so when the recrutier allow from the frotned to send the emails, he can either select indivisual candiates form the sorted list to which he wants to send the email, or he can send to all of the candiates who are qualified, then in the backend we will first save the people whom we had to sent email, then run a function which sends one email at a time to each candiates, and also it send the URL of the interview also, so that the candidates can click on the URL and start giving the inetrview, thats all.
After all the emails are sent, we will put status=send_email_to_candidates

i. interview_successfully_processed = So now we are at final stage, we will just check all the details are correct, or we can just send some details to the recrutier, and send him "Interview Process Completed" and "Emails are sent to the candidates", and he can check to which candidas the email is sent, nothing else. Then after that we are done with this wholea part, then we can do status="interview_successfully_processed"


j. So there is more things remaning, but thats is related to actual interview, so we will focus on that later, so our main big goal is to do all this flow form 'a' to 'i'

Got it?
*/