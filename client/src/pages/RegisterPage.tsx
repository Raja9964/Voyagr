import { useMutation } from '@tanstack/react-query'
import { CheckCircle2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Card, ErrorState, Field } from '../components/ui'
import { buttonClass, inputClass } from '../lib/styles'
import { api } from '../lib/api'

export function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const register = useMutation({
    mutationFn: () => api.registerUser({ name: form.name, email: form.email, phone: form.phone || undefined }),
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    register.mutate()
  }

  if (register.isSuccess) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <CheckCircle2 className="mx-auto size-12 text-teal-600" />
        <h1 className="mt-3 text-2xl font-bold">Welcome, {register.data.name}</h1>
        <p className="mt-2 text-slate-500">Use {register.data.email} when booking and to find your trips.</p>
        <Link to="/" className={`${buttonClass} mt-6`}>
          Search trips
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold">Create a traveller profile</h1>
      <p className="mt-1 text-sm text-slate-500">Your email identifies your bookings. There are no passwords in this demo.</p>
      <Card className="mt-6 p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Full name">
            <input required minLength={2} className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Email">
            <input type="email" required className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Phone (optional)">
            <input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98450 12345" />
          </Field>
          {register.isError && <ErrorState message={register.error.message} />}
          <button className={`${buttonClass} w-full`} disabled={register.isPending}>
            {register.isPending ? 'Saving…' : 'Register'}
          </button>
        </form>
      </Card>
    </div>
  )
}
