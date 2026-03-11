// src/lib/notifications/email-templates.ts

export function guardAssignedTemplate(
  name: string,
  weekNumber: number,
  startDate: string,
  endDate: string
): string {
  return `Hola ${name},

Se te ha asignado guardia en la semana ${weekNumber} (${startDate} → ${endDate}).

Por favor, asegúrate de estar disponible durante ese período.

Un saludo,
Juzgado de Tarazona`;
}

export function vacationApprovedTemplate(name: string, startDate: string, endDate: string): string {
  return `Hola ${name},

Tus vacaciones del ${startDate} al ${endDate} han sido registradas correctamente en el sistema.

Un saludo,
Juzgado de Tarazona`;
}

export function guardReminderTemplate(
  name: string,
  weekNumber: number,
  startDate: string
): string {
  return `Hola ${name},

Recordatorio: tienes guardia esta semana (semana ${weekNumber}, desde el ${startDate}).

Un saludo,
Juzgado de Tarazona`;
}

export function guardSwappedTemplate(
  name: string,
  otherName: string,
  myNewWeek: number,
  myNewStart: string,
  myNewEnd: string
): string {
  return `Hola ${name},

Se ha realizado un intercambio de guardia con ${otherName}.
Tu nueva guardia asignada es la semana ${myNewWeek} (${myNewStart} → ${myNewEnd}).

Un saludo,
Juzgado de Tarazona`;
}

export function staffCreatedTemplate(name: string, email: string, password: string): string {
  return `Hola ${name},

Tu cuenta de acceso al Sistema de Guardias del Juzgado de Tarazona ha sido creada.

Email: ${email}
Contraseña inicial: ${password}

Por favor, cambia tu contraseña en tu primer inicio de sesión en Mi Perfil > Cambiar contraseña.

Un saludo,
Juzgado de Tarazona`;
}
