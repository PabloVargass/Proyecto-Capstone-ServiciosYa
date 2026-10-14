import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { randomInt } from 'crypto';
import { OAuth2Client } from 'google-auth-library';

import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { VerifyResetCodeDto } from './dto/verify-reset-code.dto';

import { MailService } from './mail.service';

import {
  normalizarRut,
  validarRut,
} from './utils/rut.util';

@Injectable()
export class AuthService {
  private readonly googleClient =
    new OAuth2Client();

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  // =====================================
  // REGISTRO
  // =====================================

  async register(
    registerDto: RegisterDto,
  ) {
    // =====================================
    // NORMALIZAR CORREO
    // =====================================

    const email =
      registerDto.email
        .trim()
        .toLowerCase();

    // =====================================
    // NORMALIZAR RUT
    // =====================================

    const rut =
      normalizarRut(
        registerDto.rut,
      );

    // =====================================
    // VALIDAR RUT CHILENO
    // =====================================

    if (!validarRut(rut)) {
      throw new BadRequestException(
        'El RUT ingresado no es válido.',
      );
    }

    // =====================================
    // BUSCAR CORREO EXISTENTE
    // =====================================

    const existingUser =
      await this.usersService.findByEmail(
        email,
      );

    if (existingUser) {
      /*
       * Si ya verificó el correo,
       * la cuenta está completamente
       * registrada.
       */

      if (
        existingUser.correoVerificadoEn
      ) {
        throw new ConflictException(
          'Ya existe una cuenta asociada a este correo electrónico.',
        );
      }

      /*
       * Si existe pero no terminó la
       * verificación, enviamos otro código.
       */

      await this.generarYEnviarCodigoVerificacion(
        existingUser.id,
        existingUser.correo,
        existingUser.nombre,
      );

      return {
        message:
          'La cuenta está pendiente de verificación. Enviamos un nuevo código a tu correo.',

        requiresEmailVerification:
          true,

        email:
          existingUser.correo,
      };
    }

    // =====================================
    // BUSCAR RUT EXISTENTE
    // =====================================

    const existingRut =
      await this.usersService.findByRut(
        rut,
      );

    if (existingRut) {
      throw new ConflictException(
        'Ya existe una cuenta asociada a este RUT.',
      );
    }

    // =====================================
    // CIFRAR CONTRASEÑA
    // =====================================

    const hashedPassword =
      await bcrypt.hash(
        registerDto.password,
        12,
      );

    // =====================================
    // CREAR USUARIO
    // =====================================

    const user =
      await this.usersService.create({
        name:
          registerDto.name.trim(),

        rut,

        email,

        phone:
          registerDto.phone,

        password:
          hashedPassword,
      });

    // =====================================
    // ENVIAR VERIFICACIÓN
    // =====================================

    await this.generarYEnviarCodigoVerificacion(
      user.id,
      user.email,
      user.name,
    );

    return {
      message:
        'Registro iniciado. Revisa tu correo para verificar tu cuenta.',

      requiresEmailVerification:
        true,

      email:
        user.email,
    };
  }

  // =====================================
  // INICIO DE SESIÓN
  // =====================================

  async login(
    loginDto: LoginDto,
  ) {
    const email =
      loginDto.email
        .trim()
        .toLowerCase();

    const usuario =
      await this.usersService.findByEmail(
        email,
      );

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException(
        'Correo electrónico o contraseña incorrectos.',
      );
    }

    if (!usuario.contrasena) {
      throw new UnauthorizedException(
        'Esta cuenta utiliza inicio de sesión con Google.',
      );
    }

    const passwordIsValid =
      await bcrypt.compare(
        loginDto.password,
        usuario.contrasena,
      );

    if (!passwordIsValid) {
      throw new UnauthorizedException(
        'Correo electrónico o contraseña incorrectos.',
      );
    }

    if (
      !usuario.correoVerificadoEn
    ) {
      throw new UnauthorizedException(
        'Debes verificar tu correo electrónico antes de iniciar sesión.',
      );
    }

    const accessToken =
      await this.generarToken(
        usuario.id,
        usuario.correo,
      );

