import { useState, type FormEvent } from 'react'
import { authApi } from '../auth/auth.api.ts'
import { useAuth } from '../auth/useAuth.ts'
import { ErrorMessage } from '../shared/components/Feedback.tsx'
import { Button, Card, SuccessMessage, TextField } from '../shared/components/Form.tsx'
import { useSubmit } from '../shared/useSubmit.ts'
import { profileApi } from './profile.api.ts'

/** Perfil (caso 4) y cambio de contraseña (caso 4b). Requiere sesión. */
export function ProfilePage() {
  const { user, setUser } = useAuth()
  const update = useSubmit(profileApi.updateMe)
  const changePassword = useSubmit(authApi.changePassword)
  const [profileSaved, setProfileSaved] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)

  if (!user) return null // RequireAuth garantiza que hay sesión

  async function onSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setProfileSaved(false)
    const form = new FormData(event.currentTarget)
    const address = String(form.get('address')).trim()
    const result = await update.run({
      name: String(form.get('name')),
      // La dirección se puede cambiar, no borrar (D37): vacía = no se envía.
      ...(address && { address }),
    })
    if (result.ok) {
      setUser(result.value) // la barra superior muestra el nombre nuevo
      setProfileSaved(true)
    }
  }

  async function onChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordSaved(false)
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const result = await changePassword.run({
      currentPassword: String(form.get('currentPassword')),
      newPassword: String(form.get('newPassword')),
    })
    if (result.ok) {
      formElement.reset()
      setPasswordSaved(true)
    }
  }

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <Card title="Mi perfil">
        <form onSubmit={onSaveProfile} className="space-y-4">
          <p className="text-sm text-slate-500">Correo: {user.email}</p>
          <TextField label="Nombre" name="name" defaultValue={user.name} required />
          <TextField
            label="Dirección de envío"
            name="address"
            defaultValue={user.address ?? ''}
            placeholder="Necesaria para comprar"
          />
          {update.error && <ErrorMessage error={update.error} />}
          {profileSaved && <SuccessMessage>Perfil actualizado.</SuccessMessage>}
          <Button type="submit" busy={update.busy}>
            Guardar
          </Button>
        </form>
      </Card>

      <Card title="Cambiar contraseña">
        <form onSubmit={onChangePassword} className="space-y-4">
          <TextField label="Contraseña actual" name="currentPassword" type="password" autoComplete="current-password" required />
          <TextField label="Nueva contraseña" name="newPassword" type="password" autoComplete="new-password" required />
          {changePassword.error && <ErrorMessage error={changePassword.error} />}
          {passwordSaved && <SuccessMessage>Contraseña actualizada.</SuccessMessage>}
          <Button type="submit" busy={changePassword.busy}>
            Cambiar contraseña
          </Button>
        </form>
      </Card>
    </div>
  )
}
