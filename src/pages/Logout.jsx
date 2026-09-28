import { useEffect } from 'react'
import { logout } from '../utils/storage.js'
import { useNavigate } from 'react-router-dom'

export default function Logout(){
  const nav = useNavigate()
  useEffect(()=>{
    logout()
    nav('/login')
  },[nav])
  return null
}
