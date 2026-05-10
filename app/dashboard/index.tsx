import { useRouter } from "expo-router";
import { useEffect } from "react";

export default function Dashboard() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, []);
  return <></>;
}