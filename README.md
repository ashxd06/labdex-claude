# LABDEX — Fase 2: Base de conocimiento + Panel de administración

Continuación de la Fase 1. Esta fase añade la base de conocimiento de
LABDEX (categorías, microorganismos, medios de cultivo, pruebas,
procedimientos, análisis clínicos, documentos), un panel de administración
con CRUD completo, subida de imágenes/documentos a Supabase Storage, la
interfaz pública de contenido y un buscador básico.

## Stack

Next.js (App Router) · React · TypeScript · Tailwind CSS v4 · Supabase
(Auth + PostgreSQL + RLS + Storage) · lucide-react.

## 1. Configurar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com) (o reutiliza el de la Fase 1).
2. Copia `.env.example` a `.env.local` y completa `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. En el **SQL Editor** de Supabase, ejecuta en este orden:
   1. `supabase/schema.sql` (Fase 1 — perfiles, roles, RLS de `profiles`). Sáltalo si ya lo ejecutaste antes.
   2. `supabase/schema_fase2.sql` (Fase 2 — todas las tablas de contenido, relaciones, RLS y buckets de Storage). Es idempotente: puede volver a ejecutarse sin duplicar nada.
   3. *(Opcional)* `supabase/seed_sample_data.sql` — crea unos pocos registros de prueba (Staphylococcus aureus, E. coli, Salmonella, Giardia, dos medios y dos pruebas con sus relaciones) para comprobar que todo funciona de extremo a extremo. Todo lo que crea queda marcado `is_sample_data = true` y se muestra con la insignia **"Dato de prueba"** en la interfaz pública.
4. Promueve tu usuario a `admin` siguiendo `supabase/promote_admin.sql` (ver instrucciones de la Fase 1 más abajo) para poder usar el panel de administración.

## 2. Instalar y ejecutar

```bash
npm install
npm run dev
```

## 3. Qué se agregó en esta fase

### Base de datos

- `categories`, `microorganisms`, `culture_media`, `laboratory_tests`, `procedures`, `clinical_analyses`, `documents`.
- Tablas de relación: `microorganism_media`, `microorganism_tests`, `microorganism_procedures`.
- Todas las tablas de contenido tienen `is_active`, `status` (draft/published/archived, preparado para el futuro), `created_by`/`updated_by` (auditoría básica) y `created_at`/`updated_at`.
- **RLS**: cualquiera puede leer contenido activo; solo un usuario con `role = 'admin'` (verificado con la función `public.is_admin()`) puede crear, editar o eliminar. Esto se aplica exactamente igual en las 7 tablas y en las 3 tablas de relación — ninguna quedó desprotegida.
- **Storage**: dos buckets públicos de solo lectura (`microorganism-images`, `documents`); solo un admin puede subir, reemplazar o borrar archivos.

### Panel de administración (`/admin`)

- Dashboard con conteos reales obtenidos de Supabase en cada carga (no hay números fijos en el código).
- CRUD completo (crear, leer, editar, eliminar, buscar) para las 7 entidades, con confirmación antes de eliminar.
- El CRUD de **Categorías, Medios, Pruebas, Procedimientos, Análisis y Documentos** usa un mismo motor genérico (`lib/content/resourceConfigs.ts` + `lib/content/actions.ts` + `components/admin/crud/*`) para no duplicar código entre módulos casi idénticos.
- **Microorganismos** tiene su propia pantalla (`app/admin/microorganismos/`) porque además del formulario por secciones (Información general, Clasificación, Morfología, Cultivo, Importancia clínica, Diagnóstico, Imágenes) incluye:
  - Filtro por tipo (Bacteria / Hongo / Virus / Parásito) y búsqueda.
  - Subida de imagen de microscopía y de cultivo (con vista previa, reemplazo y borrado), validando tipo de archivo (PNG/JPG/WEBP) y tamaño máximo (5 MB) antes de subir nada.
  - Un gestor de relaciones para vincular/desvincular medios de cultivo, pruebas y procedimientos ya existentes (sin duplicar sus datos).
- Todas las escrituras pasan por Server Actions que primero comprueban `isAdmin()` en el servidor y **además** dependen de las políticas RLS de Postgres — nunca de ocultar un botón en el cliente.

### Interfaz pública

- `/contenido`: cuadrícula de categorías estilo enciclopedia (icono, nombre, descripción, número de contenidos, "Explorar").
- `/contenido/microbiologia`: subnavegación por tipo.
- `/contenido/microbiologia/{bacterias|hongos|virus|parasitos}`: listado filtrado.
- `/contenido/microbiologia/{tipo}/[slug]`: ficha del microorganismo — solo muestra las secciones que tienen contenido, con imágenes (si existen) y enlaces a medios/pruebas/procedimientos relacionados.
- `/contenido/[categoria]` (hematología, bioquímica, parasitología, inmunología, citología): agrupa las pruebas, procedimientos y análisis ya vinculados a esa categoría; muestra un estado vacío claro si todavía no hay nada cargado.
- `/buscar`: buscador básico (Supabase `ilike`) sobre microorganismos, medios, pruebas, procedimientos, análisis y documentos activos. El buscador del header ya está conectado a esta página.

## 4. Cómo probar

**Como usuario**: crea una cuenta, entra a `/contenido`, navega por las categorías, usa el buscador, abre una ficha de microorganismo (si ejecutaste el seed de datos de prueba, prueba con "Staphylococcus" o "Salmonella").

**Como administrador**:
1. Entra a `/admin` → verás las estadísticas reales.
2. Ve a `/admin/microorganismos` → "+ Nuevo" → completa el formulario → guarda.
3. Abre el registro recién creado, sube una imagen de microscopía y vincula un medio de cultivo o una prueba ya existente.
4. Vuelve a `/contenido/microbiologia/bacterias` (o el tipo que corresponda) y confirma que aparece con su imagen y sus relaciones.
5. Prueba a desactivar (`Activo` → no marcado) un registro y comprueba que desaparece de la vista pública pero sigue visible en el panel de admin.
6. Prueba a eliminar un registro: debe pedir confirmación antes de borrar.

**Seguridad**: inicia sesión con una cuenta `user` (no admin) e intenta entrar a `/admin` o a cualquier `/admin/*` — debes ser redirigido. Aunque lograras llamar a una Server Action de escritura directamente, la política RLS de Postgres la rechazaría igualmente.

## 5. Qué queda preparado para la Fase 3+

- Los campos `status` (draft/published/archived) ya existen en la base de datos; solo falta exponer el control en la interfaz cuando se necesite un flujo editorial más fino.
- IDs estables, slugs, categorías y relaciones ya estructuradas, listas para que LABDEX AI (Fase 5) pueda consultarlas como contexto.
- `created_by`/`updated_by` ya se registran; falta solo mostrar esa auditoría en el panel si se desea.
- El buscador básico actual (`ilike`) se puede evolucionar a búsqueda semántica sin cambiar el esquema de datos.

## 6. Estructura añadida

```text
app/
├── admin/
│   ├── categorias|medios|pruebas|procedimientos|analisis|documentos/
│   │   ├── page.tsx        Listado (genérico)
│   │   ├── nuevo/page.tsx  Crear (genérico)
│   │   └── [id]/page.tsx   Editar (genérico)
│   └── microorganismos/
│       ├── page.tsx        Listado con filtro por tipo
│       ├── nuevo/page.tsx
│       └── [id]/page.tsx   Formulario + gestor de relaciones
├── contenido/
│   ├── page.tsx
│   ├── [category]/page.tsx
│   └── microbiologia/
│       ├── page.tsx
│       └── [kind]/
│           ├── page.tsx
│           └── [slug]/page.tsx
└── buscar/page.tsx

lib/content/
├── resourceConfigs.ts   Configuración declarativa de cada recurso (allowlist de tablas)
├── queries.ts            Lecturas (listar, obtener por slug/id, contar)
├── actions.ts             Server Actions genéricas: crear/editar/eliminar
├── storage.ts             Subida/borrado de archivos en Supabase Storage
├── relations.ts           Relaciones microorganismo ↔ medios/pruebas/procedimientos
├── kindSlugs.ts           Mapeo de slugs de URL ↔ enum microorganism_kind
├── slugify.ts / publicUrl.ts / getCategories.ts

components/admin/crud/   ResourceListPage, ResourceForm, FileUploadField, DeleteRecordButton
components/content/      CategoryCard, MicroorganismCard, SampleDataBadge

supabase/
├── schema_fase2.sql       Tablas de contenido, relaciones, RLS, Storage
└── seed_sample_data.sql   Datos de prueba opcionales (marcados como tales)
```

---

# LABDEX — Fase 1: Fundación del proyecto (referencia)

Plataforma moderna de Laboratorio Clínico, Ciencia y Tecnología.
Esta es la **Fase 1**: arquitectura, identidad visual, autenticación y
sistema de roles. Sin contenido científico todavía (se añadirá en fases
posteriores desde el panel de administración).

## Stack

Next.js (App Router) · React · TypeScript · Tailwind CSS v4 · Supabase
(Auth + PostgreSQL + RLS) · lucide-react.

## 1. Configurar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **Project Settings → API**, copia la `Project URL` y la `anon public key`.
3. Copia `.env.example` a `.env.local` y complétalo:

   ```bash
   cp .env.example .env.local
   ```

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
   ```

4. Abre el **SQL Editor** de tu proyecto de Supabase y ejecuta, en este orden:
   - `supabase/schema.sql`

   Esto crea:
   - El tipo `app_role` (`user` | `admin`).
   - La tabla `profiles` (`id`, `full_name`, `avatar_url`, `role`, `created_at`, `updated_at`), enlazada a `auth.users`.
   - Un trigger que crea automáticamente el perfil (con `role = 'user'`) cuando alguien se registra.
   - Row Level Security habilitado, con dos políticas:
     - `profiles_select_own`: cada usuario solo puede leer su propio perfil.
     - `profiles_update_own_except_role`: cada usuario puede editar su perfil, pero la propia política **rechaza** cualquier intento de cambiar `role` desde el cliente.
   - Una función `is_admin(uid)` reutilizable para futuras políticas (Fase 2+).

## 2. Instalar y ejecutar

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## 3. Cómo funciona el sistema de roles

- Todo usuario nuevo recibe automáticamente `role = 'user'` (vía trigger en la base de datos, no en el cliente).
- El rol se lee **siempre en el servidor** (`lib/auth/getSession.ts`), directamente desde la tabla `profiles`, protegida por RLS. La interfaz nunca decide el rol.
- Un usuario normal no puede convertirse en admin por sí mismo: la política `profiles_update_own_except_role` compara el rol nuevo contra el guardado en la base de datos y descarta cualquier `UPDATE` que intente cambiarlo.
- `/admin` está protegido en `app/admin/layout.tsx`, un Server Component que llama a `getSession()` y redirige si el usuario no es admin. Esta es la barrera real; no depende de ocultar un botón en la interfaz.
- El middleware (`middleware.ts` + `lib/supabase/middleware.ts`) añade una capa adicional: exige sesión iniciada para entrar a `/perfil` o `/admin`, pero la comprobación de **rol** vive exclusivamente en el servidor, dentro de cada página protegida.

## 4. Cómo promover un usuario a administrador

No existe ningún botón ni endpoint en la aplicación para esto — es intencional.

1. Regístrate normalmente en `/registro` con el correo que quieres que sea admin.
2. En el **SQL Editor** de Supabase, ejecuta `supabase/promote_admin.sql`, sustituyendo el correo de ejemplo por el real.
3. Cierra sesión y vuelve a iniciar sesión en LABDEX: ahora el rol será `admin` y podrás entrar a `/admin`.

## 5. Cómo probar cada flujo

**Registro** (`/registro`): crea una cuenta con nombre, correo y contraseña (mínimo 8 caracteres). Verás el mensaje "Cuenta creada correctamente" y un enlace a iniciar sesión. Si tu proyecto de Supabase tiene la confirmación de correo activada (por defecto), revisa el correo antes de iniciar sesión.

**Login** (`/login`): con credenciales correctas te lleva a `/`. Con credenciales incorrectas muestra "Correo o contraseña incorrectos." (nunca el error técnico de Supabase).

**Perfil** (`/perfil`): solo accesible con sesión iniciada; muestra nombre, correo, rol y botón de cerrar sesión. Si entras sin sesión, te redirige a `/login`.

**Admin como usuario normal**: inicia sesión con una cuenta `user` y visita `/admin` directamente por URL. Debes ser redirigido a `/` — nunca ver el contenido del panel.

**Admin como administrador**: promueve tu cuenta (paso 4), inicia sesión de nuevo y entra a `/admin`. Verás el dashboard con estadísticas placeholder y la barra lateral de secciones (deshabilitadas salvo Dashboard, preparadas para la Fase 2).

**Cerrar sesión**: desde el menú de usuario en el header o desde `/perfil`.

## 6. Estructura del proyecto

```text
app/
├── page.tsx                 Inicio
├── login/page.tsx
├── registro/page.tsx
├── perfil/page.tsx           Protegida (requiere sesión)
├── admin/
│   ├── layout.tsx             Verificación real de rol admin (servidor)
│   └── page.tsx
├── contenido/ | laboratorio/ | estudio/   Placeholders de Fase 2
└── actions/auth.ts            Server Actions: login, registro, logout

components/
├── ui/        Button, Input, Card, Modal, Loading, EmptyState, ErrorState, Badge
├── layout/    Header, Navigation, SearchBar, MobileMenu, Logo
├── auth/      UserMenu
└── admin/     AdminSidebar, StatCard

lib/
├── supabase/  client.ts (browser), server.ts (SSR), middleware.ts, types.ts
├── auth/      AuthProvider.tsx (contexto de sesión), getSession.ts (fuente de verdad del rol)
├── permissions/  isAdmin(), isAuthenticated()
└── ai/        gemini.ts — preparado para Fase futura, sin lógica todavía

public/brand/  logo.svg, logo-dark.svg, logo-light.svg, icon.svg, favicon.svg
               (reemplaza estos archivos cuando tengas el logo definitivo;
               ningún componente tiene el nombre "LABDEX" escrito como texto
               suelto, todos usan <Logo />)

supabase/
├── schema.sql          Tabla profiles, trigger, RLS
└── promote_admin.sql   Script seguro para promover un admin
```

## 7. Qué queda preparado para la Fase 2

- Rutas `/contenido`, `/laboratorio`, `/estudio` ya existen como placeholders listos para recibir módulos reales (Microbiología, Hematología, Bioquímica, Parasitología, Inmunología, Citología, Resultados clínicos, Procedimientos, Calculadoras).
- `AdminSidebar` ya lista las secciones futuras (Microorganismos, Medios de cultivo, Pruebas, Procedimientos, Análisis clínicos, Documentos, Usuarios, Configuración) como deshabilitadas, a la espera de su CRUD.
- `lib/ai/gemini.ts` documenta las reglas de seguridad para cuando se integre LABDEX AI (clave solo en servidor, nunca en el cliente).
- Variables CSS de Light Mode ya definidas en `app/globals.css` bajo `[data-theme="light"]`, solo falta el interruptor de tema.
- `is_admin(uid)` en SQL, lista para reutilizarse en las políticas RLS de las tablas de contenido que vengan.
- Sistema de branding en `/public/brand/` para reemplazar el logo sin tocar componentes.

## 8. Seguridad — resumen

- La clave `anon` de Supabase es pública por diseño; toda la protección real vive en las políticas RLS de PostgreSQL, no en el frontend.
- El cambio de rol a `admin` es imposible desde el navegador: ni por la UI, ni manipulando `localStorage`, ni interceptando la llamada de red, porque la base de datos rechaza el `UPDATE` a nivel de política.
- `/admin` verifica el rol en un Server Component en cada request; no existe una versión "solo cliente" de esa comprobación.
- Ninguna clave secreta (como la futura `GEMINI_API_KEY`) se expone al navegador: solo se leerán variables con prefijo `NEXT_PUBLIC_` en el cliente.
