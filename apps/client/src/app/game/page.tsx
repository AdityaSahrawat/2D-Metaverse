"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react";

const Index = ()=>{
    const router = useRouter();

    useEffect(()=>{
        router.push('/rooms')
    },[])
}