export const formatDate = (d: Date) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(d);

export const pad3 = (n: number) => String(n).padStart(3, '0');
