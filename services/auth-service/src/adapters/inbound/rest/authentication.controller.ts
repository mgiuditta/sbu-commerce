import { Body, Controller, Inject, Post } from '@nestjs/common';
import {
  AUTHENTICATION_SERVICE_PORT,
  AuthenticationServicePort,
} from '@domain/ports/inbound/authentication-service.port';

@Controller('auth')
export class AuthenticationController {
  constructor(
    @Inject(AUTHENTICATION_SERVICE_PORT)
    private readonly authService: AuthenticationServicePort,
  ) {}

  @Post('register')
  async register(
    @Body() body: { email: string; password: string; displayName: string },
  ) {
    return this.authService.register(body.email, body.password, body.displayName);
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refreshToken(body.refreshToken);
  }

  @Post('logout')
  async logout(@Body() body: { userId: string }) {
    return this.authService.logout(body.userId);
  }
}
