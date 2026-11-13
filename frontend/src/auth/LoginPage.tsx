import { type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { ErrorMessage } from '../shared/components/Feedback.tsx'
import { Button, Card, TextField } from '../shared/components/Form.tsx'
import { useSubmit } from '../shared/useSubmit.ts'
import { authApi } from './auth.api.ts'
import { useAuth } from './useAuth.ts'
import { useNextPath } from './useNextPath.ts'

export function LoginPage() {
  const { user, startSession } = useAuth()
  const navigate = useNavigate()
  const next = useNextPath()
  const login = useSubmit(authApi.login)

  if (user) return <Navigate to={next} replace />

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const result = await login.run({
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
      <Card title="Iniciar sesión">
        <form onSubmit={onSubmit} className="space-y-4">
          <TextField label="Correo" name="email" type="email" autoComplete="email" required />
          <TextField label="Contraseña" name="password" type="password" autoComplete="current-password" required />
          {/* "Credenciales inválidas": el backend no dice cuál falló (D34). */}
          {login.error && <ErrorMessage error={login.error} />}
          <Button type="submit" busy={login.busy} className="w-full">
            Entrar
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-600">
          ¿No tienes cuenta?{' '}
          <Link to={`/register?next=${encodeURIComponent(next)}`} className="text-indigo-600 hover:underline">
            Regístrate
          </Link>
        </p>
      </Card>
    </div>
  )
}
