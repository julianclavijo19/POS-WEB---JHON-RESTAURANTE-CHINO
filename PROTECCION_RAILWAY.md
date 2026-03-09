# 🔒 Protección contra Código Mezclado en Railway

## 🎯 Problema Resuelto

Este documento explica las protecciones implementadas para evitar que código de otros proyectos se suba accidentalmente a este repositorio y cause problemas en Railway.

## ✅ Protecciones Implementadas

### 1. **Firma del Proyecto** (`.project-signature.json`)

Archivo que identifica únicamente este proyecto y define:
- Nombre del proyecto: `comandas-digitales`
- Archivos requeridos: `package.json`, `railway.json`, `prisma/schema.prisma`, etc.
- Carpetas obligatorias: `src/app`, `prisma`, `print-server`, etc.
- Dependencias críticas: `next`, `@prisma/client`, `@supabase/supabase-js`

### 2. **Script de Validación** (`scripts/validate-project.js`)

Script automático que verifica:
- ✓ Que estás en el proyecto correcto
- ✓ Que todos los archivos críticos existen
- ✓ Que el nombre en package.json coincide
- ✓ Que las dependencias correctas están instaladas
- ✓ Que la configuración de Railway existe

### 3. **Scripts de Ejecución**

#### Para Windows (Recomendado):
```batch
npm run validate
```
o
```batch
scripts\validate.bat
```

#### Para Linux/Mac:
```bash
npm run validate
```

### 4. **Integración Manual Pre-Push**

Antes de hacer push a Railway, **ejecuta manualmente**:

```bash
npm run validate
```

Si ves ✅ en verde: **Puedes hacer push de forma segura**
Si ves ❌ en rojo: **NO HAGAS PUSH** - código incorrecto detectado

## 🚨 ¿Qué Hacer si Mezclaste Código?

Si el script detecta código de otro proyecto:

### Opción 1: Deshacer cambios no commiteados
```bash
git reset --hard HEAD
```

### Opción 2: Guardar cambios temporalmente
```bash
git stash
```

### Opción 3: Revisar qué cambios hiciste
```bash
git status
git diff
```

### Opción 4: Si ya hiciste commit pero NO push
```bash
# Ver últimos commits
git log --oneline -5

# Volver al commit anterior (perder cambios)
git reset --hard HEAD~1

# O crear un nuevo commit que revierta
git revert HEAD
```

### Opción 5: Si ya hiciste push y Railway se rompió

1. **Revertir en Railway:**
   - Ve a tu proyecto en Railway
   - En "Deployments", encuentra el último deployment que funcionaba
   - Click en "Redeploy"

2. **En tu repo local:**
```bash
# Volver a un commit anterior
git log --oneline -10  # Encuentra el hash del commit bueno
git reset --hard <hash-del-commit-bueno>
git push --force origin main  # ⚠️ Cuidado con --force
```

## 📋 Flujo de Trabajo Recomendado

### ✅ BUENA PRÁCTICA:

```bash
# 1. Haces cambios en el proyecto
# 2. Agregas archivos
git add .

# 3. Haces commit
git commit -m "Descripción del cambio"

# 4. ANTES DE PUSH - Validas
npm run validate

# 5. Si todo está bien, haces push
git push origin main
```

### ❌ EVITA ESTO:

```bash
# NO hagas esto sin validar:
git add .
git commit -m "cambios"
git push  # ⚠️ Peligro sin validar
```

## 🔧 Configuración Automática (Opcional)

Si quieres que la validación se ejecute automáticamente antes de cada push, puedes instalar Husky:

```bash
# Instalar husky
npm install --save-dev husky

# Inicializar husky
npx husky init

# Crear el hook pre-push
npx husky add .husky/pre-push "npm run validate"
```

Luego cada vez que hagas `git push`, la validación se ejecutará automáticamente.

## 🎨 Identificadores del Proyecto

Este proyecto se identifica por:

