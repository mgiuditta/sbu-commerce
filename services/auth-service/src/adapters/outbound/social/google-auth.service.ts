import {Injectable, OnModuleInit} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {OAuth2Client} from 'google-auth-library';

@Injectable()
export class GoogleAuthService implements OnModuleInit {
  private oauthClient: OAuth2Client;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const clientId = this.configService.get('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get('GOOGLE_CLIENT_SECRET');
    this.oauthClient = new OAuth2Client(clientId, clientSecret);
  }

  async verifyToken(
    token: string,
  ): Promise<{ email: string; providerId: string; displayName?: string }> {
    const ticket = await this.oauthClient.verifyIdToken({
      idToken: token,
    });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload?.sub) {
      throw new Error('Invalid Google token payload');
    }
    return {
      email: payload.email,
      providerId: payload.sub,
      displayName: payload.name,
    };
  }
}
