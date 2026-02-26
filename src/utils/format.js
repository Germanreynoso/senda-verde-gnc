export const formatDate = (dateString) => {
    if (!dateString) return ''
    // Si ya tiene formato DD/MM/YYYY o es una ISO completa, intentamos normalizar
    if (dateString.includes('T')) {
        dateString = dateString.split('T')[0]
    }

    const parts = dateString.split('-')
    if (parts.length !== 3) return dateString

    const [year, month, day] = parts
    return `${day}/${month}/${year}`
}

export const getTodayDate = () => {
    const today = new Date()
    const offset = today.getTimezoneOffset()
    const localToday = new Date(today.getTime() - (offset * 60 * 1000))
    return localToday.toISOString().split('T')[0]
}
