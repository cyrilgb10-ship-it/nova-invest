import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";


  export async function getCurrentUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("nova_invest_user_id")?.value;

if (!userId) {
return null;
}

try {
const user = await prisma.user.findUnique({
where: {
id: userId,
},
});

return user;

} catch (error) {
console.error("GET_CURRENT_USER_ERROR:", error);
return null;
}
}

  export async function getCurrentAdmin() {
  const user = await getCurrentUser();

if (!user || user.role !== "ADMIN") {
return null;
}

return user;
}
