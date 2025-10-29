import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const GIntegrationSuccess = () => {
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const connected = params.get("connected");

    const [timer, setTimer] = useState(5)
    const navigate = useNavigate()

    useEffect(() => {
        if (connected === 'google') {
            setTimer(5)
            const interval = setInterval(() => {
                setTimer(prev => Math.max(prev - 1, 0))
            }, 1000)

            return () => clearInterval(interval)
        }
    }, [connected, navigate])

    useEffect(() => {
        if (connected === 'google' && timer === 0) {
            const user_mongodb_id = localStorage.getItem('umid')
            localStorage.setItem('gsconn', '1'); // 1 represents the true
            navigate(`/p/o/${user_mongodb_id}`)
        }
    }, [timer, connected, navigate])

    return (
        <div className='w-full  h-[100vh] bg-neutral-200 flex justify-center items-center'>
            <div className='flex flex-col justify-center items-center text-2xl font-semibold'>
                {connected === "google" ? (
                    <>
                        <p>Google Sheets connected <span className='text-green-600'>successfully</span>!</p>
                        <span className='text-lg font-normal'>Redirecting you to profile page in {timer}...</span>
                    </>
                ) : (
                    <>
                        <p>No integrations yet. Please try again to connect</p>
                        <div onClick={() => { const user_mongodb_id = localStorage.getItem("umid"); navigate(`/p/o/${user_mongodb_id}`) }} className='bg-orange-400 px-3 py-2 rounded-md font-medium mt-3 cursor-pointer text-xl text-black'>Go to Profile</div>
                    </>
                )}
            </div>
        </div>
    )
}

export default GIntegrationSuccess