    return {
      message:
        'Inicio de sesión correcto.',

      accessToken,

      user: {
        id:
          usuario.id,

        name:
          usuario.nombre,

        email:
          usuario.correo,

        phone:
          usuario.telefono,
      },
    };
  }

  // =====================================
  // INICIO DE SESIÓN CON GOOGLE
  // =====================================

  async googleLogin(
    googleLoginDto: GoogleLoginDto,
  ) {
    const googleClientId =
      process.env.GOOGLE_CLIENT_ID;

    if (!googleClientId) {
      throw new UnauthorizedException(
        'Google Login no está configurado en el servidor.',
      );
    }

    try {
      const ticket =
        await this.googleClient.verifyIdToken({
          idToken:
            googleLoginDto.idToken,

          audience:
            googleClientId,
        });

      const payload =
        ticket.getPayload();

      if (!payload) {
        throw new UnauthorizedException(
          'No se pudo validar la cuenta de Google.',
        );
      }

      const googleId =
        payload.sub;

      const email =
        payload.email
          ?.trim()
          .toLowerCase();

      const nombre =
        payload.name?.trim() ||
        'Usuario';

      if (
        !googleId ||
        !email ||
        payload.email_verified !== true
      ) {
        throw new UnauthorizedException(
          'La cuenta de Google no es válida o el correo no está verificado.',
        );
      }

      // =====================================
      // BUSCAR CUENTA YA VINCULADA A GOOGLE
      // =====================================

      let usuario =
        await this.usersService.findByGoogleId(
          googleId,
        );

      // =====================================
      // SI NO ESTÁ VINCULADA, BUSCAR POR EMAIL
      // =====================================

      if (!usuario) {
        const usuarioPorCorreo =
          await this.usersService.findByEmail(
            email,
          );

        if (usuarioPorCorreo) {
          /*
           * Ya existe una cuenta de ServiciosYa
           * con este correo.
           *
           * Vinculamos únicamente el googleId.
           *
           * NO modificamos:
           * - nombre
           * - RUT
           * - teléfono
           * - contraseña
           *
           * De esta forma Google funciona
           * solamente como un método adicional
           * para iniciar sesión.
           */

          usuario =
            await this.usersService.linkGoogleAccount(
              usuarioPorCorreo.id,
              googleId,
            );
        } else {
          /*
           * Todavía no existe una cuenta
           * de ServiciosYa con este correo.
           *
           * Por ahora createGoogleUser()
           * está bloqueado porque necesitamos
           * solicitar el RUT antes de crear
           * una cuenta nueva mediante Google.
           */

          usuario =
            await this.usersService.createGoogleUser({
              name:
                nombre,

              email,

              googleId,
            });
        }
      }

      // =====================================
      // MARCAR CORREO COMO VERIFICADO
      // =====================================

      if (!usuario.activo) throw new UnauthorizedException('La cuenta está desactivada.');

      /*
       * Google ya comprobó que el usuario
       * controla esta dirección de correo.
       *
       * IMPORTANTE:
       * No actualizamos el nombre con
       * los datos provenientes de Google.
       */

      if (
        !usuario.correoVerificadoEn
      ) {
        usuario =
          await this.prisma.usuario.update({
            where: {
              id:
                usuario.id,
            },

            data: {
              correoVerificadoEn:
                new Date(),
            },
          });
      }

      // =====================================
      // GENERAR JWT
      // =====================================

      const accessToken =
        await this.generarToken(
          usuario.id,
          usuario.correo,
        );

      return {
        message:
          'Inicio de sesión con Google correcto.',

        accessToken,

        user: {
          id:
            usuario.id,

          name:
            usuario.nombre,

          email:
            usuario.correo,

          phone:
            usuario.telefono,
        },
      };
    } catch (error) {
      if (
        error instanceof
          UnauthorizedException ||
        error instanceof
          BadRequestException
      ) {
        throw error;
      }

      console.error(
        'Error verificando Google:',
        error,
      );

      throw new UnauthorizedException(
        'No se pudo validar el inicio de sesión con Google.',
      );
    }
  }

  // =====================================
  // VERIFICAR CORREO
  // =====================================

  async verifyEmail(
    verifyEmailDto: VerifyEmailDto,
  ) {
    const email =
      verifyEmailDto.email
        .trim()
        .toLowerCase();

    const codigo =
      verifyEmailDto.codigo.trim();

    const usuario =
      await this.usersService.findByEmail(
        email,
      );

    if (!usuario || !usuario.activo) {
      throw new BadRequestException(
        'El código de verificación no es válido.',
      );
    }

    if (
      usuario.correoVerificadoEn
    ) {
      return {
        message:
          'El correo electrónico ya está verificado.',
      };
    }

    // =====================================
    // BUSCAR CÓDIGOS ACTIVOS
    // =====================================

    const tokens =
      await this.prisma.tokenVerificacionCorreo.findMany({
        where: {
          usuarioId:
            usuario.id,

          usadoEn:
            null,

          expiraEn: {
            gt:
              new Date(),
          },
        },

        orderBy: {
          creadoEn:
            'desc',
        },
      });

    if (
      tokens.length === 0
    ) {
      throw new BadRequestException(
        'El código de verificación ha expirado o no existe. Solicita uno nuevo.',
      );
    }

    // =====================================
    // COMPARAR CÓDIGO
    // =====================================

    let tokenValido:
      | (typeof tokens)[number]
      | null = null;

    for (
      const token of tokens
    ) {
      const codigoValido =
        await bcrypt.compare(
          codigo,
          token.tokenHash,
        );

      if (codigoValido) {
        tokenValido =
          token;

        break;
      }
    }

    if (!tokenValido) {
      throw new BadRequestException(
        'El código de verificación es incorrecto.',
      );
    }

    const ahora =
      new Date();

    // =====================================
    // VERIFICAR CORREO E INVALIDAR CÓDIGOS
    // =====================================

    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: {
          id:
            usuario.id,
        },

        data: {
          correoVerificadoEn:
            ahora,
        },
      }),

      this.prisma.tokenVerificacionCorreo.updateMany({
        where: {
          usuarioId:
            usuario.id,

          usadoEn:
            null,
        },

        data: {
          usadoEn:
            ahora,
        },
      }),
    ]);

    return {
      message:
        'Correo electrónico verificado correctamente.',
    };
  }

  // =====================================
  // REENVIAR VERIFICACIÓN
  // =====================================

  async resendVerification(
    resendVerificationDto: ResendVerificationDto,
  ) {
    const email =
      resendVerificationDto.email
        .trim()
        .toLowerCase();

    const usuario =
      await this.usersService.findByEmail(
        email,
      );

    /*
     * Respuesta genérica para evitar
     * revelar cuentas existentes.
     */

    if (!usuario || !usuario.activo) {
      return {
        message:
          'Si existe una cuenta pendiente de verificación, recibirás un nuevo código.',
      };
    }

    if (
      usuario.correoVerificadoEn
    ) {
      throw new BadRequestException(
        'Este correo electrónico ya está verificado.',
      );
    }

    await this.generarYEnviarCodigoVerificacion(
      usuario.id,
      usuario.correo,
      usuario.nombre,
    );

    return {
      message:
        'Enviamos un nuevo código de verificación a tu correo.',
    };
  }

  // =====================================
  // RECUPERACIÓN DE CONTRASEÑA
  // =====================================

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ) {
    const email =
      forgotPasswordDto.email
        .trim()
        .toLowerCase();

    const respuestaGenerica = {
      message:
        'Si existe una cuenta asociada a este correo, recibirás un código para recuperar tu contraseña.',
    };

    const usuario =
      await this.usersService.findByEmail(
        email,
      );

    if (!usuario || !usuario.activo) {
      return respuestaGenerica;
    }

    /*
     * Si la cuenta utiliza únicamente
     * Google no hay contraseña local.
     */

    if (!usuario.contrasena) {
      return respuestaGenerica;
    }

    /*
     * Solo se permite recuperación
     * después de verificar el correo.
     */

    if (
      !usuario.correoVerificadoEn
    ) {
      return respuestaGenerica;
    }

    // =====================================
    // INVALIDAR CÓDIGOS ANTERIORES
    // =====================================

    await this.prisma.tokenRecuperacion.updateMany({
      where: {
        usuarioId:
          usuario.id,

        usadoEn:
          null,
      },

      data: {
        usadoEn:
          new Date(),
      },
    });

    // =====================================
    // GENERAR CÓDIGO
    // =====================================

    const codigo =
      randomInt(
        100000,
        1000000,
      ).toString();

    const tokenHash =
      await bcrypt.hash(
        codigo,
        12,
      );

    const expiraEn =
      new Date(
        Date.now() +
          10 * 60 * 1000,
      );

    // =====================================
    // GUARDAR TOKEN
    // =====================================

    await this.prisma.tokenRecuperacion.create({
      data: {
        tokenHash,

        expiraEn,

        usuarioId:
          usuario.id,
      },
    });

    // =====================================
    // ENVIAR CORREO
    // =====================================

    try {
      await this.mailService.enviarRecuperacionContrasena(
        usuario.correo,
        usuario.nombre,
        codigo,
      );
    } catch (error) {
      /*
       * Si el correo falla eliminamos
       * el código recién creado.
       */

      await this.prisma.tokenRecuperacion.deleteMany({
        where: {
          usuarioId:
            usuario.id,

          tokenHash,
        },
      });

      throw error;
    }

    return respuestaGenerica;
  }

  // =====================================
  // VERIFICAR CÓDIGO DE RECUPERACIÓN
  // =====================================

  async verifyResetCode(
    verifyResetCodeDto: VerifyResetCodeDto,
  ) {
    const email =
      verifyResetCodeDto.email
        .trim()
        .toLowerCase();

    const codigo =
      verifyResetCodeDto.codigo.trim();

    const usuario =
      await this.usersService.findByEmail(
        email,
      );

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException(
        'El código de recuperación no es válido o ha expirado.',
      );
    }

    // =====================================
    // BUSCAR CÓDIGOS ACTIVOS
    // =====================================

    const tokens =
      await this.prisma.tokenRecuperacion.findMany({
        where: {
          usuarioId:
            usuario.id,

          usadoEn:
            null,

          expiraEn: {
            gt:
              new Date(),
          },
        },

        orderBy: {
          creadoEn:
            'desc',
        },
      });

    if (
      tokens.length === 0
    ) {
      throw new UnauthorizedException(
        'El código de recuperación no es válido o ha expirado.',
      );
    }

    // =====================================
    // COMPARAR CÓDIGO
    // =====================================

    let tokenValido:
      | (typeof tokens)[number]
      | null = null;

    for (
      const token of tokens
    ) {
      const codigoValido =
        await bcrypt.compare(
          codigo,
          token.tokenHash,
        );

      if (codigoValido) {
        tokenValido =
          token;

        break;
      }
    }

    if (!tokenValido) {
      throw new UnauthorizedException(
        'El código de recuperación no es válido o ha expirado.',
      );
    }

    // =====================================
    // GENERAR TOKEN PARA CAMBIAR CONTRASEÑA
    // =====================================

    const resetToken =
      await this.jwtService.signAsync(
        {
          sub:
            usuario.id,

          email:
            usuario.correo,

          purpose:
            'password-reset',

          recoveryTokenId:
            tokenValido.id,
        },

        {
          expiresIn:
            '10m',
        },
      );

    return {
      message:
        'Código de recuperación verificado correctamente.',

      resetToken,
    };
  }

  // =====================================
  // CAMBIAR CONTRASEÑA
  // =====================================

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ) {
    // =====================================
    // VERIFICAR RESET TOKEN
    // =====================================

    let payload: {
      sub: string;
      email: string;
      purpose: string;
      recoveryTokenId: string;
    };

    try {
      payload =
        await this.jwtService.verifyAsync<{
          sub: string;
          email: string;
          purpose: string;
          recoveryTokenId: string;
        }>(
          resetPasswordDto.resetToken,
        );
    } catch {
      throw new UnauthorizedException(
        'La autorización para cambiar la contraseña no es válida o ha expirado.',
      );
    }

    // =====================================
    // COMPROBAR PROPÓSITO
    // =====================================

    if (
      payload.purpose !==
      'password-reset'
    ) {
      throw new UnauthorizedException(
        'La autorización para cambiar la contraseña no es válida.',
      );
    }

    if (
      !payload.sub ||
      !payload.recoveryTokenId
    ) {
      throw new UnauthorizedException(
        'La autorización para cambiar la contraseña no es válida.',
      );
    }

    // =====================================
    // BUSCAR TOKEN DE RECUPERACIÓN
    // =====================================

    const tokenRecuperacion =
      await this.prisma.tokenRecuperacion.findUnique({
        where: {
          id:
            payload.recoveryTokenId,
        },
      });

    if (!tokenRecuperacion) {
      throw new UnauthorizedException(
        'La solicitud de recuperación no existe o ya no es válida.',
      );
    }

    // =====================================
    // COMPROBAR PROPIETARIO
    // =====================================

    if (
      tokenRecuperacion.usuarioId !==
      payload.sub
    ) {
      throw new UnauthorizedException(
        'La autorización para cambiar la contraseña no es válida.',
      );
    }

    // =====================================
    // COMPROBAR SI YA FUE UTILIZADO
    // =====================================

    if (
      tokenRecuperacion.usadoEn
    ) {
      throw new UnauthorizedException(
        'Este código de recuperación ya fue utilizado.',
      );
    }

    // =====================================
    // COMPROBAR EXPIRACIÓN
    // =====================================

    if (
      tokenRecuperacion.expiraEn.getTime() <=
      Date.now()
    ) {
      throw new UnauthorizedException(
        'El código de recuperación ha expirado.',
      );
    }

    // =====================================
    // COMPROBAR QUE EL USUARIO EXISTE
    // =====================================

    const usuario =
      await this.prisma.usuario.findUnique({
        where: {
          id:
            payload.sub,
        },
      });

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException(
        'La cuenta asociada a esta recuperación ya no existe.',
      );
    }

    // =====================================
    // CIFRAR NUEVA CONTRASEÑA
    // =====================================

    const hashedPassword =
      await bcrypt.hash(
        resetPasswordDto.password,
        12,
      );

    const ahora =
      new Date();

    // =====================================
    // GUARDAR NUEVA CONTRASEÑA
    // =====================================

    await this.prisma.$transaction(async (tx) => {
      // Reclamar el código dentro de la transacción impide su uso simultáneo.
      const consumed = await tx.tokenRecuperacion.updateMany({
        where: {
          id: tokenRecuperacion.id,
          usuarioId: usuario.id,
          usadoEn: null,
          expiraEn: { gt: ahora },
        },
        data: { usadoEn: ahora },
      });
      if (consumed.count !== 1) {
        throw new UnauthorizedException(
          'La solicitud de recuperación ya no es válida.',
        );
      }
      const updated = await tx.usuario.updateMany({
        where: { id: usuario.id, activo: true },
        data: {
          contrasena: hashedPassword,
          versionSesion: { increment: 1 },
        },
      });
      if (updated.count !== 1) {
        throw new UnauthorizedException(
          'La cuenta asociada a esta recuperación ya no está activa.',
        );
      }
      await tx.tokenRecuperacion.updateMany({
        where: { usuarioId: usuario.id, usadoEn: null },
        data: { usadoEn: ahora },
      });
    });

    return {
      message:
        'Contraseña actualizada correctamente.',
    };
  }

  // =====================================
  // GENERAR Y ENVIAR VERIFICACIÓN
  // =====================================

  private async generarYEnviarCodigoVerificacion(
    usuarioId: string,
    correo: string,
    nombre: string,
  ) {
    // =====================================
    // INVALIDAR CÓDIGOS ANTERIORES
    // =====================================

    await this.prisma.tokenVerificacionCorreo.updateMany({
      where: {
        usuarioId,

        usadoEn:
          null,
      },

      data: {
        usadoEn:
          new Date(),
      },
    });

    // =====================================
    // GENERAR CÓDIGO
    // =====================================

    const codigo =
      randomInt(
        100000,
        1000000,
      ).toString();

    // =====================================
    // HASH
    // =====================================

    const tokenHash =
      await bcrypt.hash(
        codigo,
        12,
      );

    // =====================================
    // EXPIRA EN 10 MINUTOS
    // =====================================

    const expiraEn =
      new Date(
        Date.now() +
          10 * 60 * 1000,
      );

    // =====================================
    // GUARDAR TOKEN
    // =====================================

    await this.prisma.tokenVerificacionCorreo.create({
      data: {
        tokenHash,

        expiraEn,

        usuarioId,
      },
    });

    // =====================================
    // ENVIAR CORREO
    // =====================================

    try {
      await this.mailService.enviarVerificacionCorreo(
        correo,
        nombre,
        codigo,
      );
    } catch (error) {
      await this.prisma.tokenVerificacionCorreo.deleteMany({
        where: {
          usuarioId,

          tokenHash,
        },
      });

      throw error;
    }
  }

  // =====================================
  // GENERAR JWT DE SESIÓN
  // =====================================

  private async generarToken(
    usuarioId: string,
    correo: string,
  ) {
    const cuenta = await this.prisma.usuario.findUniqueOrThrow({where:{id:usuarioId},select:{activo:true,versionSesion:true}});
    if(!cuenta.activo) throw new UnauthorizedException('La cuenta está desactivada.');
    return this.jwtService.signAsync({
      versionSesion: cuenta.versionSesion,
      sub:
        usuarioId,

      email:
        correo,
    });
  }
}

