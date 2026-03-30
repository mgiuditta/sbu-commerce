import { Body, Controller, Inject, Post } from '@nestjs/common';
import {
  AUTHENTICATION_SERVICE_PORT,
  AuthenticationServicePort,
} from '@domain/ports/inbound/authentication-service.port';
import { GoogleAuthService } from '@adapters/outbound/social/google-auth.service';

@Controller('auth/google')
export class GoogleAuthenticationController {
  constructor(
    private readonly googleAuthService: GoogleAuthService,
    @Inject(AUTHENTICATION_SERVICE_PORT)
    private readonly authService: AuthenticationServicePort,
  ) {}

  @Post()
  async googleLogin(@Body() body: { idToken: string }) {
    const googleUser = await this.googleAuthService.verifyGoogleToken(body.idToken);
    try {
      return await this.authService.login(googleUser.email, '');
    } catch {
      return await this.authService.register(
        googleUser.email,
        '',
        googleUser.name,
      );
    }
  }
}
