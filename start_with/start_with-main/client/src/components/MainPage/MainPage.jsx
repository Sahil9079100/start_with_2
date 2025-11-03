import React from 'react'
import { FaLocationArrow } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';

const MainPage = () => {
    const navigate = useNavigate()
    return (
        <div className='w-full h-[100vh] bg-neutral-200 flex flex-col justify-center items-center text-6xl font-bold'>
            Start With
            <div onClick={() => { navigate("/r/o") }} className='bg-orange-500/90 text-xl flex items-center justify-center gap-3 px-4 py-3 rounded-lg hover:cursor-pointer hover:bg-orange-500 text-black font-semibold mt-10 transistion-all duration-300'>
                Register Now <FaLocationArrow />
            </div>
        </div>
    )
}

export default MainPage