import {
    Body,
    ConflictException,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Inject,
    Post,
    UnauthorizedException,
} from '@nestjs/common';
import {
    AUTHENTICATION_SERVICE_PORT,
    AuthenticationServicePort,
} from '@domain/ports/inbound/authentication-service.port';
import {InvalidCredentialsError, InvalidRefreshTokenError, UserAlreadyExistsError,} from '@domain/exceptions';
import {Auth} from './decorators/auth.decorator';
import {AuthType} from './enums/auth-type.enum';
import {ActiveUser} from './decorators/active-user.decorator';
import {ActiveUserData} from './interfaces/active-user-data.interface';
import {SignUpDto} from './dto/sign-up.dto';
import {SignInDto} from './dto/sign-in.dto';
import {RefreshTokenDto} from './dto/refresh-token.dto';

@Auth(AuthType.None)
@Controller('authentication')
export class AuthenticationController {
  constructor(
    @Inject(AUTHENTICATION_SERVICE_PORT)
    private readonly authService: AuthenticationServicePort,
  ) {}

  @Auth(AuthType.Bearer)
  @Get('me')
  me(@ActiveUser() user: ActiveUserData) {
    return user;
  }

  @Post('sign-up')
  async signUp(@Body() signUpDto: SignUpDto) {
    try {
      await this.authService.signUp(signUpDto.email, signUpDto.password);
    } catch (err) {
      if (err instanceof UserAlreadyExistsError) {
        throw new ConflictException(err.message);
      }
      throw err;
    }
  }

  @HttpCode(HttpStatus.OK)
  @Post('sign-in')
  async signIn(@Body() signInDto: SignInDto) {
    try {
      return await this.authService.signIn(
        signInDto.email,
        signInDto.password,
      );
    } catch (err) {
      if (err instanceof InvalidCredentialsError) {
        throw new UnauthorizedException(err.message);
      }
      throw err;
    }
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh-tokens')
  async refreshTokens(@Body() refreshTokenDto: RefreshTokenDto) {
    try {
      return await this.authService.refreshTokens(
        refreshTokenDto.refreshToken,
      );
    } catch (err) {
      if (err instanceof InvalidRefreshTokenError) {
        throw new UnauthorizedException('Access denied');
      }
      if (err instanceof InvalidCredentialsError) {
        throw new UnauthorizedException();
      }
      throw err;
    }
  }
}
