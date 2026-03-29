import {Body, ConflictException, Controller, Inject, Post, UnauthorizedException,} from '@nestjs/common';
import {
    AUTHENTICATION_SERVICE_PORT,
    AuthenticationServicePort,
} from '@domain/ports/inbound/authentication-service.port';
import {SocialProvider} from '@domain/models/generated/enums';
import {UserAlreadyExistsError} from '@domain/exceptions';
import {GoogleAuthService} from '@adapters/outbound/social/google-auth.service';
import {Auth} from './decorators/auth.decorator';
import {AuthType} from './enums/auth-type.enum';
import {GoogleTokenDto} from './dto/google-token.dto';

@Auth(AuthType.None)
@Controller('authentication/google')
export class GoogleAuthenticationController {
  constructor(
    private readonly googleAuthService: GoogleAuthService,
    @Inject(AUTHENTICATION_SERVICE_PORT)
    private readonly authService: AuthenticationServicePort,
  ) {}

  @Post()
  async authenticate(@Body() tokenDto: GoogleTokenDto) {
    try {
      const { email, providerId, displayName } =
        await this.googleAuthService.verifyToken(tokenDto.token);
      return await this.authService.socialSignIn(
        SocialProvider.GOOGLE,
        email,
        providerId,
        displayName,
      );
    } catch (err) {
      if (err instanceof UserAlreadyExistsError) {
        throw new ConflictException();
      }
      throw new UnauthorizedException();
    }
  }
}
