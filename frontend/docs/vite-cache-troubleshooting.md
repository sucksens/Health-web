# Resolución de Problemas: Errores de Carga de CSS e Hidratación (Vite 504 Outdated Optimize Dep)

Este documento explica cómo solucionar un problema recurrente en el entorno de desarrollo local donde los estilos CSS no se aplican o la aplicación React no carga (se muestra una página en blanco o sin interactividad).

---

## Síntomas del Problema

Al abrir la aplicación en el navegador (por ejemplo, Google Chrome en `http://localhost:4321`), se experimentan los siguientes síntomas:
1. **La interfaz no tiene estilos CSS** (se ve como HTML puro) o se queda completamente en blanco.
2. Al abrir la consola del desarrollador de Chrome (F12), se observan los siguientes errores:
   ```text
   Failed to load resource: the server responded with a status of 504 (Outdated Optimize Dep)
   [astro-island] Error hydrating /src/components/App.tsx TypeError: Failed to fetch dynamically imported module: http://localhost:4321/src/components/App.tsx
   ```

---

## Causa Raíz

Este error es causado por la **caché de optimización de dependencias de Vite** (`node_modules/.vite`). 

Vite pre-empaqueta las dependencias de Node (como React, Lucide React, etc.) en archivos individuales en esta carpeta para acelerar los tiempos de carga del navegador. Si cambias de dependencias, actualizas paquetes o el servidor de desarrollo se detiene abruptamente, la caché interna de Vite puede quedar obsoleta (desincronizada con el código fuente). 

Cuando Chrome solicita el punto de entrada de la aplicación (`/src/components/App.tsx`), Vite intenta servir las dependencias pre-empaquetadas obsoletas, lo que resulta en un error de red **504 Gateway Timeout**. Al fallar la descarga de la dependencia, el navegador no puede importar el componente de React y la hidratación del frontend falla por completo.

---

## Solución Paso a Paso

Para resolver este problema y forzar a Vite a reconstruir su caché de dependencias desde cero, sigue estos pasos:

### 1. Detener el servidor de desarrollo
Detén el proceso actual de Astro (`npm run dev`) en tu terminal presionando `Ctrl + C`.

### 2. Borrar la carpeta de caché de Vite
Elimina manualmente la carpeta `.vite` ubicada dentro de `node_modules` en la carpeta `frontend`. Puedes hacerlo desde el explorador de archivos o usando la terminal:

**En Windows (PowerShell):**
```powershell
Remove-Item -Recurse -Force frontend/node_modules/.vite
```

**En macOS / Linux:**
```bash
rm -rf frontend/node_modules/.vite
```

### 3. Iniciar el servidor dev forzando la optimización
Vuelve a iniciar el servidor de desarrollo del frontend agregando el flag `--force`. Esto le indica a Astro/Vite que ignore cualquier caché existente y vuelva a pre-empaquetar todas las dependencias:

```bash
npm run dev -- --force
```

### 4. Recargar la página en Chrome
Una vez que el servidor esté listo, abre Chrome y recarga la página con una recarga forzada para limpiar la caché del navegador:
* **Windows/Linux:** `Ctrl + F5` o `Ctrl + Shift + R`
* **macOS:** `Cmd + Shift + R`

---

## Conflictos de Puertos (Procesos Zombis de Node)

Si sigues los pasos anteriores y sigues sin ver los estilos o la aplicación no responde, es muy probable que tengas **múltiples procesos de Astro corriendo en segundo plano** sin que te hayas dado cuenta.

### ¿Cómo identificarlo?
Cuando inicias el servidor dev, observa atentamente los logs de la consola. Si ves un mensaje similar a este:
```text
[vite] Port 4321 is in use, trying another one...
[vite] Port 4322 is in use, trying another one...
astro v5.18.1 ready in 337 ms
┃ Local    http://localhost:4323/
```
Esto significa que hay procesos zombis de Node ocupando los puertos `4321` y `4322`. Si abres `http://localhost:4321` en Chrome, estarás viendo la instancia de la aplicación correspondiente al proceso zombi (que todavía tiene la caché rota) y no a tu nuevo servidor en el puerto `4323`.

### ¿Cómo solucionarlo?
Debes cerrar a la fuerza todos los procesos Node que estén bloqueando los puertos:

**En Windows (PowerShell):**
1. Busca qué procesos están ocupando los puertos de desarrollo:
   ```powershell
   netstat -ano | findstr 432
   ```
2. Mata los procesos por su PID (el número de la última columna):
   ```powershell
   taskkill /F /PID <Número_de_PID>
   ```
   *(O alternativamente, para cerrar todas las instancias de Node locales: `taskkill /F /IM node.exe`)*

**En macOS / Linux (Terminal):**
1. Busca los procesos en los puertos de Astro:
   ```bash
   lsof -i :4321
   ```
2. Mata el proceso usando su PID:
   ```bash
   kill -9 <Número_de_PID>
   ```

