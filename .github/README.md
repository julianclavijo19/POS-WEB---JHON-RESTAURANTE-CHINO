# 🛡️ Protecciones de GitHub

Este directorio contiene la configuración de seguridad y protecciones automáticas del repositorio.

## 🎯 Propósito

Prevenir que código de otros proyectos se suba accidentalmente a este repositorio y rompa el deployment en Railway.

## 📁 Archivos de Protección

### 🔍 Workflows (`.github/workflows/`)

#### 1. **validate-project.yml** - Validación Automática
- ✅ Se ejecuta en cada push y PR
- ✅ Valida la integridad del proyecto
- ✅ Verifica que todos los archivos críticos existen
- ✅ Comprueba que el nombre del proyecto es correcto
- ✅ Simula el build de Railway antes de deploy

**Cuándo falla:**
- Si mezclas código de otro proyecto
- Si borras archivos críticos (railway.json, prisma, etc.)
- Si cambias el nombre en package.json
- Si el build falla

#### 2. **protect-critical-files.yml** - Protección de Archivos Críticos
- 🚨 Se ejecuta cuando modificas archivos críticos
- 🚨 Muestra advertencias especiales
- 🚨 Valida railway.json y nixpacks.toml
- 🚨 Verifica el nombre del proyecto en package.json

**Archivos protegidos:**
- `package.json` - Configuración del proyecto
- `railway.json` - Configuración de deployment
- `nixpacks.toml` - Build configuration
- `prisma/schema.prisma` - Schema de base de datos
- `.project-signature.json` - Firma del proyecto
- `*.sql` - Scripts de base de datos

### 👥 CODEOWNERS

Requiere revisión del propietario para cambios en archivos críticos.

**Beneficios:**
- Notificación automática cuando se modifican archivos críticos
- Prevención de cambios accidentales
- Registro de quién aprueba cada cambio

## 🔄 Flujo de Protección

```
1. 💻 Desarrollas localmente
   ↓
2. 📝 Haces commit
   ↓
3. ⬆️ Haces push
   ↓
4. 🔍 GitHub Actions ejecuta validación automáticamente
   ↓
5a. ✅ Pasa → Se permite el merge → Railway hace deploy
   ↓
5b. ❌ Falla → Se bloquea el merge → Debes corregir
```

## 🚨 ¿Qué Hacer si GitHub Actions Falla?

### Validación Fallida (validate-project.yml)

```bash
# 1. Revisa los logs en GitHub
# Ve a: Actions → Workflow fallido → Ver detalles

# 2. Ejecuta la validación localmente
npm run validate

# 3. Si detecta código mezclado:
git status                    # Ver qué cambiaste
git diff                      # Ver cambios exactos

# 4. Corrige o revierte
git reset --hard HEAD~1       # Deshacer último commit
# o
git revert HEAD               # Crear commit de reversión
```

### Archivos Críticos Modificados (protect-critical-files.yml)

El workflow te mostrará advertencias para que confirmes que los cambios son intencionales.

**Checklist antes de aprobar:**
- [ ] ¿Los cambios son intencionales?
- [ ] ¿NO mezclaste código de otro proyecto?
- [ ] ¿El nombre sigue siendo 'comandas-digitales'?
- [ ] ¿Railway seguirá funcionando?
- [ ] ¿Ejecutaste `npm run validate` localmente?

## 🎨 Estados de GitHub Actions

### ✅ Todo Bien (Checks Passing)
```
✅ Validar Integridad del Proyecto
✅ Verificar Build de Railway
✅ Verificar Nombre del Proyecto
```

**Puedes hacer merge de forma segura**

### ⏳ En Progreso (Checks Running)
```
⏳ Validar Integridad del Proyecto - Running...
```

**Espera a que termine antes de hacer merge**

### ❌ Problema Detectado (Checks Failed)
```
❌ Validar Integridad del Proyecto - Failed
❌ Verificar Nombre del Proyecto - Failed
```

**NO hagas merge. Revisa los errores.**

## 🔧 Configuración Local vs GitHub

| Protección | Ubicación | Ejecución |
|------------|-----------|-----------|
| `npm run validate` | Local | Manual (antes de push) |
| `validate-project.yml` | GitHub | Automática (cada push) |
| `protect-critical-files.yml` | GitHub | Automática (archivos críticos) |
| `CODEOWNERS` | GitHub | Revisión de PR |

**Recomendación:** Ejecuta `npm run validate` localmente ANTES de push para detectar problemas temprano.

## 📊 Ver Estado de las Protecciones

### En GitHub:
1. Ve a tu repositorio
2. Click en "Actions"
3. Verás todos los workflows ejecutándose

### En un PR:
1. Abre un Pull Request
2. Baja hasta "Checks"
3. Verás el estado de todas las validaciones

### En un Commit:
Cada commit muestra un ✅, ⏳ o ❌ indicando si pasó las validaciones.

## 🛠️ Mantenimiento

### Agregar más archivos protegidos:

Edita `protect-critical-files.yml`:
```yaml
on:
  pull_request:
    paths:
      - 'tu-archivo-critico.js'  # Agregar aquí
```

### Cambiar validaciones:

Edita `validate-project.js` en `/scripts/`

### Agregar más owners:

Edita `CODEOWNERS`:
```
/package.json @usuario1 @usuario2
```

## 🚀 Beneficios de Esta Configuración

✅ **Prevención Automática**
- No necesitas acordarte de validar, GitHub lo hace automáticamente

✅ **Doble Protección**
- Local (`npm run validate`) + GitHub Actions

✅ **Alertas Tempranas**
- Detectas problemas antes de romper Railway

✅ **Historial Claro**
- Todos los checks quedan registrados en GitHub

✅ **Sin Impacto en Producción**
- Los workflows no afectan Railway directamente
- Solo validan antes de permitir el merge

## ❓ Preguntas Frecuentes

**P: ¿Los workflows afectan Railway?**
R: No. Railway hace deploy independientemente. Los workflows solo validan el código.

**P: ¿Puedo desactivar los workflows?**
R: Sí, pero NO es recomendado. Puedes borrar los archivos `.github/workflows/`.

**P: ¿Los workflows consumen minutos de GitHub Actions?**
R: Sí, pero las cuentas gratuitas tienen 2000 minutos/mes. Este proyecto usa ~3 minutos por push.

**P: ¿Qué pasa si ignoro los checks de GitHub?**
R: Puedes hacer merge igualmente (eres el owner), pero corres el riesgo de romper Railway.

**P: ¿Puedo ver los logs de los workflows?**
R: Sí, en GitHub → Actions → Click en el workflow → Ver logs completos.

## 📞 Soporte

Si algo falla o tienes dudas:

1. Revisa los logs en GitHub Actions
2. Ejecuta `npm run validate` localmente
3. Lee [PROTECCION_RAILWAY.md](../PROTECCION_RAILWAY.md)
4. Revisa el estado de Railway en su dashboard

---

**Última actualización:** 2026-03-09
**Proyecto:** Sistema de Comandas Digitales - El Dragón del Tarra
