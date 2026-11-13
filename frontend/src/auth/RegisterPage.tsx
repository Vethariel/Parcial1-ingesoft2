import { type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { ErrorMessage } from '../shared/components/Feedback.tsx'
import { Button, Card, TextField } from '../shared/components/Form.tsx'
import { useSubmit } from '../shared/useSubmit.ts'
import { authApi } from './auth.api.ts'
import { useAuth } from './useAuth.ts'
import { useNextPath } from './useNextPath.ts'

export function RegisterPage() {
  const { user, startSession } = useAuth()
  const navigate = useNavigate()
  const next = useNextPath()
  const register = useSubmit(authApi.register)

  if (user) return <Navigate to={next} replace />

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    // El registro devuelve el token: el usuario queda dentro de una vez.
    const result = await register.run({
      name: String(form.get('name')),
      email: String(form.get('email')),
      password: String(form.get('password')),
    })
    if (result.ok) {
      startSession(result.value)
      navigate(next, { replace: true })
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <Card title="Crear cuenta">
        <form onSubmit={onSubmit} className="space-y-4">
          <TextField label="Nombre" name="name" autoComplete="name" required />
          <TextField label="Correo" name="email" type="email" autoComplete="email" required />
          {/* El largo mínimo lo valida el backend y su mensaje se muestra aquí (D63). */}
          <TextField label="Contraseña" name="password" type="password" autoComplete="new-password" required />
          {register.error && <ErrorMessage error={register.error} />}
          <Button type="submit" busy={register.busy} className="w-full">
            Registrarme
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-600">
          ¿Ya tienes cuenta?{' '}
          <Link to={`/login?next=${encodeURIComponent(next)}`} className="text-indigo-600 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </Card>
    </div>
  )
}
