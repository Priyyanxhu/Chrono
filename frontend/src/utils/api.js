import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 30000
})

export default api

export const getImageUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('data:') || url.startsWith('http')) return url
  // relative /uploads -> proxy via same origin (vite proxies to 5000)
  return url
}
