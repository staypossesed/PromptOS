import type { AppLanguage } from "@/types/language";
const en = {
  library: "My library", profiles: "Context profiles", playbooks: "Playbooks", profile: "Profile", noProfile: "No profile",
  newProfile: "New profile", newPlaybook: "New playbook", name: "Name", details: "Background", audience: "Audience", voice: "Voice and tone", constraints: "Include or avoid", idea: "Starting idea",
  save: "Save", cancel: "Cancel", edit: "Edit", remove: "Delete", use: "Use", retry: "Retry", saved: "Saved to your library", deleted: "Deleted", empty: "Nothing saved yet.",
  savePlaybook: "Save as playbook", applyPlaybook: "Choose a playbook", manage: "Manage library", applied: "Applied", shorter: "Simplify", specific: "More specific", steps: "Step-by-step", professional: "Professional",
  refine: "Refine your prompt", usage: "Each refinement uses one generation.", versions: "Previous versions", restore: "Restore", current: "Current version", next: "Keep building", confirmDelete: "Delete this library item?", confirmReplace: "Start a new task? Save your current prompt first if you want to keep it.",
  profileConsent: "Apply this profile? Its selected details will be included in this task and sent to Umprompt's configured AI provider (Anthropic or OpenRouter). Do not include secrets or sensitive personal information.",
  savingError: "Could not save. Please try again.", restored: "Previous version restored", review: "Review profile", before: "Before", quality: "Quality optimization", restoredAction: "Restore", loading: "Loading...",
};
type Copy = typeof en;
const es: Copy = {
  ...en, library: "Mi biblioteca", profiles: "Perfiles de contexto", playbooks: "Flujos de trabajo", profile: "Perfil", noProfile: "Sin perfil",
  before: "Antes de", quality: "Optimización", restoredAction: "Restaurar", loading: "Cargando...",
  newProfile: "Nuevo perfil", newPlaybook: "Nuevo flujo", name: "Nombre", details: "Contexto", audience: "Público", voice: "Voz y tono", constraints: "Incluir o evitar", idea: "Idea inicial",
  save: "Guardar", cancel: "Cancelar", edit: "Editar", remove: "Eliminar", use: "Usar", retry: "Reintentar", saved: "Guardado en tu biblioteca", deleted: "Eliminado", empty: "Todavía no hay elementos.", savePlaybook: "Guardar como flujo", applyPlaybook: "Elegir un flujo", manage: "Gestionar biblioteca", applied: "Aplicado",
  shorter: "Simplificar", specific: "Más específico", steps: "Paso a paso", professional: "Profesional", refine: "Refinar tu prompt", usage: "Cada ajuste usa una generación.", versions: "Versiones anteriores", restore: "Restaurar", current: "Versión actual", next: "Sigue creando",
  confirmDelete: "¿Eliminar este elemento?", confirmReplace: "¿Empezar una tarea nueva? Guarda tu prompt actual primero si quieres conservarlo.", profileConsent: "¿Aplicar este perfil? Sus detalles se incluirán en esta tarea y se enviarán al proveedor de IA de Umprompt (Anthropic u OpenRouter). No incluyas secretos ni información personal sensible.", savingError: "No se pudo guardar. Inténtalo de nuevo.", restored: "Versión anterior restaurada", review: "Revisar perfil",
};
const ru: Copy = {
  ...en, library: "Моя библиотека", profiles: "Профили контекста", playbooks: "Рабочие сценарии", profile: "Профиль", noProfile: "Без профиля",
  before: "До изменения", quality: "Оптимизация", restoredAction: "Восстановление", loading: "Загрузка...",
  newProfile: "Новый профиль", newPlaybook: "Новый сценарий", name: "Название", details: "Контекст", audience: "Аудитория", voice: "Стиль и тон", constraints: "Включить или исключить", idea: "Начальная идея",
  save: "Сохранить", cancel: "Отмена", edit: "Изменить", remove: "Удалить", use: "Использовать", retry: "Повторить", saved: "Сохранено в библиотеку", deleted: "Удалено", empty: "Пока ничего не сохранено.", savePlaybook: "Сохранить сценарий", applyPlaybook: "Выбрать сценарий", manage: "Открыть библиотеку", applied: "Применён",
  shorter: "Упростить", specific: "Конкретнее", steps: "Пошагово", professional: "Деловой стиль", refine: "Улучшить промпт", usage: "Каждое изменение использует одну генерацию.", versions: "Предыдущие версии", restore: "Восстановить", current: "Текущая версия", next: "Продолжить работу",
  confirmDelete: "Удалить этот элемент?", confirmReplace: "Начать новую задачу? Сначала сохраните текущий промпт, если хотите его оставить.", profileConsent: "Применить профиль? Его данные будут включены в задачу и отправлены провайдеру ИИ Umprompt (Anthropic или OpenRouter). Не добавляйте секреты и конфиденциальные личные данные.", savingError: "Не удалось сохранить. Попробуйте ещё раз.", restored: "Предыдущая версия восстановлена", review: "Просмотреть профиль",
};
export function workspaceCopy(language: AppLanguage): Copy { return ({ en, es, ru })[language] ?? en; }
