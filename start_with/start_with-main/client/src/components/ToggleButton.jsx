import React, { useState } from 'react'

const Switcher1 = () => {
    const [isChecked, setIsChecked] = useState(false)

    const handleCheckboxChange = (e) => {
        setIsChecked(e.target.checked)
    }

    return (
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
                <div className={`block h-7 w-12 rounded-full transition-colors duration-200 ${isChecked ? 'bg-orange-400' : 'bg-[#E5E7EB]'}`} />

                {/* knob */}
                <div
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${isChecked ? 'translate-x-6' : 'translate-x-0 ml-1'}`}
                />
            </div>
        </label>
    )
}

export default Switcher1