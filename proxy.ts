import { auth } from "@/lib/auth";

export default auth;

export const config = {
  matcher: ["/configuracoes/:path*", "/analises/:path*", "/carteira/:path*", "/monitorados/:path*"],
};
