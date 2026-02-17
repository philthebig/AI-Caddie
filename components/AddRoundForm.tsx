'use client'

import { createRound } from '@/app/actions'
import { useRef } from 'react'

export default function AddRoundForm() {
  const formRef = useRef<HTMLFormElement>(null)

  async function action(formData: FormData) {
    await createRound(formData)
    formRef.current?.reset() // Clear the form after submission
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 mb-8">
      <h3 className="text-xl font-bold mb-4 text-emerald-800">Log a New Round</h3>
      
      <form ref={formRef} action={action} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Course Name (Full Width) */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Course Name</label>
          <input name="courseName" type="text" required placeholder="e.g. Pebble Beach" 
                 className="w-full rounded-md border-slate-300 shadow-sm p-2 border" />
        </div>

        {/* Stats Grid */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Total Score</label>
          <input name="totalScore" type="number" required placeholder="72" 
                 className="w-full rounded-md border-slate-300 shadow-sm p-2 border" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Putts</label>
          <input name="totalPutts" type="number" required placeholder="30" 
                 className="w-full rounded-md border-slate-300 shadow-sm p-2 border" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Fairways Hit</label>
          <input name="fairwaysHit" type="number" required placeholder="8" 
                 className="w-full rounded-md border-slate-300 shadow-sm p-2 border" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">GIR</label>
          <input name="greensInReg" type="number" required placeholder="10" 
                 className="w-full rounded-md border-slate-300 shadow-sm p-2 border" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Penalty Strokes</label>
          <input name="penaltyStrokes" type="number" required defaultValue="0" 
                 className="w-full rounded-md border-slate-300 shadow-sm p-2 border" />
        </div>

        {/* Submit Button */}
        <div className="md:col-span-2 mt-2">
          <button type="submit" 
                  className="w-full bg-emerald-600 text-white font-bold py-2 px-4 rounded-md hover:bg-emerald-700 transition">
            Add Round ⛳
          </button>
        </div>
      </form>
    </div>
  )
}