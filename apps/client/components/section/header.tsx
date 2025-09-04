"use client"

import { Button } from "@/components/ui/button";
import axios from "axios";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const Header = () => {
  const [isAuth, setIsAuth] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter()
  const api = process.env.NEXT_PUBLIC_API_BASE_URL

  useEffect(()=>{ 
    async function checkIsLoggedIn(){
      try{
        const res = await axios.get(`${api}/v1/user/auth/status` ,{
          withCredentials : true
        })

        if(res.data.isAuth){
          setIsAuth(true)
          setIsLoading(false)
        }else{
          setIsAuth(false)
          setIsLoading(false)
        }

      } catch (err) {
        setIsAuth(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkIsLoggedIn()


  },[])


  async function logout(){
    try {
      await axios.get(`${api}/v1/user/logout` ,{
        withCredentials : true
      })
    }catch(e){
      
    }
    
    await signOut({ callbackUrl: "/" });
  }
  

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
      <div className="container mx-auto px-6 py-4">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white rounded-full border-dashed animate-spin"></div>
            </div>
            <span className="text-xl font-bold text-white">MetaSpace</span>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">

            { isAuth ? (
              <Button onClick={()=>{logout()}} variant="outline" className="text-red-500 border-red-500 hover:bg-red-100 hover:text-red-700 hover:cursor-pointer">
                Logout
              </Button>
            ) : (
              <Button onClick={()=>router.push('/auth')} variant="default" className="bg-blue-600 hover:bg-blue-700 hover:cursor-pointer">
                Signin
              </Button>
            )
              
            }
            
            <a href="#how-it-works" className="text-slate-300 hover:text-white transition-colors">
              How It Works
            </a>
            <Button onClick={()=>router.push('/rooms')} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full transition-all hover:scale-105">
              Join Room
            </Button>
          </div>
          
          <div className="md:hidden">
            <Button variant="ghost" size="sm" className="text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;