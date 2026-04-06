"use client";
import { UserButton } from "@clerk/nextjs";

import { useRouter } from "next/navigation";
import React from "react";

const ProfileButton = ({ size = "w-10 h-10" }: { size?: string }) => {
  const router = useRouter();
  return (
    <UserButton
      appearance={{
        elements: {
          avatarBox: size, // 控制头像大小
        },
      }}
    >
      <UserButton.MenuItems></UserButton.MenuItems>
    </UserButton>
  );
};

export default ProfileButton;
