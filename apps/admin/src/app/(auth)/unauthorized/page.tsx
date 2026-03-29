"use client";

import { useAuth } from "@clerk/nextjs";
import React from "react";

const Page = () => {
  const { signOut } = useAuth();
  return (
    <div className="">
      <h1>You do not have an access!</h1>
      <button onClick={() => signOut()}></button>
    </div>
  );
};

export default Page;
