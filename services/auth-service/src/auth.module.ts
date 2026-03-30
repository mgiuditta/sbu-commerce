import {Module} from '@nestjs/common';
import {APP_GUARD} from '@nestjs/core';
import {ConfigModule} from '@nestjs/config';
import {JwtModule} from '@nestjs/jwt';
import {TypeOrmModule} from '@nestjs/typeorm';

import jwtConfig from '@infrastructure/config/jwt.config';
import {UserAccountEntity} from '@ext/auth/infrastructure/typeorm/generated/user-account.entity';
import {EmployeeEntity} from '@ext/auth/infrastructure/typeorm/generated/employee.entity';
import {SocialIdentityEntity} from '@ext/auth/infrastructure/typeorm/generated/social-identity.entity';
import {RefreshTokenEntity} from '@ext/auth/infrastructure/typeorm/generated/refresh-token.entity';
import {ApiKeyEntity} from '@ext/auth/infrastructure/typeorm/generated/api-key.entity';

import {HASHING_PORT} from '@domain/ports/outbound/hashing.port';
import {TOKEN_PORT} from '@domain/ports/outbound/token.port';
import {REFRESH_TOKEN_STORAGE_PORT} from '@domain/ports/outbound/refresh-token-storage.port';
import {USER_ACCOUNT_REPOSITORY_PORT} from '@domain/ports/outbound/user-account-repository.port';
import {AUTHENTICATION_SERVICE_PORT} from '@domain/ports/inbound/authentication-service.port';
import {AuthenticationService} from '@domain/services/authentication.service';

import {BcryptAdapter} from '@adapters/outbound/hashing/bcrypt.adapter';
import {JwtTokenAdapter} from '@adapters/outbound/token/jwt-token.adapter';
import {RedisRefreshTokenStorageAdapter} from '@adapters/outbound/storage/redis-refresh-token-storage.adapter';
import {UserAccountTypeOrmAdapter} from '@adapters/outbound/persistence/user-account.typeorm.adapter';
import {GoogleAuthService} from '@adapters/outbound/social/google-auth.service';

import {AuthenticationController} from '@adapters/inbound/rest/authentication.controller';
import {GoogleAuthenticationController} from '@adapters/inbound/rest/google-authentication.controller';
import {AccessTokenGuard} from '@adapters/inbound/rest/guards/access-token.guard';
import {ApiKeyGuard} from '@adapters/inbound/rest/guards/api-key.guard';
import {AuthenticationGuard} from '@adapters/inbound/rest/guards/authentication.guard';
import {RolesGuard} from '@adapters/inbound/rest/guards/roles.guard';
import {PermissionsGuard} from '@adapters/inbound/rest/guards/permissions.guard';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'sbu_auth',
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    TypeOrmModule.forFeature([
      UserAccountEntity,
      EmployeeEntity,
      SocialIdentityEntity,
      RefreshTokenEntity,
      ApiKeyEntity,
    ]),
    JwtModule.registerAsync(jwtConfig.asProvider()),
    ConfigModule.forFeature(jwtConfig),
  ],
  controllers: [AuthenticationController, GoogleAuthenticationController],
  providers: [
    {provide: HASHING_PORT, useClass: BcryptAdapter},
    {provide: USER_ACCOUNT_REPOSITORY_PORT, useClass: UserAccountTypeOrmAdapter},
    {provide: TOKEN_PORT, useClass: JwtTokenAdapter},
    {provide: REFRESH_TOKEN_STORAGE_PORT, useClass: RedisRefreshTokenStorageAdapter},
    {
      provide: AUTHENTICATION_SERVICE_PORT,
      useFactory: (userRepo, hashing, token, refreshStorage) =>
        new AuthenticationService(userRepo, hashing, token, refreshStorage),
      inject: [
        USER_ACCOUNT_REPOSITORY_PORT,
        HASHING_PORT,
        TOKEN_PORT,
        REFRESH_TOKEN_STORAGE_PORT,
      ],
    },
    AccessTokenGuard,
    ApiKeyGuard,
    {provide: APP_GUARD, useClass: AuthenticationGuard},
    {provide: APP_GUARD, useClass: RolesGuard},
    {provide: APP_GUARD, useClass: PermissionsGuard},
    GoogleAuthService,
  ],
})
export class AuthModule {}
