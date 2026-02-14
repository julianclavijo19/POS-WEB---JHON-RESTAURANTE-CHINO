'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent, Button, Input } from '@/components/ui'
import { User, Mail, Shield, Key, Save, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface UserProfile {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Datos del formulario
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  
  // Cambio de contraseña
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = () => {
    // Cargar desde localStorage
    const userData = localStorage.getItem('user')
    if (userData) {
      const parsed = JSON.parse(userData)
      setUser(parsed)
      setName(parsed.name || '')
      setEmail(parsed.email || '')
    }
    setLoading(false)
  }

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast.error('El nombre es requerido')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/users/${user?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      })

      if (res.ok) {
        const updatedUser = { ...user, name, email }
        localStorage.setItem('user', JSON.stringify(updatedUser))
        setUser(updatedUser as UserProfile)
        toast.success('Perfil actualizado correctamente')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Error al actualizar perfil')
      }
    } catch (error) {
      toast.error('Error al guardar cambios')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast.error('Ingresa tu contraseña actual')
      return
    }
    if (!newPassword) {
      toast.error('Ingresa la nueva contraseña')
      return
    }
    if (newPassword.length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }

    setChangingPassword(true)
    try {
      const res = await fetch(`/api/users/${user?.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      if (res.ok) {
        toast.success('Contraseña actualizada correctamente')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setShowPasswordSection(false)
      } else {
        const data = await res.json()
        toast.error(data.error || 'Error al cambiar contraseña')
      }
    } catch (error) {
      toast.error('Error al cambiar contraseña')
    } finally {
      setChangingPassword(false)
    }
  }

  const getRoleName = (role: string) => {
    const roles: Record<string, string> = {
      ADMIN: 'Administrador',
      CASHIER: 'Cajero',
      WAITER: 'Mesero',
      KITCHEN: 'Cocina',
    }
    return roles[role] || role
  }

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      ADMIN: 'bg-purple-100 text-purple-700',
      CASHIER: 'bg-blue-100 text-blue-700',
      WAITER: 'bg-green-100 text-green-700',
      KITCHEN: 'bg-orange-100 text-orange-700',
    }
    return colors[role] || 'bg-gray-100 text-gray-700'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No se pudo cargar el perfil</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>
        <p className="text-gray-500 mt-1">Administra tu información personal</p>
      </div>

      {/* Avatar y Info Básica */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <div className="h-20 w-20 rounded-full bg-gray-900 flex items-center justify-center text-white text-3xl font-semibold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{user.name}</h2>
              <p className="text-gray-500">{user.email}</p>
              <span className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(user.role)}`}>
                <Shield className="h-3.5 w-3.5" />
                {getRoleName(user.role)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información Personal */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <User className="h-5 w-5" />
            Información Personal
          </h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Nombre completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
          />
          <Input
            label="Correo electrónico"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
          />
          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} isLoading={saving}>
              <Save className="h-4 w-4 mr-2" />
              Guardar Cambios
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cambio de Contraseña */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Key className="h-5 w-5" />
              Seguridad
            </h3>
            {!showPasswordSection && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowPasswordSection(true)}
              >
                Cambiar Contraseña
              </Button>
            )}
          </div>
        </CardHeader>
        {showPasswordSection && (
          <CardContent className="space-y-4">
            <div className="relative">
              <Input
                label="Contraseña actual"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
              >
                {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            
            <div className="relative">
              <Input
                label="Nueva contraseña"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <Input
              label="Confirmar nueva contraseña"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />

            {newPassword && (
              <div className="text-sm">
                <p className={`flex items-center gap-1 ${newPassword.length >= 6 ? 'text-green-600' : 'text-gray-400'}`}>
                  {newPassword.length >= 6 ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  Mínimo 6 caracteres
                </p>
                {confirmPassword && (
                  <p className={`flex items-center gap-1 ${newPassword === confirmPassword ? 'text-green-600' : 'text-red-500'}`}>
                    {newPassword === confirmPassword ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    Las contraseñas {newPassword === confirmPassword ? 'coinciden' : 'no coinciden'}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowPasswordSection(false)
                  setCurrentPassword('')
                  setNewPassword('')
                  setConfirmPassword('')
                }}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleChangePassword} 
                isLoading={changingPassword}
                disabled={!currentPassword || !newPassword || newPassword !== confirmPassword}
              >
                Actualizar Contraseña
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Info adicional */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">ID de Usuario</p>
              <p className="font-mono text-gray-900">{user.id}</p>
            </div>
            <div>
              <p className="text-gray-500">Rol</p>
              <p className="text-gray-900">{getRoleName(user.role)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
