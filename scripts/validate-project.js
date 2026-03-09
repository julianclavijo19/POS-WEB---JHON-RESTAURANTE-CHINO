#!/usr/bin/env node

/**
 * Script de validación del proyecto
 * Verifica que estás en el proyecto correcto antes de hacer push
 * Evita subir código de otros proyectos por error a Railway
 */

const fs = require('fs');
const path = require('path');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function log(message, color = RESET) {
  console.log(`${color}${message}${RESET}`);
}

function error(message) {
  log(`❌ ${message}`, RED);
}

function success(message) {
  log(`✅ ${message}`, GREEN);
}

function warning(message) {
  log(`⚠️  ${message}`, YELLOW);
}

function fileExists(filePath) {
  return fs.existsSync(path.join(process.cwd(), filePath));
}

function readJsonFile(filePath) {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch (err) {
    return null;
  }
}

async function validateProject() {
  log('\n🔍 Validando proyecto antes de push...\n');

  let hasErrors = false;

  // 1. Verificar que existe el archivo de firma del proyecto
  if (!fileExists('.project-signature.json')) {
    error('No se encontró el archivo .project-signature.json');
    error('¿Estás en el proyecto correcto?');
    hasErrors = true;
    return hasErrors;
  }

  const signature = readJsonFile('.project-signature.json');
  
  if (!signature) {
    error('No se pudo leer .project-signature.json');
    hasErrors = true;
    return hasErrors;
  }

  success(`Proyecto: ${signature.projectName}`);
  
  // 2. Verificar archivos requeridos
  log('\n📁 Verificando archivos requeridos...');
  for (const file of signature.requiredFiles) {
    if (!fileExists(file)) {
      error(`Archivo faltante: ${file}`);
      hasErrors = true;
    } else {
      success(`${file} ✓`);
    }
  }

  // 3. Verificar carpetas requeridas
  log('\n📂 Verificando carpetas requeridas...');
  for (const folder of signature.mustContainFolders) {
    if (!fileExists(folder)) {
      error(`Carpeta faltante: ${folder}`);
      hasErrors = true;
    } else {
      success(`${folder}/ ✓`);
    }
  }

  // 4. Verificar package.json
  log('\n📦 Verificando package.json...');
  const packageJson = readJsonFile('package.json');
  
  if (!packageJson) {
    error('No se pudo leer package.json');
    hasErrors = true;
  } else {
    // Verificar nombre del proyecto
    if (packageJson.name !== signature.projectName) {
      error(`Nombre del proyecto incorrecto en package.json`);
      error(`Esperado: "${signature.projectName}"`);
      error(`Encontrado: "${packageJson.name}"`);
      hasErrors = true;
    } else {
      success(`Nombre del proyecto: ${packageJson.name} ✓`);
    }

    // Verificar dependencias críticas
    for (const dep of signature.requiredDependencies) {
      if (!packageJson.dependencies || !packageJson.dependencies[dep]) {
        error(`Dependencia faltante: ${dep}`);
        hasErrors = true;
      } else {
        success(`${dep} ✓`);
      }
    }
  }

  // 5. Verificar railway.json
  log('\n🚂 Verificando configuración de Railway...');
  const railwayConfig = readJsonFile('railway.json');
  if (!railwayConfig) {
    error('No se pudo leer railway.json');
    hasErrors = true;
  } else {
    success('railway.json ✓');
  }

  // Resultado final
  log('\n' + '='.repeat(50));
  
  if (hasErrors) {
    error('\n❌ VALIDACIÓN FALLIDA');
    error('⚠️  POSIBLE CÓDIGO DE OTRO PROYECTO ⚠️');
    error('\nNO HAGAS PUSH hasta corregir los errores.\n');
    warning('Si mezclaste código de otro proyecto:');
    warning('  1. Usa: git reset --hard HEAD');
    warning('  2. O: git stash');
    warning('  3. Verifica que estás en el directorio correcto\n');
    process.exit(1);
  } else {
    success('\n✅ VALIDACIÓN EXITOSA');
    success(`Proyecto correcto: ${signature.projectIdentifier}\n`);
    process.exit(0);
  }
}

// Ejecutar validación
validateProject().catch(err => {
  error(`Error durante la validación: ${err.message}`);
  process.exit(1);
});
