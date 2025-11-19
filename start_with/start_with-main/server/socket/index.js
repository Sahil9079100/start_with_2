// socket/index.js
import { Server } from "socket.io";
import authSocket from "./middleware/authSocket.js";

let io; // we’ll export this later for other modules to use

export function initSocket(server) {
    console.log("In the socket", process.env.FRONTEND_URL)
    io = new Server(server, {
        cors: {
            origin: [`${process.env.FRONTEND_URL}`, 'http://localhost:5173', 'https://3a9a33cf9829.ngrok-free.app', 'https://coruscating-crumble-6992a8.netlify.app'],
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    // Apply middleware for authentication
    io.use(authSocket);

    // Handle connections
    io.on("connection", (socket) => {
        console.log("✅ Socket connected:", socket.id, "User:", socket.user?.email || socket.user?.id);
        const ownerRoom = `owner:${socket.user.id}`;
        socket.join(ownerRoom);
        console.log(`🏠 Joined owner room: ${ownerRoom}`);
        console.log("-----------------------------------------------------------------------");

        // Example event handler
        socket.on("test:send", (data) => {
            console.log("Received test:send:", data);
            socket.emit("test:receive", { msg: "Got your message!" });
        });

        socket.on("disconnect", (reason) => {
            console.log("❌ Socket disconnected:", socket.id, reason);
            console.log("-----------------------------------------------------------------------");
        });
    });

    console.log("🚀 Socket.io initialized successfully");
    return io;
}

// Helper to get io instance anywhere in your backend
export function getIO() {
    if (!io) throw new Error("Socket.io not initialized!");
    return io;
}



/*
["initial", "sheet_data_structure", "sheet_data_extract_json", "seperate_resume_urls_and_save", "extract_text_from_resumeurl", "sort_resume_as_job_description", "wating_for_recrutier", "send_email_to_candidates", "interview_successfully_processed"]
*/

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

e. extract_text_from_resumeurl = this step is huge, and it i will take time to complete too, so we will fetch each user one by one from the "Candiates" model, and we will fetch them using interview id and the email of each user, and if the user has "isResumeScanned" = true then we will just skip it, and if the "isResumeScanned"= false , then we will pass the resume url to the TextExtractor function, which will take the resume url as input and then it will output the text form that resume url, and we will have the text extrated as output, then we will save that output in the 'resume_summery' and we will also do "isResumeScanned=true", then we will do this for all the valid candidates. And if this step complete fully then we can put status 'extract_text_from_resumeurl'

f. sort_resume_as_job_description = So till this step we have all the candiates data and there resume data extrated, now we will take each candiate resume, and then pass it to a AI Agent named "Resumer Sorter" which will take the candiate resume text and job description of that interview, then first it will check if the candiate is even eligible for this job or not, then it will tell if the candiate is "High Match", "Medium Match", "Low Match" or "Unqualified", And the agent will also give a score out of 100 with very accuracy, which will or should be really accurate, we will figure this out how we will make the AI Agent answer the score very accurate.
So once a resume is sorted, we will save the 'score' and 'match' in the 'Candidate' model, i will add two new fields to the Candidate model, "matchLevel" and "matchScore", so we will save these two things in the Candidate model.
And we will do this for all the candidates one by one, and at the end we will have all the candidates sorted with match level and score. Then after all that, we will make status=sort_resume_as_job_description

g. waiting_for_recruiter = So in this step we will simply send the sorted list to the recrutier, and then do nothing, and just wait for him, to allow to send email, but for that he will click a button on his dashbaord, so yeah this step is very simple, we will send the sorted list to the recrutier, thats all.
And we will do status=wating_for_recrutier once we send it

h. send_email_to_candidates = So in this step we will send the email to the the candiates, so when the recrutier allow from the frotned to send the emails, he can either select indivisual candiates form the sorted list to which he wants to send the email, or he can send to all of the candiates who are qualified, then in the backend we will first save the people whom we had to sent email, then run a function which sends one email at a time to each candiates, and also it send the URL of the interview also, so that the candidates can click on the URL and start giving the inetrview, thats all.
After all the emails are sent, we will put status=send_email_to_candidates

i. interview_successfully_processed = So now we are at final stage, we will just check all the details are correct, or we can just send some details to the recrutier, and send him "Interview Process Completed" and "Emails are sent to the candidates", and he can check to which candidas the email is sent, nothing else. Then after that we are done with this wholea part, then we can do status="interview_successfully_processed"


j. So there is more things remaning, but thats is related to actual interview, so we will focus on that later, so our main big goal is to do all this flow form 'a' to 'i'

And yeah i will emit logs at every point of the ste, wheater its step from A to I or weather its in-between step.
*/