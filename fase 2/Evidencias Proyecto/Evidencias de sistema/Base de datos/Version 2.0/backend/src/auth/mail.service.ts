import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  async enviarInvitacionCuenta(destinatario: string, codigo: string) {
    try {
      await this.transporter.sendMail({
        from: { name: 'ServiciosYa', address: process.env.EMAIL_USER! },
        to: destinatario,
        subject: 'Activa tu cuenta | ServiciosYa',
        text: `Se creó una cuenta para ti en ServiciosYa. Abre la página /activar del panel de ServiciosYa que te indique tu administrador y escribe tu correo y este código: ${codigo}\nLa invitación vence en 24 horas y se utiliza una sola vez. Tú elegirás tu contraseña. Si no esperabas este correo, ignóralo.`,
      });
    } catch {
      throw new InternalServerErrorException('La cuenta está pendiente, pero no se pudo enviar el correo. Reenvía su invitación desde el panel.');
    }
  }
  private readonly transporter;

  constructor() {
    const emailUser =
      process.env.EMAIL_USER;

    const emailPassword =
      process.env.EMAIL_APP_PASSWORD;

    if (!emailUser || !emailPassword) {
      throw new Error(
        'Las credenciales de correo no están configuradas.',
      );
    }

    this.transporter =
      nodemailer.createTransport({
        service: 'gmail',

        auth: {
          user: emailUser,
          pass: emailPassword,
        },
      });
  }

  // =====================================
  // RECUPERACIÓN DE CONTRASEÑA
  // =====================================

  async enviarRecuperacionContrasena(
    destinatario: string,
    nombre: string,
    codigo: string,
  ) {
    try {
      await this.transporter.sendMail({
        from: {
          name: 'ServiciosYa',
          address:
            process.env.EMAIL_USER!,
        },

        to: destinatario,

        subject:
          'Recupera tu contraseña | ServiciosYa',

        html: `
          <div
            style="
              margin: 0;
              padding: 40px 16px;
              background-color: #F1F5F9;
              font-family: Arial, Helvetica, sans-serif;
              color: #0F172A;
            "
          >
            <div
              style="
                max-width: 560px;
                margin: 0 auto;
                background-color: #FFFFFF;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 4px 18px rgba(15, 23, 42, 0.08);
              "
            >

              <!-- ENCABEZADO -->
              <div
                style="
                  background-color: #001B36;
                  padding: 28px 32px;
                  text-align: center;
                "
              >
                <div
                  style="
                    font-size: 28px;
                    font-weight: 700;
                    color: #FFFFFF;
                  "
                >
                  Servicios<span style="color: #2F6FED;">Ya</span>
                </div>

                <div
                  style="
                    color: #94A3B8;
                    font-size: 13px;
                    margin-top: 6px;
                  "
                >
                  Servicios cuando los necesitas
                </div>
              </div>

              <!-- CONTENIDO -->
              <div
                style="
                  padding: 36px 32px;
                "
              >
                <h1
                  style="
                    margin: 0 0 20px 0;
                    font-size: 25px;
                    color: #0F172A;
                  "
                >
                  Recupera tu contraseña
                </h1>

                <p
                  style="
                    margin: 0 0 16px 0;
                    color: #475569;
                    font-size: 16px;
                    line-height: 1.6;
                  "
                >
                  Hola <strong>${nombre}</strong>,
                </p>

                <p
                  style="
                    color: #475569;
                    font-size: 16px;
                    line-height: 1.6;
                  "
                >
                  Recibimos una solicitud para
                  restablecer la contraseña de tu
                  cuenta de ServiciosYa.
                </p>

                <p
                  style="
                    color: #475569;
                    font-size: 16px;
                    line-height: 1.6;
                  "
                >
                  Ingresa este código en la aplicación:
                </p>

                <!-- CÓDIGO -->
                <div
                  style="
                    background-color: #EFF6FF;
                    border: 1px solid #BFDBFE;
                    border-radius: 12px;
                    padding: 24px;
                    text-align: center;
                    margin: 28px 0 16px 0;
                  "
                >
                  <div
                    style="
                      color: #64748B;
                      font-size: 12px;
                      font-weight: 600;
                      text-transform: uppercase;
                      letter-spacing: 1px;
                      margin-bottom: 10px;
                    "
                  >
                    Código de recuperación
                  </div>

                  <span
                    style="
                      font-size: 36px;
                      font-weight: 700;
                      letter-spacing: 10px;
                      color: #2563EB;
                    "
                  >
                    ${codigo}
                  </span>
                </div>

                <!-- EXPIRACIÓN -->
                <div
                  style="
                    text-align: center;
                    color: #64748B;
                    font-size: 14px;
                    margin-bottom: 28px;
                  "
                >
                  Este código expirará en
                  <strong>10 minutos</strong>.
                </div>

                <!-- SEGURIDAD -->
                <div
                  style="
                    background-color: #F8FAFC;
                    border-left: 4px solid #2563EB;
                    border-radius: 6px;
                    padding: 16px;
                  "
                >
                  <div
                    style="
                      font-weight: 700;
                      font-size: 14px;
                      color: #0F172A;
                      margin-bottom: 6px;
                    "
                  >
                    ¿No solicitaste este cambio?
                  </div>

                  <div
                    style="
                      color: #64748B;
                      font-size: 13px;
                      line-height: 1.5;
                    "
                  >
                    Puedes ignorar este correo.
                    Tu contraseña no será modificada
                    mientras no completes el proceso
                    de recuperación.
                  </div>
                </div>
              </div>

              <!-- PIE -->
              <div
                style="
                  border-top: 1px solid #E2E8F0;
                  padding: 22px 32px;
                  text-align: center;
                  background-color: #F8FAFC;
                "
              >
                <div
                  style="
                    color: #64748B;
                    font-size: 12px;
                    line-height: 1.5;
                  "
                >
                  Este mensaje fue enviado
                  automáticamente por ServiciosYa.
                  <br />
                  Por favor, no respondas a este correo.
                </div>
              </div>

            </div>
          </div>
        `,
      });
    } catch (error) {
      console.error(
        'Error enviando correo de recuperación:',
        error,
      );

      throw new InternalServerErrorException(
        'No se pudo enviar el correo de recuperación.',
      );
    }
  }

  // =====================================
  // VERIFICACIÓN DE CORREO
  // =====================================

  async enviarVerificacionCorreo(
    destinatario: string,
    nombre: string,
    codigo: string,
  ) {
    try {
      await this.transporter.sendMail({
        from: {
          name: 'ServiciosYa',
          address:
            process.env.EMAIL_USER!,
        },

        to: destinatario,

        subject:
          'Verifica tu correo electrónico | ServiciosYa',

        html: `
          <div
            style="
              margin: 0;
              padding: 40px 16px;
              background-color: #F1F5F9;
              font-family: Arial, Helvetica, sans-serif;
              color: #0F172A;
            "
          >
            <div
              style="
                max-width: 560px;
                margin: 0 auto;
                background-color: #FFFFFF;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 4px 18px rgba(15, 23, 42, 0.08);
              "
            >

              <!-- ENCABEZADO -->
              <div
                style="
                  background-color: #001B36;
                  padding: 28px 32px;
                  text-align: center;
                "
              >
                <div
                  style="
                    font-size: 28px;
                    font-weight: 700;
                    color: #FFFFFF;
                  "
                >
                  Servicios<span style="color: #2F6FED;">Ya</span>
                </div>

                <div
                  style="
                    color: #94A3B8;
                    font-size: 13px;
                    margin-top: 6px;
                  "
                >
                  Servicios cuando los necesitas
                </div>
              </div>

              <!-- CONTENIDO -->
              <div
                style="
                  padding: 36px 32px;
                "
              >
                <h1
                  style="
                    margin: 0 0 20px 0;
                    font-size: 25px;
                    color: #0F172A;
                  "
                >
                  Verifica tu correo electrónico
                </h1>

                <p
                  style="
                    margin: 0 0 16px 0;
                    color: #475569;
                    font-size: 16px;
                    line-height: 1.6;
                  "
                >
                  Hola <strong>${nombre}</strong>,
                </p>

                <p
                  style="
                    color: #475569;
                    font-size: 16px;
                    line-height: 1.6;
                  "
                >
                  Gracias por registrarte en
                  <strong>ServiciosYa</strong>.
                </p>

                <p
                  style="
                    color: #475569;
                    font-size: 16px;
                    line-height: 1.6;
                  "
                >
                  Para confirmar que esta dirección
                  de correo electrónico te pertenece,
                  ingresa el siguiente código en
                  la aplicación:
                </p>

                <!-- CÓDIGO -->
                <div
                  style="
                    background-color: #EFF6FF;
                    border: 1px solid #BFDBFE;
                    border-radius: 12px;
                    padding: 24px;
                    text-align: center;
                    margin: 28px 0 16px 0;
                  "
                >
                  <div
                    style="
                      color: #64748B;
                      font-size: 12px;
                      font-weight: 600;
                      text-transform: uppercase;
                      letter-spacing: 1px;
                      margin-bottom: 10px;
                    "
                  >
                    Código de verificación
                  </div>

                  <span
                    style="
                      font-size: 36px;
                      font-weight: 700;
                      letter-spacing: 10px;
                      color: #2563EB;
                    "
                  >
                    ${codigo}
                  </span>
                </div>

                <!-- EXPIRACIÓN -->
                <div
                  style="
                    text-align: center;
                    color: #64748B;
                    font-size: 14px;
                    margin-bottom: 28px;
                  "
                >
                  Este código expirará en
                  <strong>10 minutos</strong>.
                </div>

                <!-- SEGURIDAD -->
                <div
                  style="
                    background-color: #F8FAFC;
                    border-left: 4px solid #2563EB;
                    border-radius: 6px;
                    padding: 16px;
                  "
                >
                  <div
                    style="
                      font-weight: 700;
                      font-size: 14px;
                      color: #0F172A;
                      margin-bottom: 6px;
                    "
                  >
                    ¿No creaste esta cuenta?
                  </div>

                  <div
                    style="
                      color: #64748B;
                      font-size: 13px;
                      line-height: 1.5;
                    "
                  >
                    Si no intentaste registrarte
                    en ServiciosYa, puedes ignorar
                    este correo de forma segura.
                  </div>
                </div>
              </div>

              <!-- PIE -->
              <div
                style="
                  border-top: 1px solid #E2E8F0;
                  padding: 22px 32px;
                  text-align: center;
                  background-color: #F8FAFC;
                "
              >
                <div
                  style="
                    color: #64748B;
                    font-size: 12px;
                    line-height: 1.5;
                  "
                >
                  Este mensaje fue enviado
                  automáticamente por ServiciosYa.
                  <br />
                  Por favor, no respondas a este correo.
                </div>
              </div>

            </div>
          </div>
        `,
      });
    } catch (error) {
      console.error(
        'Error enviando correo de verificación:',
        error,
      );

      throw new InternalServerErrorException(
        'No se pudo enviar el correo de verificación.',
      );
    }
  }
}
