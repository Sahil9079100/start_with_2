import { useState } from 'react'
import API from '../../axios.config.js'

export default function Schedule() {
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [organization, setOrganization] = useState('')
    const [phone, setPhone] = useState('')
    const [message, setMessage] = useState('')
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e) {
        e.preventDefault()
        const payload = { fullName, email, organization, phone, message }

        console.log('Schedule request:', payload)
        setLoading(true)
        setError(null)
        try {
            const response = await API.post('/api/schedule', payload)
            if (response.status === 200) {
                // Clear form fields on successful submission
                setFullName('')
                setEmail('')
                setOrganization('')
                setPhone('')
                setMessage('')
                setError(null)
                setSuccess(true)
                // alert('Your request has been submitted successfully!')
            } else {
                setError('Failed to submit your request. Please try again.')
            }
        } catch (error) {
            console.error('Error submitting schedule request:', error);
            setError('An error occurred while submitting your request. Please try again later.');
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#f3f3f3]">
            {/* Header / Logo */}
            <header className="px-8 py-6">
                <div className="flex flex-col leading-tight w-fit">
                    <span className="text-lg font-bold tracking-widest uppercase">Startwith_</span>
                    <span className="text-[10px] tracking-[0.35em] text-black uppercase  flex justify-between">
                        <span>S</span>
                        <span>C</span>
                        <span>H</span>
                        <span>E</span>
                        <span>D</span>
                        <span>U</span>
                        <span>L</span>
                        <span>E</span>
                    </span>
                </div>
            </header>

            {/* Big Heading */}
            <section className="text-center pt-6 pb-4">
                <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight">SCHEDULE A MEETING</h1>
                <div className="mt-6 mx-auto w-11/12 max-w-4xl border-b border-gray-400" />
            </section>

            {/* Content */}
            <main className="max-w-5xl mx-auto px-8 py-16 grid grid-cols-1 md:grid-cols-2 gap-16">
                {/* Left - Contact Info */}
                <div className="flex flex-col justify-center font-serif text-lg leading-relaxed">
                    <p className="font-semibold text-xl mb-1 not-italic" style={{ fontFamily: 'sans-serif' }}>Startwith_</p>
                    <p className="italic"> For any query</p>
                    <p className="italic">Email us at</p>
                    <p className="italic">contact@startwith.live</p>
                    {/* <p className="italic">+91 98765 43210</p> */}
                </div>

                {/* Right - Form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <input
                        required
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        placeholder="Full name"
                        className="bg-transparent border-b border-gray-400 py-2 text-sm placeholder-gray-500 focus:outline-none focus:border-black"
                    />
                    <input
                        required
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="Email"
                        className="bg-transparent border-b border-gray-400 py-2 text-sm placeholder-gray-500 focus:outline-none focus:border-black"
                    />
                    <input
                        required
                        value={organization}
                        onChange={e => setOrganization(e.target.value)}
                        placeholder="Organization"
                        className="bg-transparent border-b border-gray-400 py-2 text-sm placeholder-gray-500 focus:outline-none focus:border-black"
                    />
                    <input
                        required
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="Phone number"
                        className="bg-transparent border-b border-gray-400 py-2 text-sm placeholder-gray-500 focus:outline-none focus:border-black"
                    />
                    <textarea
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder="Your Message"
                        rows={3}
                        className="bg-transparent border-b border-gray-400 py-2 text-sm placeholder-gray-500 resize-none focus:outline-none focus:border-black"
                    />

                    {success ? (
                        <button
                            disabled
                            className="self-start mt-4 border border-green-600 bg-green-600 text-white px-5 py-2 text-sm cursor-default"
                        >
                            ✓ Scheduled, We'll get back to you asap!
                        </button>
                    ) : (
                        <button
                            type="submit"
                            disabled={loading}
                            className="self-start mt-4 border border-gray-500 px-5 py-2 text-sm hover:bg-black hover:text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Sending...' : 'Schedule'}
                        </button>
                    )}
                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </form>
            </main>
        </div>
    )
}