import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthenticatedRequest, TokenPayload } from './auth.types.js';

/**
 * ¿Quién eres? Verifica el token del header `Authorization: Bearer <token>`
 * y deja el usuario en request.user para los siguientes pasos.
 * No consulta la BD: verificar un JWT es solo comprobar su firma (D31).
 */
@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('Falta el token de acceso');
    }

    let payload: TokenPayload;
    try {
      // Recalcula la firma con JWT_SECRET y revisa la expiración.
      payload = await this.jwt.verifyAsync<TokenPayload>(token);
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    request.user = { id: payload.sub, role: payload.role };
    return true;
  }
}

/** "Bearer abc.def.ghi" → "abc.def.ghi". Cualquier otro formato → null. */
function extractBearerToken(header: string | undefined): string | null {
  const [scheme, token] = header?.split(' ') ?? [];
  return scheme === 'Bearer' && token ? token : null;
}
