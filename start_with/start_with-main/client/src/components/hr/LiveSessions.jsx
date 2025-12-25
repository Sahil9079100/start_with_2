import useLiveSessionCount from "../../socket/useLiveSessionCount";
// import useLiveSessionCount from "../socket/useLiveSessionCount";

function Dashboard() {
    const { liveCount, sessions, isLoading } = useLiveSessionCount();

    return (
        <div>
            {isLoading ? "Loading..." : `${liveCount} people are using currently`}
        </div>
    );
}