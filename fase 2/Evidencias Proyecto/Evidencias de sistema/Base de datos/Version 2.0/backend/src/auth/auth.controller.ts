import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';

import { AuthService } from './auth.service';

import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { VerifyResetCodeDto } from './dto/verify-reset-code.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  // =====================================
  // REGISTRO
  // =====================================

  @Post('register')
  register(
    @Body()
    registerDto: RegisterDto,
  ) {
    return this.authService.register(
      registerDto,
    );
  }

  // =====================================
  // INICIO DE SESIÓN
  // =====================================

  @Post('login')
  login(
    @Body()
    loginDto: LoginDto,
  ) {
    return this.authService.login(
      loginDto,
    );
  }

  // =====================================
  // GOOGLE
  // =====================================

  @Post('google')
  googleLogin(
    @Body()
    googleLoginDto: GoogleLoginDto,
  ) {
    return this.authService.googleLogin(
      googleLoginDto,
    );
  }

  // =====================================
  // VERIFICAR CORREO
  // =====================================

  @Post('verify-email')
  verifyEmail(
    @Body()
    verifyEmailDto: VerifyEmailDto,
  ) {
    return this.authService.verifyEmail(
      verifyEmailDto,
    );
  }

  // =====================================
  // REENVIAR VERIFICACIÓN
  // =====================================

  @Post('resend-verification')
  resendVerification(
    @Body()
    resendVerificationDto: ResendVerificationDto,
  ) {
    return this.authService.resendVerification(
      resendVerificationDto,
    );
  }

  // =====================================
  // OLVIDÉ MI CONTRASEÑA
  // =====================================

  @Post('forgot-password')
  forgotPassword(
    @Body()
    forgotPasswordDto: ForgotPasswordDto,
  ) {
    return this.authService.forgotPassword(
      forgotPasswordDto,
    );
  }

  // =====================================
  // VERIFICAR CÓDIGO DE RECUPERACIÓN
  // =====================================

  @Post('verify-reset-code')
  verifyResetCode(
    @Body()
    verifyResetCodeDto: VerifyResetCodeDto,
  ) {
    return this.authService.verifyResetCode(
      verifyResetCodeDto,
    );
  }

  // =====================================
  // CAMBIAR CONTRASEÑA
  // =====================================

  @Post('reset-password')
  resetPassword(
    @Body()
    resetPasswordDto: ResetPasswordDto,
  ) {
    return this.authService.resetPassword(
      resetPasswordDto,
    );
  }
}