- **Nombre**: comandas-digitales
- **Descripción**: Sistema de comandas digitales para restaurante
- **Framework**: Next.js 14.1.0
- **Base de datos**: Supabase + Prisma
- **Deployment**: Railway
- **Componentes únicos**: 
  - Sistema de caja registradora
  - Impresoras de comandas
  - Apertura de cajón de dinero
  - Gestión de mesas y meseros

## 📞 Checklist Rápido

Antes de hacer push, verifica:

- [ ] ¿Ejecutaste `npm run validate`?
- [ ] ¿Viste el mensaje ✅ verde?
- [ ] ¿Estás seguro de que los cambios son de ESTE proyecto?
- [ ] ¿Revisaste los archivos modificados con `git status`?

## 🛡️ Prevención Adicional

### Mantén Proyectos Separados:

```
Escritorio/
  ├── Sistema/              ← Este proyecto (comandas-digitales)
  ├── OtroProyecto1/        ← Otro sistema (diferente)
  └── OtroProyecto2/        ← Otro sistema (diferente)
```

### Usa Nombres Distintivos en Terminales:

- En VS Code, renombra las terminales según el proyecto
- Revisa siempre el directorio actual: `pwd` (Linux/Mac) o `cd` (Windows)

### Verifica Antes de Trabajar:

```bash
# Verifica que estás en el proyecto correcto
pwd                        # Ver directorio actual
cat package.json | grep name  # Ver nombre del proyecto
npm run validate           # Validar proyecto
```

## 🚀 Railway: Configuración de Seguridad

Tu configuración actual en Railway:

- **Start Command**: `npm run start`
- **Build Command**: `npm run build` (definido en nixpacks.toml)
- **Restart Policy**: ON_FAILURE (máx 3 reintentos)

Si algo falla, Railway intentará reiniciar 3 veces antes de marcar el deployment como fallido.

## ❓ Preguntas Frecuentes

**P: ¿Qué pasa si borro `.project-signature.json`?**
R: La validación fallará y no podrás hacer push hasta recrearlo.

**P: ¿Puedo modificar los archivos requeridos?**
R: Sí, edita `.project-signature.json` si cambias la estructura del proyecto.

**P: ¿El script afecta el funcionamiento normal?**
R: No, solo valida antes de push. No afecta dev, build ni start.

**P: ¿Funciona en Windows?**
R: Sí, usa `npm run validate` o `scripts\validate.bat`.

## 📊 Resultado Esperado

### ✅ Validación Exitosa:
```
🔍 Validando proyecto antes de push...

✅ Proyecto: comandas-digitales

📁 Verificando archivos requeridos...
✅ package.json ✓
✅ next.config.js ✓
✅ prisma/schema.prisma ✓
✅ railway.json ✓
✅ nixpacks.toml ✓

📂 Verificando carpetas requeridas...
✅ src/app/ ✓
✅ prisma/ ✓
✅ print-server/ ✓
✅ cash-drawer-script/ ✓

📦 Verificando package.json...
✅ Nombre del proyecto: comandas-digitales ✓
✅ next ✓
✅ @prisma/client ✓
✅ @supabase/supabase-js ✓

🚂 Verificando configuración de Railway...
✅ railway.json ✓

==================================================

✅ VALIDACIÓN EXITOSA
✅ Proyecto correcto: comandas-digitales-el-dragon-del-tarra
```

### ❌ Validación Fallida (código mezclado):
```
🔍 Validando proyecto antes de push...

❌ Archivo faltante: prisma/schema.prisma
❌ Carpeta faltante: print-server/
❌ Nombre del proyecto incorrecto en package.json
❌ Esperado: "comandas-digitales"
❌ Encontrado: "otro-proyecto"

==================================================

❌ VALIDACIÓN FALLIDA
⚠️  POSIBLE CÓDIGO DE OTRO PROYECTO ⚠️

NO HAGAS PUSH hasta corregir los errores.

⚠️  Si mezclaste código de otro proyecto:
  1. Usa: git reset --hard HEAD
  2. O: git stash
  3. Verifica que estás en el directorio correcto
```

---

**Última actualización**: 2026-03-09
**Proyecto**: Sistema de Comandas Digitales - El Dragón del Tarra
**Deployment**: Railway
